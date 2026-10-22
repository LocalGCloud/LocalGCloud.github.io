"""Import the service comparison documents into the site's feature inventories.

Usage: python3 scripts/sync-emulator-comparisons.py [--check] [/path/to/local_cloud_dependencies]

The upstream comparison documents are the source of truth for feature parity. This importer
reads them, refuses anything it cannot account for, and publishes a polished, visitor-facing
inventory per service. Builds use only the checked-in output and never read sibling repositories.

Safeguards, all fail-closed so a changed document layout stops the sync instead of dropping data:
  * only committed documents are accepted (the digest of each is recorded);
  * every table is matched by header role, never by column position, and unknown marks are errors;
  * parsed counts must equal the totals the document itself states;
  * every compared row must carry a description of the production feature (what visitors read first in
    Details); descriptions and limit notes are scanned for internal wording before they are written;
  * notes are rewritten for visitors and scanned for internal wording before they are written.

Internal detail (evidence labels, file references, revisions, source text) never reaches the
published inventories; it stays in src/data/emulator-comparison-provenance.json.
"""
import argparse
import csv
import hashlib
import io
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
INVENTORIES = ROOT / 'src/data/emulator-comparisons'
PROVENANCE = ROOT / 'src/data/emulator-comparison-provenance.json'

# repository, document that holds the rows, companion documents read to reconcile or for provenance
DOCUMENTS = {
    'gcs': ('localcloud-fake-gcs-server', 'docs/upstream-comparison.md', []),
    'firestore': ('firestore-go', 'docs/emulator-comparison.md', ['docs/emulator-comparison-metrics.md']),
    'bigtable': ('little_bigtable', 'EMULATOR_COMPARISON.md', []),
    'spanner': ('cloud-spanner-emulator', 'docs/emulator-comparison.md', []),
    'bigquery': ('bigquery-emulator-on-duckdb', 'docs/comparison-features.csv', ['docs/COMPARISON.md']),
}

STATES = {'✓': 'available', '√': 'available', '✗': 'unavailable', '×': 'unavailable', 'X': 'unavailable',
          '◐': 'limited', '△': 'limited', '?': 'unknown', '—': 'na', '○': 'no-effect'}
MARK = re.compile(r'^(✓|√|✗|×|X|◐|△|\?|—|○)†?$')

# Where a service's notes are engineering evidence rather than guidance, visitors see them only for these results
# (a note an adapter marks keep_note is a limit in its own right and is always shown).
NOTE_STATES = {'firestore': {'limited', 'unavailable', 'no-effect'}, 'bigquery': {'limited'},
               'bigtable': {'limited', 'unavailable', 'no-effect'}}

# LocalCloud rows with no result of their own say nothing to a visitor; they stay in the document.
HIDE_UNASSESSED_LOCAL = True


class SyncError(Exception):
    pass


# ----------------------------------------------------------------------------- markdown reading

def plain(text):
    text = re.sub(r'<a id="[^"]*"></a>', '', text)
    text = re.sub(r'</?(?:a|br|code|span|strong|em)\b[^>]*>', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\[[^\]]*\]', r'\1', text)
    return text.replace('&amp;', '&').replace('`', '').replace('**', '').replace('\\|', '|').strip()


def state(cell, where):
    value = plain(cell)
    if not MARK.match(value):
        raise SyncError(f'{where}: unrecognized comparison mark {cell!r}')
    return STATES[value.rstrip('†')]


def split_row(line):
    return [cell.strip() for cell in re.split(r'(?<!\\)\|', line.strip())[1:-1]]


def tables(text):
    """Every pipe table with the headings above it: [{'heads', 'header', 'rows': [(line, cells)]}]."""
    found, heads, current = [], {}, None
    for number, line in enumerate(text.splitlines(), 1):
        if line.startswith('|'):
            cells = split_row(line)
            if current is None:
                current = {'heads': dict(heads), 'header': cells, 'rows': [], 'line': number, 'separated': False}
            elif not current['separated'] and cells and all(re.fullmatch(r':?-+:?', c) for c in cells):
                current['separated'] = True
            else:
                current['rows'].append((number, cells))
            continue
        if current is not None:
            found.append(current)
            current = None
        heading = re.match(r'^(#{1,6}) (.+)', line)
        if heading:
            depth = len(heading[1])
            heads = {k: v for k, v in heads.items() if k < depth}
            heads[depth] = plain(heading[2])
    if current is not None:
        found.append(current)
    return found


