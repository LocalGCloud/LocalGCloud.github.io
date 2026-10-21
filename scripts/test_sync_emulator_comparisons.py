"""Unit tests for the comparison importer: python3 -B -m unittest scripts/test_sync_emulator_comparisons.py"""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('sync', Path(__file__).with_name('sync-emulator-comparisons.py'))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

GCS = """# Cloud Storage

### Buckets

| ID | Production GCS capability | GCS | Upstream | Fork | Official Google reference | Implementation evidence / gap |
| --- | --- | :---: | :---: | :---: | --- | --- |
| B01 | Create bucket | ✓ | ◐ | ✓ | [buckets.insert][g-bi] | [Buckets][buckets]; upstream lists globally; fork filters ownership |
| B02 | Lock retention | ✓ | ✗ | ✗ | [lock][g-lock] | [Routes][routes]; source evidence |

## Capability counts

| Status across 2 production capability rows | Production GCS baseline | Upstream | Fork |
| --- | ---: | ---: | ---: |
| ✓ Implemented/documented as scoped | 2 | 0 | 1 |
| ◐ Partial or limited | 0 | 1 | 0 |
| ✗ Absent production contract | 0 | 1 | 1 |
| Total rows | 2 | 2 | 2 |
"""

# Same content with the columns reordered and renamed noise around them: roles, not positions, identify columns.
GCS_REORDERED = GCS.replace(
    '| ID | Production GCS capability | GCS | Upstream | Fork | Official Google reference | Implementation evidence / gap |',
    '| ID | Production GCS capability | GCS | Fork | Upstream | Official Google reference | Implementation evidence / gap |',
).replace('| B01 | Create bucket | ✓ | ◐ | ✓ |', '| B01 | Create bucket | ✓ | ✓ | ◐ |').replace('| B02 | Lock retention | ✓ | ✗ | ✗ |', '| B02 | Lock retention | ✓ | ✗ | ✗ |')


class Markers(unittest.TestCase):
    def test_every_glyph_family_maps_to_one_state(self):
        for cell, expected in [('✓', 'available'), ('√', 'available'), ('✗', 'unavailable'), ('×', 'unavailable'), ('X', 'unavailable'),
                               ('◐', 'limited'), ('△', 'limited'), ('?', 'unknown'), ('—', 'na'), ('○', 'no-effect'), ('✓†', 'available')]:
            self.assertEqual(sync.state(cell, 'test'), expected)

    def test_unknown_marks_stop_the_sync(self):
        for cell in ['maybe', '✓ D', '']:
            with self.assertRaises(sync.SyncError):
                sync.state(cell, 'test')


