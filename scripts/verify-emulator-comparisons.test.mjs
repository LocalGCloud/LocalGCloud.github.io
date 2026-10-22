import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { comparisonStates, presentComparisonNotes, selectComparisonRows } from '../src/utils/emulator-comparisons.mjs';

const json = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const metrics = json('src/data/emulator-comparisons/index.json');
const provenance = json('src/data/emulator-comparison-provenance.json');
const services = ['gcs', 'firestore', 'bigtable', 'spanner', 'bigquery'];
const inventory = service => json(`src/data/emulator-comparisons/${service}.json`);

// Internal wording that must never reach a visitor; scripts/sync-emulator-comparisons.py scans notes for the same set.
// Feature names are exempt from the patterns that real names can match (TestIamPermissions, LEFT [OUTER] JOIN).
const identifying = [/github\.com/i, /https?:\/\//i, /\/Users\//, /\b[0-9a-f]{40}\b/, /\bjay[-_]/i, /LocalGCloud/, /\bEvidence:/];
const internal = [/\[[A-Za-z][\w-]*\]/, /\bEvidence:/, /\binventor(?:y|ies)\b/i, /github\.com/i, /https?:\/\//i, /\/Users\//,
  /\.(?:go|py|cc|md|csv|json)\b/, /\bTest[A-Z]\w+/, /\bfork\b/i, /\bupstream\b/i, /\b[0-9a-f]{40}\b/, /\bjay[-_]/i,
  /LocalGCloud/, /AGENTS|CLAUDE|graft\b/, /\bqualif\w*/i, /source evidence/i, /semantic-compatibility:/];

// A description is prose about the production feature; only wording that identifies internals or the emulators is refused.
const descriptionInternal = [/\bEvidence:/, /github\.com/i, /https?:\/\//i, /\/Users\//, /\b[\w-]+\.(?:go|py|cc|mjs)\b/, /(?:^|\s)[\w-]+\/[\w./-]+\.(?:md|csv|json)\b/,
  /\b[0-9a-f]{40}\b/, /\bjay[-_]/i, /LocalGCloud/, /AGENTS|CLAUDE|graft\b/, /\bfork\b/i, /\bupstream\b/i, /\bgoccy\b/i, /\bLocalCloud\b/,
  /\blittle[- ]bigtable\b/i, /\bfake-gcs-server\b/i, /\bsource evidence\b/i, /\bTODO\b/, /\bTBD\b/];

test('rendered vocabulary preserves SQL meaning', () => {
  assert.equal(presentComparisonNotes('partial index; source qualification; qualification open; validation: partial; semantic-compatibility:limit'),
    'partial index; source-name resolution; verification open; validation: limited; Behavior boundary: limit');
});

test('advantages require explicit baseline absence; unknowns and scoped local behavior never count', () => {
  const rows = [
    { id: 'gap', local: 'available', other: 'unavailable' },
    { id: 'no-effect', local: 'available', other: 'no-effect' },
    { id: 'unassessed', local: 'available', other: 'unknown' },
    { id: 'scoped', local: 'limited', other: 'unavailable' },
    { id: 'broader', local: 'available', other: 'limited' },
    { id: 'shared', local: 'available', other: 'available' },
    { id: 'na', local: 'available', other: 'na' },
  ];
  assert.deepEqual(selectComparisonRows(rows).map(row => row.id), ['gap', 'no-effect']);
  assert.deepEqual(selectComparisonRows(rows, { mode: 'broader' }).map(row => row.id), ['broader']);
  assert.equal(selectComparisonRows(rows, { mode: 'all' }).length, rows.length);
});

for (const service of services) {
  test(`${service}: complete inventory, reconciled counts and recorded provenance`, () => {
    const rows = inventory(service);
    const details = provenance[service];
    const { hasCompetitor, ...counts } = metrics[service];
    assert.equal(rows.length, counts.total);
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'IDs are unique');
    assert.match(details.revision, /^[a-f0-9]{40}$/);
    assert.ok(details.documents.length > 0);
    for (const document of details.documents) {
      assert.match(document.sha256, /^[a-f0-9]{64}$/);
      assert.match(document.commit, /^[a-f0-9]{40}$/);
    }
    assert.equal(details.documented.rows, rows.length + details.hidden.unassessed + details.hidden.repeated,
      'every document row is either published or accounted for as hidden');
    for (const row of rows) {
      assert.ok(row.name && row.area, row.id);
      assert.equal(typeof row.notes, 'string');
      assert.ok(row.description.length >= 24 && row.description.length <= 400, `${row.id}: every feature has a description a visitor can read`);
      assert.match(row.description, /[.!?]$/, row.id);
      assert.ok(row.local in comparisonStates && row.local !== 'unknown', `${row.id}: LocalCloud results are always assessed`);
      assert.equal('other' in row, hasCompetitor, `${row.id}: competitor results match the service`);
      if (hasCompetitor) assert.ok(row.other in comparisonStates, row.id);
      assert.ok(!row.default || row.default in comparisonStates);
    }
    assert.deepEqual(counts, { total: rows.length, exclusive: selectComparisonRows(rows).length, broader: selectComparisonRows(rows, { mode: 'broader' }).length });
    const last = rows.at(-1);
    assert.ok(selectComparisonRows(rows, { mode: 'all', query: last.id, area: last.area }).some(row => row.id === last.id), 'search covers the complete inventory');
  });

  test(`${service}: published rows carry no internal wording`, () => {
    for (const row of inventory(service)) {
      for (const pattern of internal) assert.ok(!pattern.test(row.notes), `${row.id} notes match ${pattern}`);
      for (const pattern of descriptionInternal) assert.ok(!pattern.test(row.description), `${row.id} description matches ${pattern}`);
      for (const pattern of identifying) assert.ok(!pattern.test(`${row.name} ${row.area}`), `${row.id} name or area matches ${pattern}`);
    }
  });
}

