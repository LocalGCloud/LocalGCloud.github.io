import metrics from './emulator-comparisons/index.json';

export interface ComparisonRow {
  id: string; name: string; area: string; local: string; other: string;
  notes: string; source: string; line: number; default?: string;
}

const inventories = import.meta.glob('./emulator-comparisons/*.json', { eager: true, import: 'default' });
const assets = import.meta.glob('./emulator-comparisons/*.json', { eager: true, query: '?url', import: 'default' });
const sourceAssets = import.meta.glob('./emulator-comparison-sources/*.json', { eager: true, query: '?url', import: 'default' });

const definitions = [
  {
    id: 'gcs', slug: 'cloud-storage', name: 'Cloud Storage', engine: 'gcs-server-extended',
    competitor: 'fake-gcs-server', baseline: 'fsouza/fake-gcs-server · 3c29d20789f6',
    baselineUrl: 'https://github.com/fsouza/fake-gcs-server/tree/3c29d20789f6475f65d2554ad6898c4afd7124bb',
    summary: 'Test permission failures, HMAC credentials, object moves and notification recovery alongside ordinary storage operations.',
    scope: 'Compared with the community fake-gcs-server, not a Google-maintained Storage emulator. Authorization needs an external HTTP evaluator and does not cover gRPC. HMAC verification covers supported XML routes; RSA verification is absent. Moves stay within one bucket. Notification replay can duplicate delivery.',
    highlights: ['Exercise HMAC key creation, rotation and invalid-signature rejection.', 'Test project-filtered bucket listings and conditional object moves.', 'Recover queued notifications after temporary Pub/Sub outages.'],
  },
  {
    id: 'firestore', slug: 'firestore', name: 'Firestore', engine: 'firestore-go',
    competitor: 'Google Firestore emulator', baseline: 'Google documentation and pinned Java emulator 1.22.0',
    baselineUrl: 'https://docs.cloud.google.com/firestore/native/docs/emulator',
    summary: 'Exercise missing-index failures, query Explain and transaction conflicts with the extended engine profile.',
    scope: 'Engine comparison: compatibility and extended profiles are shown separately. The source calls the opt-in extended profile “production”; that is a behavior profile, not a deployment recommendation. Durable state, Admin APIs and workers require a configured Open engine; selecting the standalone profile alone does not enable them. Pinned Java observations apply to 1.22.0. Current Google TTL and PITR behavior is unassessed here. The comparison does not establish that every listed engine behavior works in a released LocalCloud image.',
    highlights: ['Catch missing composite indexes in queries, listeners and aggregations.', 'Inspect actual local query work with Explain.', 'Exercise optimistic transaction conflicts and Rules deployment workflows.'],
  },
  {
    id: 'bigtable', slug: 'bigtable', name: 'Bigtable', engine: 'Little Bigtable',
    competitor: 'Google Bigtable emulator', baseline: 'Google guide and google-cloud-go source · 3266de7c69fd',
    baselineUrl: 'https://docs.cloud.google.com/bigtable/docs/emulator',
    summary: 'Keep persistent fixtures and test resource lifecycle, recovery, restricted views, change streams and local SQL.',
    scope: 'Compared with documented Cloud SDK behavior and pinned open-source bttest code, not a newly tested Cloud SDK binary. Local change streams use one partition. IAM policies support configuration workflows without identity enforcement. SQL and materialized views have local contracts. Inventories overlap: RPCs, fields and function names are not additive independent features.',
    highlights: ['Retain row and administration state with SQLite or PostgreSQL.', 'Rehearse backups, restore, soft deletion and undelete.', 'Develop SQL queries and consumers of local change streams.'],
  },
  {
    id: 'spanner', slug: 'spanner', name: 'Spanner', engine: 'Extended Spanner emulator',
    competitor: 'Google Spanner emulator', baseline: 'Google emulator v1.5.58 · a081a7e7',
    baselineUrl: 'https://github.com/GoogleCloudPlatform/cloud-spanner-emulator/tree/a081a7e71aba5f4d05fc8c6b21ef1a269dcbac28',
    summary: 'Keep local databases, rehearse backup and recovery, enforce database-role privileges and execute graph algorithms.',
    scope: 'The detailed baseline is v1.5.58. Upstream v1.5.59 already adds queue execution, expression indexes, multi-key vector indexes and placement metadata; this table does not establish exclusive advantages over that release. Persistence and backups require --data_dir. Database-role enforcement is separate from IAM; IAM policies are stored but not enforced. Sessions and open transactions stay transient.',
    highlights: ['Keep fixtures and resume supported change streams after restart.', 'Test database-role permissions and drop protection.', 'Consume local query plans, execution statistics and graph results.'],
  },
  {
    id: 'bigquery', slug: 'bigquery', name: 'BigQuery', engine: 'BigQuery emulator on DuckDB',
    competitor: 'goccy BigQuery emulator', baseline: 'goccy · cb8555bee739 · googlesqlite v0.3.1',
    baselineUrl: 'https://github.com/goccy/bigquery-emulator/tree/cb8555bee739c794343337e8c3242b59d5d7470a',
    summary: 'Test executable ML, external tables, federation, policies, snapshots and clones alongside analytical SQL.',
    scope: 'Uses development contracts from the supplied catalog. Many goccy rows are unassessed; these never count as missing features. S, D and B identify source, documentation and backend declarations, respectively, rather than fresh emulator runs. Provider-backed ML requires a reachable compatible provider. goccy also supports substantial SQL and Storage APIs and offers Go embedding. Catalog rows vary in granularity and may overlap; there is no speed or full-parity claim.',
    highlights: ['Execute documented ML prediction and evaluation workflows locally.', 'Read external files and configured relational sources.', 'Test snapshots, clones, historical reads and policy behavior.'],
  },
] as const;

export const emulatorComparisons = definitions.map(definition => {
  const key = `./emulator-comparisons/${definition.id}.json`;
  const rows = inventories[key] as ComparisonRow[];
  return { ...definition, ...metrics[definition.id], rows, dataUrl: assets[key] as string,
    sourcesUrl: sourceAssets[`./emulator-comparison-sources/${definition.id}.json`] as string,
    path: `/compare/emulators/${definition.slug}/`,
    areas: [...new Set(rows.map(row => row.area))], reviewedAt: '2026-10-20',
  };
});