class Tables(unittest.TestCase):
    def test_gcs_rows_use_stated_ids_and_reconcile_with_the_documents_totals(self):
        rows = sync.gcs_rows(GCS)
        self.assertEqual([r['id'] for r in rows], ['B01', 'B02'])
        self.assertEqual((rows[0]['local'], rows[0]['other']), ('available', 'limited'))
        self.assertEqual(rows[0]['area'], 'Buckets')
        expected = sync.stated('gcs', {sync.DOCUMENTS['gcs'][1]: GCS}, rows)
        self.assertEqual(expected['total'], 2)

    def test_columns_are_found_by_heading_not_position(self):
        rows = sync.gcs_rows(GCS_REORDERED)
        self.assertEqual((rows[0]['local'], rows[0]['other']), ('available', 'limited'))

    def test_a_document_that_disagrees_with_its_own_totals_is_refused(self):
        rows = sync.gcs_rows(GCS)
        wrong = GCS.replace('| ✗ Absent production contract | 0 | 1 | 1 |', '| ✗ Absent production contract | 0 | 2 | 1 |')
        with self.assertRaisesRegex(sync.SyncError, 'do not match'):
            sync.stated('gcs', {sync.DOCUMENTS['gcs'][1]: wrong}, rows)

    def test_a_document_without_stated_totals_is_refused(self):
        rows = sync.gcs_rows(GCS)
        with self.assertRaisesRegex(sync.SyncError, 'no longer states'):
            sync.stated('gcs', {sync.DOCUMENTS['gcs'][1]: GCS.split('## Capability counts')[0]}, rows)

    def test_rows_with_the_wrong_number_of_cells_are_refused(self):
        broken = GCS.replace('| B02 | Lock retention | ✓ | ✗ | ✗ | [lock][g-lock] | [Routes][routes]; source evidence |', '| B02 | Lock retention | ✓ |')
        with self.assertRaisesRegex(sync.SyncError, 'cells'):
            sync.gcs_rows(broken)

    def test_a_table_whose_headings_changed_is_caught_by_the_documents_totals(self):
        # The new table is not recognized, so its row is not parsed; the document's own total (now 3) exposes the gap.
        text = GCS.replace('across 2 production', 'across 3 production').replace('| Total rows | 2 | 2 | 2 |', '| Total rows | 3 | 3 | 3 |')
        text += '\n### More\n\n| ID | Production GCS capability | GCS | Replacement | Official Google reference | Evidence |\n| --- | --- | --- | --- | --- | --- |\n| B03 | Other | ✓ | ✓ | x | y |\n'
        rows = sync.gcs_rows(text)
        self.assertEqual(len(rows), 2)
        with self.assertRaisesRegex(sync.SyncError, 'do not match'):
            sync.stated('gcs', {sync.DOCUMENTS['gcs'][1]: text}, rows)

    def test_bigtable_has_no_competitor_and_names_rpcs_by_service(self):
        text = """### Documented production RPCs

#### `google.bigtable.v2.Bigtable`

| RPC | Production | Local | Official Google reference | Local contract or limit | Local owning test |
| --- | --- | --- | --- | --- | --- |
| `ReadRows` | ✓ | ✓ | [Google docs][P1] | Streams rows. | [`TestReadRows`](x.go) |

### Documented production SQL functions and syntax

| SQL name | Production | Local query | Official Google reference | Local form | Production CMV aggregate | Local CMV aggregate | Local source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ABS` | ✓ | ✓ | [Function reference][P2] | scalar | — | — | [Source](a.go) |
| `AVG` | ✓ | ✓ | [Function reference][P3] | aggregate | ✓ | ✗ | [Source](a.go) |
| `LAG` | ✓ | ✗ | [Function reference][P4] | not implemented | — | — | [Source](a.go) |
"""
        rows = sync.bigtable_rows(text)
        self.assertEqual([(r['name'], r['area'], r['local']) for r in rows], [
            ('Bigtable.ReadRows', 'RPC methods', 'available'), ('ABS', 'SQL functions and syntax', 'available'),
            ('AVG', 'SQL functions and syntax', 'available'), ('LAG', 'SQL functions and syntax', 'unavailable')])
        self.assertTrue(all(r['other'] is None for r in rows))
        self.assertEqual(rows[2]['note'], 'Not available in continuous materialized views.')
        self.assertEqual(sync.summarize(sync.assemble('bigtable', rows)[0])['hasCompetitor'], False)

    def test_bigtable_picks_up_a_google_emulator_column_and_its_totals(self):
        text = """### Documented production RPCs

#### `google.bigtable.v2.Bigtable`

| RPC | Production | Google emulator | Local | Official Google reference | Local contract or limit | Local owning test |
| --- | --- | --- | --- | --- | --- | --- |
| `ReadRows` | ✓ | ✓ | ✓ | [Google docs][P1] | Streams rows. | [`TestReadRows`](x.go) |
| `CreateBackup` | ✓ | ✗ | ◐ | [Google docs][P2] | Local snapshots. | [`TestBackup`](x.go) |

### Coverage metrics

| Production inventory | Documented rows | Google ✓ | Google ◐ | Google ✗ | Google ? | Local ✓ | Local ◐ | Local ✗ | Local ? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Documented production RPCs | 2 | 1 | 0 | 1 | 0 | 1 | 1 | 0 | 0 |
"""
        rows = sync.bigtable_rows(text)
        self.assertEqual([(r['local'], r['other']) for r in rows], [('available', 'available'), ('limited', 'unavailable')])
        self.assertTrue(sync.summarize(sync.assemble('bigtable', rows)[0])['hasCompetitor'])
        expected = sync.stated('bigtable', {sync.DOCUMENTS['bigtable'][1]: text}, rows)
        self.assertEqual(expected['other'], {'available': 1, 'limited': 0, 'unavailable': 1, 'unknown': 0})

    def test_firestore_profiles_may_use_the_product_names(self):
        header = '| Individual production feature | Official production reference | Production | Google emulator | {a} | {b} | Emulator evidence and limitation |'
        body = '| Get one document | [Reference](x) | √ | √ | √ | √ | [reads] |'
        for a, b in (('Go default', 'Go production'), ('Compatibility profile', 'Extended profile')):
            text = '### Data\n\n' + header.format(a=a, b=b) + '\n| --- | --- | --- | --- | --- | --- | --- |\n' + body + '\n'
            rows = sync.firestore_rows(text)
            self.assertEqual((rows[0]['local'], rows[0]['default'], rows[0]['other']), ('available', 'available', 'available'))

    def test_bigquery_csv_needs_its_columns(self):
        with self.assertRaisesRegex(sync.SyncError, 'lacks columns'):
            sync.bigquery_rows('capability_id,feature_name\nx,y\n')


