"""Import the supplied comparison inventories without inventing competitor gaps.

Usage: python3 scripts/sync-emulator-comparisons.py /path/to/local_cloud_dependencies
Only committed source documents are accepted. Builds use the checked-in snapshots.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = {
    'gcs': ('localcloud-fake-gcs-server', ['docs/upstream-comparison.md']),
    'firestore': ('firestore-go', ['docs/emulator-comparison.md']),
    'bigtable': ('little_bigtable', ['EMULATOR_COMPARISON.md']),
    'spanner': ('cloud-spanner-emulator', ['docs/emulator-comparison.md']),
    'bigquery': ('bigquery-emulator-on-duckdb', ['docs/COMPARISON.md', 'docs/COMPARISON_FEATURES.md', 'docs/comparison-features.csv']),
}
MARKS = {'✓': 'available', '√': 'available', '✗': 'unavailable', '×': 'unavailable', 'X': 'unavailable', '◐': 'limited', '△': 'limited', '?': 'unknown', '—': 'na', '○': 'no-effect'}


def plain(text):
    text = re.sub(r'</?(?:a|br|code|span|strong|em)\b[^>]*>', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]*\)|\[([^\]]+)\]\[[^\]]*\]', lambda m: m[1] or m[2], text)
    return text.replace('`', '').replace('**', '').replace('\\|', '|').strip()


def mark(text):
    value = plain(text)
    if value not in MARKS:
        raise ValueError(f'Unrecognized comparison marker: {text!r}')
    return MARKS[value]


def markdown_rows(service, text, source):
    rows, headings, header = [], {}, []
    for number, line in enumerate(text.splitlines(), 1):
        heading = re.match(r'^(#{2,6}) (.+)', line)
        if heading:
            depth = len(heading[1])
            headings = {k: v for k, v in headings.items() if k < depth}
            headings[depth] = plain(heading[2])
        if not line.startswith('|'):
            header = []
            continue
        cells = [v.strip() for v in re.split(r'(?<!\\)\|', line.strip())[1:-1]]
        if all(re.fullmatch(r':?-+:?', c) for c in cells):
            continue
        if not header:
            header = cells
            continue
        if service == 'gcs' and header[:2] == ['ID', 'Individual capability']:
            identity, name, other, local, notes = cells
            default = None
        elif service == 'firestore' and header[0] == 'Individual feature':
            name, other, default, local, notes = cells
            identity = f'firestore-{number}'
            default = mark(default)
        elif service == 'spanner' and header[0] == 'Individual feature / behavior':
            name, other, local, scope, evidence = cells
            identity, notes, default = f'spanner-{number}', scope + ' Evidence: ' + evidence, None
        elif service == 'bigtable' and len(header) > 2 and header[1:3] == ['Google', 'Fork']:
            name, other, local, *extra = cells
            identity, notes, default = f'bigtable-{number}', ' · '.join(extra), None
            # RPC names and field names recur in different protobuf services/messages.
            if header[0] in ['RPC', 'Field']:
                name = headings.get(4, '') + '.' + plain(name)
        else:
            continue
        area = ' / '.join(v for k, v in headings.items() if k >= 3)
        row = dict(id=plain(identity), name=plain(name), area=area, local=mark(local), other=mark(other), notes=plain(notes), source=source, line=number)
        if default is not None:
            row['default'] = default
        rows.append(row)
    return rows


def bigquery_rows(text, source):
    states = {'implemented': 'available', 'partial': 'limited', 'unsupported': 'unavailable', 'unknown': 'unknown'}
    rows = []
    for number, entry in enumerate(csv.DictReader(io.StringIO(text)), 2):
        notes = [entry[key] for key in ['local_scope', 'local_limitations', 'local_notes', 'goccy_note'] if entry[key]]
        if entry['goccy_basis']:
            notes.append('Competitor evidence basis: ' + entry['goccy_basis'] + ' (S: source; D: documentation; B: backend declaration). Not a fresh runtime test.')
        rows.append(dict(id=entry['capability_id'], name=entry['feature_name'], area=entry['surface'] + ' / ' + entry['category'], local=states[entry['local_development']], other=states[entry['goccy_status']], notes=' '.join(notes), source=source, line=number))
    return rows


def sync(dependencies):
    metadata = {}
    for service, (repository, paths) in DOCUMENTS.items():
        directory = dependencies / repository
        revision = subprocess.check_output(['git', '-C', str(directory), 'rev-parse', 'HEAD'], text=True).strip()
        documents = []
        for path in paths:
            raw = (directory / path).read_bytes()
            committed = subprocess.check_output(['git', '-C', str(directory), 'show', f'{revision}:{path}'])
            if raw != committed:
                raise ValueError(f'{repository}/{path} has uncommitted changes; commit upstream before syncing')
            documents.append(dict(path=path, sha256=hashlib.sha256(raw).hexdigest(), content=raw.decode()))
        source = documents[-1]
        rows = bigquery_rows(source['content'], source['path']) if service == 'bigquery' else markdown_rows(service, source['content'], source['path'])
        if not rows or len({r['id'] for r in rows}) != len(rows):
            raise ValueError(f'{service}: empty inventory or duplicate IDs')
        summary = dict(total=len(rows), exclusive=sum(r['local'] == 'available' and r['other'] in ['unavailable', 'no-effect'] for r in rows), broader=sum(r['local'] == 'available' and r['other'] == 'limited' for r in rows))
        metadata[service] = summary
        snapshots = ROOT / 'src/data/emulator-comparisons'
        sources = ROOT / 'src/data/emulator-comparison-sources'
        snapshots.mkdir(parents=True, exist_ok=True)
        sources.mkdir(parents=True, exist_ok=True)
        (snapshots / f'{service}.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
        (sources / f'{service}.json').write_text(json.dumps(dict(repository=repository, revision=revision, documents=documents), ensure_ascii=False, indent=2) + '\n')
        print(service, summary)
    (snapshots / 'index.json').write_text(json.dumps(metadata, indent=2) + '\n')


if __name__ == '__main__':
    sync(Path(sys.argv[1]) if len(sys.argv) == 2 else ROOT.parent / 'local_cloud_dependencies')