def roles_for(header, spec):
    """Column index per role, or None when the table is not a feature table of this service."""
    found = {}
    for role, pattern in spec.items():
        optional = role.endswith('?')
        index = next((i for i, cell in enumerate(header) if re.search(pattern, plain(cell))), None)
        if index is None and not optional:
            return None
        if index is not None:
            found[role.rstrip('?')] = index
    return found


def feature_rows(service, text, spec):
    """Rows of every feature table: [{'roles', 'cells', 'heads', 'line'}]; tables must agree on their roles."""
    rows, shapes = [], set()
    for table in tables(text):
        roles = roles_for(table['header'], spec)
        if roles is None:
            continue
        shapes.add(frozenset(k for k in roles if k in ('competitor', 'default', 'production')))
        for number, cells in table['rows']:
            if len(cells) != len(table['header']):
                raise SyncError(f'{service}: line {number} has {len(cells)} cells under {len(table["header"])} headings')
            rows.append({'roles': roles, 'cells': cells, 'heads': table['heads'], 'line': number})
    if len(shapes) > 1:
        raise SyncError(f'{service}: feature tables disagree on their columns: {sorted(map(sorted, shapes))}')
    return rows


def cell(row, role):
    index = row['roles'].get(role)
    return row['cells'][index] if index is not None else ''


def heading_path(row, depth=3):
    return [v for k, v in sorted(row['heads'].items()) if k >= depth]


# ----------------------------------------------------------------------------- visitor wording

TERMS = {
    'gcs': [(r'\bupstream\b', 'fake-gcs-server'), (r'\bfork\b', 'LocalCloud')],
    'bigtable': [(r'\bthe fork\b', 'LocalCloud'), (r'\bFork\b', 'LocalCloud'), (r'\bfork\b', 'LocalCloud'),
                 (r'\bLittle Bigtable\b', 'LocalCloud Bigtable')],
    'spanner': [(r'\bupstream PostgreSQL\b', 'PostgreSQL'), (r'\bUpstream\b', "Google's emulator"), (r'\bthe fork\b', 'LocalCloud'),
                (r'\b[Ff]ork\b', 'LocalCloud')],
}

# Parts of a note that describe how a row was verified or where it lives, never what a visitor can do.
DROP = {
    '*': [r'\bsource[- ]evidence\b', r'\bsource[- ]only\b', r'\binventor(?:y|ies)\b', r'\bevidence\b', r'\bqualif\w*',
          r'\brepresentative\b', r'\bfixtures?\b', r'\ballowlist\b', r'\bTest[A-Z]\w+', r'\bpinned\b', r'\bparity\b',
          r'\.(?:go|py|cc|md|csv|json|mjs|js)\b', r'github\.com', r'https?://', r'\blinked (?:source|test)\b',
          r'\bowning test\b', r'^Local behavior is covered by', r'\bcovered by the linked\b'],
    'firestore': [r'\bJava\b', r'(?-i:\bGo\b)', r'\bhost bridge\b', r'\bpaired\b', r'\bobservations?\b', r'\bregistry\b',
                  r'\bprocess-lifetime\b', r'\bbacklog\b', r'\binvented\b', r'\bremains? open\b', r'\bunmeasured\b'],
    'spanner': [r'^Implemented for local development$', r'^Local RPC behavior$', r'^Spanner allowlist\b', r'\breference evaluator\b',
                r'execution override', r'enabled (?:string/date )?alias', r'inherited from upstream', r'disabled upstream',
                r'upstream syntax did not', r'comparison remains', r'\bunscored\b'],
    'bigquery': [r'^The emulator does not implement this production BigQuery capability\.?$'],
    'bigtable': [r'^Fork standalone\b', r'\bregistry\b'],
}