test('the documents state the totals the inventories reproduce', () => {
  for (const service of services) {
    const documented = provenance[service].documented;
    assert.ok(documented.rows > 0);
    for (const key of ['local', 'other', 'default']) {
      if (!documented[key]) continue;
      const counted = {};
      for (const row of inventory(service)) if (row[key]) counted[row[key]] = (counted[row[key]] ?? 0) + 1;
      for (const [state, count] of Object.entries(counted)) {
        assert.ok(count <= documented[key][state], `${service} ${key} ${state}: ${count} published, ${documented[key][state]} documented`);
      }
    }
  }
});

test('descriptions explain each feature, so most rows differ from every other', () => {
  for (const service of services) {
    const rows = inventory(service);
    const shared = Map.groupBy(rows, row => row.description);
    const filler = [...shared.values()].filter(group => new Set(group.map(row => row.name.toLowerCase())).size >= 8);
    assert.deepEqual(filler.map(group => group[0].description), [], `${service}: one sentence describes eight or more differently named features`);
    assert.ok(shared.size / rows.length > 0.85, `${service}: only ${shared.size} distinct descriptions for ${rows.length} rows`);
  }
});

test('source documents and their locations are no longer published', () => {
  assert.ok(!existsSync(new URL('../src/data/emulator-comparison-sources', import.meta.url)));
  assert.ok(!readFileSync(new URL('../src/data/emulatorComparisons.ts', import.meta.url), 'utf8').includes('sourcesUrl'));
  assert.ok(!readFileSync(new URL('../src/components/EmulatorComparisonTable.astro', import.meta.url), 'utf8').includes('Source reference'));
});

test('Firestore retains both engine profiles and unknown Google TTL behavior', () => {
  const rows = inventory('firestore');
  const indexes = rows.find(row => row.name === 'Required composite-index rejection for queries');
  assert.equal(indexes.default, 'unavailable');
  assert.equal(indexes.local, 'available');
  assert.equal(indexes.other, 'unavailable');
  const ttl = rows.find(row => row.name === 'Automatic expired-document deletion');
  assert.equal(ttl.other, 'unknown');
  assert.ok(!selectComparisonRows([ttl]).length);
});

test('Bigtable compares LocalCloud with the Google Cloud Bigtable emulator', () => {
  assert.equal(metrics.bigtable.hasCompetitor, true);
  const rows = inventory('bigtable');
  assert.ok(rows.every(row => row.other in comparisonStates && row.other !== 'unknown'), 'every Bigtable row has a Google emulator result');
  assert.ok(rows.some(row => row.area === 'SQL functions and syntax' && row.other === 'unavailable'));
  assert.ok(selectComparisonRows(rows).length > 0);
});

test('BigQuery hides unassessed LocalCloud rows and repeated features, and keeps unassessed competitor rows out of advantages', () => {
  const rows = inventory('bigquery');
  assert.ok(rows.every(row => row.local !== 'unknown'));
  assert.ok(rows.some(row => row.other === 'unknown'));
  assert.ok(selectComparisonRows(rows).every(row => row.other === 'unavailable' || row.other === 'no-effect'));
  const seen = new Set();
  for (const row of rows) {
    const signature = [row.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), row.local, row.other].join('|');
    assert.ok(!seen.has(signature), `${row.id} repeats another row's name and result`);
    seen.add(signature);
  }
});

test('imported names retain generic types and stream placeholders', () => {
  assert.ok(inventory('bigtable').some(row => row.name === 'Min<Int64>'));
  assert.ok(inventory('spanner').some(row => row.name === 'ARRAY<STRUCT> query values'));
  assert.ok(inventory('spanner').some(row => row.name === 'GoogleSQL READ_<stream>()'));
});
