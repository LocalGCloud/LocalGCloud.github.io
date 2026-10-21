import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { comparisonStates, presentComparisonNotes, selectComparisonRows } from '../src/utils/emulator-comparisons.mjs';

const json = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const metrics = json('src/data/emulator-comparisons/index.json');
const expected = { gcs: 244, firestore: 206, bigtable: 464, spanner: 783, bigquery: 1534 };

test('rendered vocabulary preserves SQL meaning and the original evidence stays separate', () => {
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

for (const [service, count] of Object.entries(expected)) {
  test(`${service}: complete inventory, stable counts and traceable source snapshots`, () => {
    const rows = json(`src/data/emulator-comparisons/${service}.json`);
    const sources = json(`src/data/emulator-comparison-sources/${service}.json`);
    assert.equal(rows.length, count);
    assert.equal(new Set(rows.map(row => row.id)).size, count);
    assert.match(sources.revision, /^[a-f0-9]{40}$/);
    for (const document of sources.documents) {
      assert.equal(createHash('sha256').update(document.content).digest('hex'), document.sha256);
    }
    for (const row of rows) {
      assert.ok(row.name && row.area && row.notes);
      assert.ok(row.local in comparisonStates && row.other in comparisonStates);
      assert.ok(!row.default || row.default in comparisonStates);
      const source = sources.documents.find(document => document.path === row.source);
      assert.ok(source && source.content.split('\n')[row.line - 1], row.id);
    }
    assert.deepEqual(metrics[service], { total: count, exclusive: selectComparisonRows(rows).length, broader: selectComparisonRows(rows, { mode: 'broader' }).length });
    const last = rows.at(-1);
    assert.ok(selectComparisonRows(rows, { mode: 'all', query: last.id, area: last.area }).some(row => row.id === last.id), 'search covers the complete inventory');
  });
}

test('Firestore retains both engine profiles and unknown Google TTL behavior', () => {
  const rows = json('src/data/emulator-comparisons/firestore.json');
  const indexes = rows.find(row => row.name === 'Required composite-index rejection for queries');
  assert.equal(indexes.default, 'unavailable');
  assert.equal(indexes.local, 'available');
  assert.equal(indexes.other, 'unavailable');
  const ttl = rows.find(row => row.name === 'Automatic expired-document deletion');
  assert.equal(ttl.other, 'unknown');
  assert.ok(!selectComparisonRows([ttl]).length);
});

test('BigQuery preserves the canonical 53 explicit-gap rows and 992 unassessed competitor rows', () => {
  const rows = json('src/data/emulator-comparisons/bigquery.json');
  assert.equal(selectComparisonRows(rows).length, 53);
  assert.equal(rows.filter(row => row.other === 'unknown').length, 992);
});

test('imported names retain generic types and stream placeholders', () => {
  const bigtable = json('src/data/emulator-comparisons/bigtable.json');
  assert.ok(bigtable.some(row => row.name === 'Min<Int64>'));
  const spanner = json('src/data/emulator-comparisons/spanner.json');
  assert.ok(spanner.some(row => row.name === 'ARRAY<STRUCT> query values'));
  assert.ok(spanner.some(row => row.name === 'GoogleSQL READ_<stream>()'));
});