LEAKS = [r'\[[A-Za-z][\w-]*\]', r'\bEvidence:', r'\binventor(?:y|ies)\b', r'github\.com', r'https?://', r'/Users/',
         r'\.(?:go|py|cc|md|csv|json)\b', r'\bTest[A-Z]\w+', r'\bfork\b', r'\bupstream\b', r'\b[0-9a-f]{40}\b',
         r'\bjay[-_]', r'LocalGCloud', r'AGENTS|CLAUDE|graft\b', r'\bqualif\w*', r'source evidence', r'semantic-compatibility:']


def sentences(text):
    return [part.strip() for part in re.split(r';|(?<=[a-z0-9)])\.\s+(?=[A-Z])', text) if part.strip(' .,')]


def polish(service, text):
    text = re.sub(r'<a id="[^"]*"></a>', '', text)
    text = re.sub(r'\[[^\]]+\]\[[^\]]*\]|\[[^\]]+\]\([^)]*\)', '', text)  # reference-style and inline links
    text = re.sub(r'(?<![\w`])\[[A-Za-z][\w -]*\](?![(\[:])', '', text)  # shortcut references such as [host]
    text = text.replace('&amp;', '&').replace('`', '').replace('**', '').replace('semantic-compatibility:', '')
    for pattern, replacement in TERMS.get(service, []):
        text = re.sub(pattern, replacement, text)
    drops = [re.compile(p, re.I) for p in DROP['*'] + DROP.get(service, [])]
    kept = []
    for part in sentences(text):
        part = re.sub(r'^[\s,/·\-–]+|[\s,/·.]+$', '', part)
        if part and not any(p.search(part) for p in drops) and part.lower() not in (k.lower() for k in kept):
            kept.append(part)
    if not kept:
        return ''
    first = kept[0]
    if re.fullmatch(r'[a-z]+', first.split(' ')[0]):
        kept[0] = first[0].upper() + first[1:]
    return '; '.join(kept).rstrip('.') + '.'


def check_wording(service, rows):
    offenders = [(row['id'], pattern) for row in rows for pattern in LEAKS if re.search(pattern, row['notes'], re.I)]
    if offenders:
        shown = '; '.join(f'{rid} ~ {pattern}' for rid, pattern in offenders[:8])
        raise SyncError(f'{service}: {len(offenders)} notes still carry internal wording ({shown}); extend DROP/TERMS in polish()')


# A description is prose about the production feature, so only wording that identifies this repository's
# internals or the emulators is refused (names such as TestIamPermissions or [OFFSET] are legitimate prose).
DESCRIPTION_LEAKS = [r'\bEvidence:', r'github\.com', r'https?://', r'/Users/', r'\b[\w-]+\.(?:go|py|cc|mjs)\b',
                     r'(?:^|\s)[\w-]+/[\w./-]+\.(?:md|csv|json)\b', r'\b[0-9a-f]{40}\b', r'\bjay[-_]', r'LocalGCloud',
                     r'AGENTS|CLAUDE|graft\b', r'\bfork\b', r'\bupstream\b', r'\bgoccy\b', r'\bLocalCloud\b',
                     r'\blittle[- ]bigtable\b', r'\bfake-gcs-server\b', r'\bsource evidence\b', r'\bTODO\b', r'\bTBD\b']
DESCRIPTION_LENGTH = (24, 400)
SHARED_DESCRIPTION = 4  # this many differently named features with one sentence reads as filler


def describe(text):
    """A description as a visitor reads it: plain text, one line, ending in a full stop."""
    text = re.sub(r'\s+', ' ', plain(text or '')).strip()
    return text + '.' if text and text[-1] not in '.!?' else text


def check_descriptions(service, raw_rows):
    """Every compared row (published or not) needs a clean description; returns shared-sentence warnings."""
    missing = [row['name'] for row in raw_rows if not row['description']]
    if missing:
        raise SyncError(f'{service}: {len(missing)} rows have no description (first: {", ".join(missing[:5])}); the document must '
                        'describe every compared feature, see docs/prompts/upstream/descriptions.md')
    problems = []
    for row in raw_rows:
        text, low, high = row['description'], *DESCRIPTION_LENGTH
        if re.sub(r'\W+', '', text).lower() == re.sub(r'\W+', '', row['name']).lower():
            problems.append(f'{row["name"]!r} only repeats its name')
        elif not low <= len(text) <= high:
            problems.append(f'{row["name"]!r} has a description of {len(text)} characters')
        else:
            problems += [f'{row["name"]!r} ~ {pattern}' for pattern in DESCRIPTION_LEAKS if re.search(pattern, text, re.I)]
    if problems:
        raise SyncError(f'{service}: {len(problems)} unusable descriptions ({"; ".join(problems[:8])})')
    names = defaultdict(set)
    for row in raw_rows:
        names[row['description']].add(re.sub(r'[^a-z0-9]+', ' ', row['name'].lower()).strip())
    return sorted((len(who), text) for text, who in names.items() if len(who) >= SHARED_DESCRIPTION)