class Wording(unittest.TestCase):
    def test_links_evidence_and_internal_terms_are_removed(self):
        text = '[Buckets][buckets]; upstream lists globally; fork filters ownership; source evidence; [host]'
        self.assertEqual(sync.polish('gcs', text), 'fake-gcs-server lists globally; LocalCloud filters ownership.')

    def test_nothing_left_means_no_note(self):
        self.assertEqual(sync.polish('gcs', '[Routes][routes]; source evidence'), '')

    def test_sentences_are_split_and_capitalized(self):
        self.assertEqual(sync.polish('spanner', 'Requires --data_dir. Snapshots are full copies; inherited from upstream v1.5.57'),
                         'Requires --data_dir; Snapshots are full copies.')

    def test_leaks_are_caught_before_anything_is_written(self):
        with self.assertRaisesRegex(sync.SyncError, 'internal wording'):
            sync.check_wording('gcs', [{'id': 'x', 'notes': 'See github.com/org/repo for details.'}])
        with self.assertRaisesRegex(sync.SyncError, 'internal wording'):
            sync.check_wording('gcs', [{'id': 'x', 'notes': 'Tested by TestHmacSigning.'}])


class Assembly(unittest.TestCase):
    def raw(self, name, local='available', other='unavailable', area='Area', **extra):
        return dict(name=name, area=area, local=local, other=other, note='', **extra)

    def test_ids_are_stable_slugs_and_collisions_are_numbered(self):
        rows, _ = sync.assemble('spanner', [self.raw('ARRAY type'), self.raw('ARRAY type'), self.raw('Other')])
        self.assertEqual([r['id'] for r in rows], ['spanner-area-array-type', 'spanner-area-array-type-2', 'spanner-area-other'])

    def test_document_ids_must_be_unique(self):
        with self.assertRaisesRegex(sync.SyncError, 'repeats the row ID'):
            sync.assemble('gcs', [self.raw('A', id='B01'), self.raw('B', id='B01')])

    def test_unassessed_localcloud_rows_stay_out_of_the_published_inventory(self):
        rows, hidden = sync.assemble('spanner', [self.raw('Known'), self.raw('Unassessed', local='unknown')])
        self.assertEqual([r['name'] for r in rows], ['Known'])
        self.assertEqual(hidden['unassessed'], 1)

    def test_bigquery_features_listed_twice_with_the_same_result_appear_once(self):
        rows, hidden = sync.assemble('bigquery', [
            self.raw('EXTERNAL_QUERY()', id='metadata.advanced.external-query'),
            self.raw('EXTERNAL_QUERY', id='sql.function.external-query'),
            self.raw('CASE', id='sql.script.case', other='available'),
            self.raw('CASE', id='sql.expression.case', other='unknown'),
        ])
        self.assertEqual([r['id'] for r in rows], ['sql.function.external-query', 'sql.script.case', 'sql.expression.case'])
        self.assertEqual(hidden['repeated'], 1)

    def test_other_services_keep_same_named_rows(self):
        rows, hidden = sync.assemble('spanner', [self.raw('Same', area='A'), self.raw('Same', area='B')])
        self.assertEqual(len(rows), 2)
        self.assertEqual(hidden['repeated'], 0)

    def test_summary_counts_only_explicit_baseline_gaps(self):
        rows, _ = sync.assemble('spanner', [
            self.raw('gap'), self.raw('no effect', other='no-effect'), self.raw('unassessed', other='unknown'),
            self.raw('scoped', local='limited'), self.raw('broader', other='limited'), self.raw('shared', other='available')])
        self.assertEqual(sync.summarize(rows), {'total': 6, 'exclusive': 2, 'broader': 1, 'hasCompetitor': True})

    def test_notes_are_shown_only_for_the_results_a_service_allows(self):
        rows, _ = sync.assemble('bigquery', [dict(self.raw('Works'), note='Internal detail.'), dict(self.raw('Limited', local='limited'), note='Nested fields are refused.')])
        self.assertEqual([r['notes'] for r in rows], ['', 'Nested fields are refused.'])


if __name__ == '__main__':
    unittest.main()