# Visitors may follow one link per feature, to Google's own documentation. Hosts are listed so a typo or a link to a
# repository, a test or an unofficial page can never reach the site.
DOCS_HOSTS = {'cloud.google.com', 'docs.cloud.google.com', 'firebase.google.com', 'developers.google.com'}


def link_definitions(text):
    """Reference-style link targets at the end of a document: {'g-bi': 'https://...'}."""
    return {label.lower(): url for label, url in re.findall(r'^\[([^\]]+)\]:\s*<?(https?://[^\s>]+)', text, re.M)}


def docs_url(cell_text, definitions):
    """The first official Google documentation link in a table cell, or '' (inline, reference-style or bare)."""
    found = re.findall(r'\]\((https?://[^)\s]+)\)|<(https?://[^>\s]+)>|(?<![(\[<])\b(https?://[^\s|)\]>]+)', cell_text)
    urls = [next(part for part in match if part) for match in found]
    urls += [definitions[label.lower()] for label in re.findall(r'\]\[([^\]]+)\]', cell_text) if label.lower() in definitions]
    urls += [definitions[label.lower()] for label in re.findall(r'(?<!\])\[([^\]]+)\](?![\[(:])', cell_text) if label.lower() in definitions]
    for url in urls:
        parts = urlsplit(url.rstrip('.,;'))
        if parts.scheme == 'https' and parts.hostname in DOCS_HOSTS:
            return parts.geturl()
    return ''


def check_docs(service, raw_rows):
    """Every compared row links the Google documentation page that explains the feature."""
    missing = [row['name'] for row in raw_rows if not row['docs']]
    if missing:
        raise SyncError(f'{service}: {len(missing)} rows lack an official Google documentation link (first: {", ".join(missing[:5])}); '
                        f'the document needs an official reference on https://{{{",".join(sorted(DOCS_HOSTS))}}}, see docs/emulator-comparisons.md')


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-') or 'feature'


# ----------------------------------------------------------------------------- service adapters

def gcs_rows(text):
    spec = {'id': r'^ID$', 'name': r'^Production GCS capability$', 'production': r'^GCS$', 'competitor': r'^Upstream$',
            'local': r'^Fork$', 'notes': r'^Implementation evidence', 'description?': r'^Description$',
            'docs?': r'^Official Google reference$'}
    out, links = [], link_definitions(text)
    for row in feature_rows('gcs', text, spec):
        out.append(dict(id=plain(cell(row, 'id')), name=plain(cell(row, 'name')), area=' / '.join(heading_path(row)),
                        local=state(cell(row, 'local'), f'gcs line {row["line"]}'),
                        other=state(cell(row, 'competitor'), f'gcs line {row["line"]}'), note=cell(row, 'notes'),
                        description=describe(cell(row, 'description')), docs=docs_url(cell(row, 'docs'), links)))
    return out


def firestore_rows(text):
    spec = {'name': r'^Individual production feature$', 'production': r'^Production$', 'competitor': r'^Google emulator$',
            'default': r'^(?:Go default|Compatibility(?: profile)?)$', 'local': r'^(?:Go production|Extended(?: profile)?)$',
            'notes': r'^Emulator evidence', 'description?': r'^Description$',
            'docs?': r'^Official production reference$'}
    out, links = [], link_definitions(text)
    for row in feature_rows('firestore', text, spec):
        where = f'firestore line {row["line"]}'
        out.append(dict(name=plain(cell(row, 'name')), area=' / '.join(heading_path(row)),
                        local=state(cell(row, 'local'), where), other=state(cell(row, 'competitor'), where),
                        default=state(cell(row, 'default'), where), note=cell(row, 'notes'),
                        description=describe(cell(row, 'description')), docs=docs_url(cell(row, 'docs'), links)))
    return out


BIGTABLE_AREAS = {
    'Documented production RPCs': 'RPC methods', 'Documented pinned request/schema fields': 'Request fields',
    'Every RowFilter variant': 'Row filters', 'Every GC rule variant': 'Garbage-collection rules',
    'Every production Mutation variant': 'Mutations', 'Every read-modify-write operation': 'Read-modify-write',
    'Aggregate family types': 'Aggregate types', 'Production behaviors and boundaries': 'Behaviors',
    'Documented production SQL functions and syntax': 'SQL functions and syntax',
}


def bigtable_rows(text):
    spec = {'name': r'^(?:RPC|Field|Capability|SQL name)$', 'production': r'^Production$', 'local': r'^Local(?: query)?$',
            'competitor?': r'^(?:Google Cloud Bigtable emulator|CBT emulator|Google(?: emulator)?(?: query)?)$',
            'notes?': r'^Local contract or limit$', 'form?': r'^Local form$', 'cmv_production?': r'^Production CMV aggregate$',
            'cmv_local?': r'^Local CMV aggregate$', 'description?': r'^Description$', 'docs?': r'^Official Google reference$'}
    out, links = [], link_definitions(text)
    for row in feature_rows('bigtable', text, spec):
        where = f'bigtable line {row["line"]}'
        path = heading_path(row)
        top = BIGTABLE_AREAS.get(path[0], re.sub(r'^(?:Documented|Every) (?:production )?', '', path[0]))
        name = plain(cell(row, 'name'))
        if top in ('RPC methods', 'Request fields') and len(path) > 1:
            name = f'{path[1].rsplit(".", 1)[-1]}.{name}'
        note, keep_note = cell(row, 'notes'), False
        if 'form' in row['roles']:
            form = plain(cell(row, 'form')).lower()
            production, local = (state(cell(row, c), where) for c in ('cmv_production', 'cmv_local'))
            note = ''
            if form == 'aggregate' and production == 'available' and local != 'available':
                note, keep_note = 'Not available in continuous materialized views.', True
        other = state(cell(row, 'competitor'), where) if 'competitor' in row['roles'] else None
        out.append(dict(name=name, area=top, local=state(cell(row, 'local'), where), other=other, note=note.strip(),
                        keep_note=keep_note, description=describe(cell(row, 'description')),
                        docs=docs_url(cell(row, 'docs'), links)))
    return out


def spanner_rows(text):
    spec = {'name': r'^Production feature / behavior$', 'competitor': r'^Google emulator\b', 'local': r'^Extended$',
            'notes': r'^Scope / difference$', 'description?': r'^Description$', 'docs?': r'^Official Spanner reference$'}
    out, links = [], link_definitions(text)
    for row in feature_rows('spanner', text, spec):
        where = f'spanner line {row["line"]}'
        out.append(dict(name=plain(cell(row, 'name')), area=' / '.join(heading_path(row)),
                        local=state(cell(row, 'local'), where), other=state(cell(row, 'competitor'), where),
                        note=cell(row, 'notes'), description=describe(cell(row, 'description')),
                        docs=docs_url(cell(row, 'docs'), links)))
    return out


BIGQUERY_SURFACES = {'sql': 'SQL', 'metadata': 'Metadata', 'rest_v2': 'REST API', 'storage_read_v1': 'Storage Read API',
                     'storage_write_v1': 'Storage Write API'}
BIGQUERY_CATEGORIES = {'Expression': 'Expressions', 'Scripting & Procedural': 'Scripting', 'SetOps': 'Set operations',
                       'Set Operations': 'Set operations', 'Row Access Policies': 'Row access policies',
                       'RowAccessPolicies': 'Row access policies', 'Function': 'Functions', 'Type': 'Types',
                       'Operator': 'Operators', 'Clauses': 'Clauses', 'Tables': 'Tables'}
BIGQUERY_STATES = {'implemented': 'available', 'partial': 'limited', 'unsupported': 'unavailable', 'unknown': 'unknown'}
BIGQUERY_COLUMNS = ['capability_id', 'feature_name', 'description', 'surface', 'category', 'local_development', 'goccy_status',
                    'local_limitations', 'google_documentation']


def bigquery_rows(text):
    reader = csv.DictReader(io.StringIO(text))
    missing = [c for c in BIGQUERY_COLUMNS if c not in (reader.fieldnames or [])]
    if missing:
        raise SyncError(f'bigquery: comparison-features.csv lacks columns {missing}')
    out = []
    for number, entry in enumerate(reader, 2):
        try:
            local, other = BIGQUERY_STATES[entry['local_development']], BIGQUERY_STATES[entry['goccy_status']]
        except KeyError as error:
            raise SyncError(f'bigquery: row {number} has unknown status {error}')
        surface = BIGQUERY_SURFACES.get(entry['surface'], entry['surface'])
        category = BIGQUERY_CATEGORIES.get(entry['category'].replace('&amp;', '&'), entry['category'])
        area = surface if entry['surface'].startswith('storage_') else f'{surface} / {category}'
        out.append(dict(id=entry['capability_id'], name=entry['feature_name'], area=area, local=local, other=other,
                        note=entry['local_limitations'], description=describe(entry['description']),
                        docs=docs_url(entry['google_documentation'], {})))
    return out


ADAPTERS = {'gcs': gcs_rows, 'firestore': firestore_rows, 'bigtable': bigtable_rows, 'spanner': spanner_rows,
            'bigquery': bigquery_rows}


# ----------------------------------------------------------------------------- reconciliation

def number(value):
    return int(re.sub(r'[^\d]', '', plain(value)))


def state_of(label):
    match = re.match(r'^\W*(✓|√|✗|×|X|◐|△|\?|—|○)', plain(label))
    return STATES[match[1]] if match else None


def table_after(text, start):
    for table in tables(text):
        if re.search(start, plain(table['header'][0])):
            return table
    return None


def count(rows, key):
    return Counter(row[key] for row in rows if row.get(key))


def stated(service, documents, rows):
    """Totals the documents state about themselves, per column and state; every one must equal the parsed rows."""
    primary = documents[DOCUMENTS[service][1]]
    expected = {}
    if service == 'gcs':
        table = table_after(primary, r'^Status across')
        if table:
            for _, cells in table['rows']:
                key = state_of(cells[0])
                if key:
                    expected.setdefault('other', {})[key] = number(cells[2])
                    expected.setdefault('local', {})[key] = number(cells[3])
            expected['total'] = number(re.search(r'across (\d+) production', table['header'][0])[1])
    elif service == 'spanner':
        table = table_after(primary, r'^Production-contract coverage$')
        if table:
            for _, cells in table['rows']:
                key = state_of(cells[0])
                if key:
                    expected.setdefault('other', {})[key] = number(cells[1])
                    expected.setdefault('local', {})[key] = number(cells[2])
                elif 'documented checks' in cells[0]:
                    expected['total'] = number(cells[1])
    elif service == 'bigtable':
        table = table_after(primary, r'^Production inventory$')
        if table:
            header = [plain(h) for h in table['header']]
            def column(pattern):
                return next((i for i, h in enumerate(header) if re.search(pattern, h)), None)
            def total(index):
                if index is None:
                    raise SyncError('bigtable: the coverage metrics table lacks a column the importer needs; update stated()')
                return sum(number(cells[index]) for _, cells in table['rows'])
            expected = {'total': total(column(r'^Documented rows$'))}
            for key, prefix in (('local', 'Local'), ('other', r'Google(?: emulator)?')):
                columns = {name: column(rf'^{prefix} {mark}$') for name, mark in (('available', '✓'), ('limited', '◐'), ('unavailable', '✗'), ('unknown', r'\?'))}
                if all(i is not None for i in columns.values()):
                    expected[key] = {name: total(i) for name, i in columns.items()}
    elif service == 'firestore':
        table = table_after(documents['docs/emulator-comparison-metrics.md'], r'^Marker$')
        if table:
            for _, cells in table['rows']:
                key = state_of(cells[0])
                if key:
                    expected.setdefault('production', {})[key] = number(cells[1])
                    expected.setdefault('other', {})[key] = number(cells[2])
                    expected.setdefault('default', {})[key] = number(cells[3])
                    expected.setdefault('local', {})[key] = number(cells[4])
            expected['total'] = expected['production'].get('available', 0) if 'production' in expected else None
    elif service == 'bigquery':
        block = re.search(r'<!-- comparison-metrics:start -->(.*?)<!-- comparison-metrics:end -->', documents['docs/COMPARISON.md'], re.S)
        table = block and tables(block[1])[0]
        if table:
            for _, cells in table['rows']:
                key = state_of(cells[0])
                if key:
                    expected.setdefault('local', {})[key] = number(cells[1])
                    expected.setdefault('other', {})[key] = number(cells[2])
                elif 'baseline rows' in cells[0]:
                    expected['total'] = number(cells[1])
    if not table or not expected.get('total'):
        raise SyncError(f'{service}: the document no longer states its totals where the importer looks; update stated()')
    problems = []
    if expected['total'] != len(rows):
        problems.append(f'{len(rows)} rows parsed, document states {expected["total"]}')
    for key in ('local', 'other', 'default'):
        if key in expected:
            actual = count(rows, key)
            for item in set(actual) | set(expected[key]):
                if actual.get(item, 0) != expected[key].get(item, 0):
                    problems.append(f'{key} {item}: parsed {actual.get(item, 0)}, document states {expected[key].get(item, 0)}')
    if problems:
        raise SyncError(f'{service}: parsed rows do not match the document\'s own totals: ' + '; '.join(problems))
    return expected


# ----------------------------------------------------------------------------- assembling the inventory

SURFACE_ORDER = ['sql.', 'rest_v2.', 'storage_', 'metadata.']
COLLAPSE_REPEATS = {'bigquery'}  # its inherited catalog lists some features under two categories


def assemble(service, raw_rows):
    """Stable IDs, visitor wording and the two documented visibility rules; returns (rows, hidden counts)."""
    seen = Counter()
    rows = []
    for raw in raw_rows:
        row_id = raw.get('id') or slug(f'{service} {raw["area"]} {raw["name"]}')
        seen[row_id] += 1
        if seen[row_id] > 1:
            if raw.get('id'):
                raise SyncError(f'{service}: the document repeats the row ID {row_id}')
            row_id = f'{row_id}-{seen[row_id]}'
        row = {'id': row_id, 'name': raw['name'], 'area': raw['area'], 'local': raw['local']}
        if raw['other'] is not None:
            row['other'] = raw['other']
        if 'default' in raw:
            row['default'] = raw['default']
        row['description'] = raw.get('description', '')
        row['docs'] = raw.get('docs', '')
        row['notes'] = polish(service, raw['note'])
        if row['local'] not in NOTE_STATES.get(service, STATES.values()) and not raw.get('keep_note'):
            row['notes'] = ''
        rows.append(row)
    check_wording(service, rows)
    hidden = {'unassessed': 0, 'repeated': 0}
    if HIDE_UNASSESSED_LOCAL:
        hidden['unassessed'] = sum(row['local'] == 'unknown' for row in rows)
        rows = [row for row in rows if row['local'] != 'unknown']
    if service not in COLLAPSE_REPEATS:
        return rows, hidden
    ranked = sorted(rows, key=lambda r: next((i for i, p in enumerate(SURFACE_ORDER) if r['id'].startswith(p)), len(SURFACE_ORDER)))
    keep, shown = set(), set()
    for row in ranked:  # one feature to a visitor: same name, same result
        signature = (re.sub(r'[^a-z0-9]+', ' ', row['name'].lower()).strip(), row['local'], row.get('other'), row.get('default'))
        if signature not in shown:
            shown.add(signature)
            keep.add(row['id'])
    hidden['repeated'] = len(rows) - len(keep)
    return [row for row in rows if row['id'] in keep], hidden


def summarize(rows):
    has_competitor = any('other' in row for row in rows)
    # Only in LocalCloud: it works here (with or without a documented limit) and the compared emulator lacks it.
    advantages = [r for r in rows if r['local'] in ('available', 'limited') and r.get('other') in ('unavailable', 'no-effect')]
    return {'total': len(rows), 'exclusive': len(advantages), 'hasCompetitor': has_competitor}


# ----------------------------------------------------------------------------- reading the repositories

def git(directory, *args):
    return subprocess.check_output(['git', '-C', str(directory), *args], text=True).strip()


def committed_document(directory, path):
    raw = (directory / path).read_bytes()
    revision = git(directory, 'rev-parse', 'HEAD')
    if raw != subprocess.check_output(['git', '-C', str(directory), 'show', f'{revision}:{path}']):
        raise SyncError(f'{directory.name}/{path} has uncommitted changes; commit it upstream before syncing')
    return raw, revision, git(directory, 'log', '-1', '--format=%H', '--', path)


def build(service, dependencies):
    repository, path, companions = DOCUMENTS[service]
    directory = dependencies / repository
    texts, documents = {}, []
    for name in [path, *companions]:
        raw, revision, commit = committed_document(directory, name)
        texts[name] = raw.decode()
        documents.append({'path': name, 'commit': commit, 'sha256': hashlib.sha256(raw).hexdigest()})
    parsed = ADAPTERS[service](texts[path])
    expected = stated(service, texts, parsed)
    shared = check_descriptions(service, parsed)
    check_docs(service, parsed)
    rows, hidden = assemble(service, parsed)
    if not rows:
        raise SyncError(f'{service}: nothing left to publish')
    reviewed = next(filter(None, (re.search(r'\b(20\d\d-\d\d-\d\d)\b', texts[name][:6000]) for name in texts)), None)
    provenance = {'repository': repository, 'revision': revision, 'reviewed': reviewed and reviewed[1], 'documents': documents,
                  'documented': {'rows': len(parsed), **{k: v for k, v in expected.items() if k != 'total'}}, 'hidden': hidden,
                  'sharedDescriptions': [{'features': count, 'description': text} for count, text in shared]}
    return rows, summarize(rows), provenance


def render(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def sync(dependencies, check=False):
    outputs = {service: build(service, dependencies) for service in DOCUMENTS}
    index = {service: metrics for service, (_, metrics, _) in outputs.items()}
    provenance = {service: details for service, (_, _, details) in outputs.items()}
    drift = []
    if check:
        recorded = json.loads(PROVENANCE.read_text()) if PROVENANCE.exists() else {}
        for service, (rows, _, details) in outputs.items():
            file = INVENTORIES / f'{service}.json'
            if not file.exists() or file.read_text() != render(rows):
                drift.append(f'{service}: inventory differs from the documents')
            if [d['sha256'] for d in recorded.get(service, {}).get('documents', [])] != [d['sha256'] for d in details['documents']]:
                drift.append(f'{service}: document digests differ from the recorded provenance')
        if (INVENTORIES / 'index.json').read_text() != render(index):
            drift.append('index.json differs from the documents')
    else:
        INVENTORIES.mkdir(parents=True, exist_ok=True)
        for service, (rows, _, _) in outputs.items():
            (INVENTORIES / f'{service}.json').write_text(render(rows))
        (INVENTORIES / 'index.json').write_text(render(index))
        PROVENANCE.write_text(render(provenance))
    for service, (_, metrics, details) in outputs.items():
        hidden = details['hidden']
        print(f'{service:9s} documented {details["documented"]["rows"]:5d} -> shown {metrics["total"]:5d}  '
              f'only in LocalCloud {metrics["exclusive"]:4d}  '
              f'(unassessed {hidden["unassessed"]}, repeated {hidden["repeated"]}, competitor {"yes" if metrics["hasCompetitor"] else "no"})')
        for item in details['sharedDescriptions']:
            print(f'  warning: {item["features"]} different {service} features share the description "{item["description"][:90]}"')
    if drift:
        print('\n'.join(['Out of date:', *drift]), file=sys.stderr)
        return 1
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('dependencies', nargs='?', type=Path, default=ROOT.parent / 'local_cloud_dependencies')
    parser.add_argument('--check', action='store_true', help='report whether the checked-in inventories match the documents; write nothing')
    args = parser.parse_args(argv)
    try:
        return sync(args.dependencies, args.check)
    except SyncError as error:
        print(f'sync failed: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
