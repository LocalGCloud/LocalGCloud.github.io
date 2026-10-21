import indexed from './emulator-comparisons/index.json';

const metrics = indexed as Record<string, { total: number; exclusive: number; broader: number; hasCompetitor: boolean }>;

// Visitor-facing rows written by scripts/sync-emulator-comparisons.py. `other` is absent for services
// whose comparison document has no competitor column (then `hasCompetitor` is false and the competitor
// details below stay unused); `default` only where a second profile exists.
export interface ComparisonRow {
  id: string; name: string; area: string; local: string; other?: string; default?: string; notes: string;
}
interface ComparisonDefinition {
  id: string; slug: string; name: string; engine: string; competitor?: string; baseline: string; baselineUrl: string;
  summary: string; scope: string;
}

const inventories = import.meta.glob('./emulator-comparisons/*.json', { eager: true, import: 'default' });
const assets = import.meta.glob('./emulator-comparisons/*.json', { eager: true, query: '?url', import: 'default' });

const definitions: ComparisonDefinition[] = [
  {
    id: 'gcs', slug: 'cloud-storage', name: 'Cloud Storage', engine: 'LocalCloud GCS',
    competitor: 'fake-gcs-server', baseline: 'fake-gcs-server',
    baselineUrl: 'https://github.com/fsouza/fake-gcs-server/tree/3c29d20789f6475f65d2554ad6898c4afd7124bb',
    summary: 'Test permissions, HMAC credentials, object moves and notification recovery.',
    scope: 'Permission checks require an HTTP authorization callback. HMAC verification covers supported XML routes; moves stay within one bucket.',
  },
  {
    id: 'firestore', slug: 'firestore', name: 'Firestore', engine: 'LocalCloud Firestore',
    competitor: 'Google Firestore emulator', baseline: 'Google Firestore emulator · Java 1.22.0',
    baselineUrl: 'https://docs.cloud.google.com/firestore/native/docs/emulator',
    summary: 'Test missing-index failures, query Explain and optimistic transaction conflicts.',
    scope: 'Extended-profile features need their documented configuration. Persistence and Admin APIs require a configured engine, not just a CLI profile switch.',
  },
  {
    id: 'bigtable', slug: 'bigtable', name: 'Bigtable', engine: 'LocalCloud Bigtable',
    competitor: 'Google Bigtable emulator', baseline: 'Google Bigtable emulator',
    baselineUrl: 'https://docs.cloud.google.com/bigtable/docs/emulator',
    summary: 'Keep persistent data and test backups, restricted views, change streams and SQL.',
    scope: 'Change streams use one local partition. IAM policies manage configuration without enforcing identity.',
  },
  {
    id: 'spanner', slug: 'spanner', name: 'Spanner', engine: 'LocalCloud Spanner',
    competitor: 'Google Spanner emulator', baseline: 'Google Spanner emulator v1.5.58',
    baselineUrl: 'https://github.com/GoogleCloudPlatform/cloud-spanner-emulator/tree/a081a7e71aba5f4d05fc8c6b21ef1a269dcbac28',
    summary: 'Persist databases, test backup recovery and database roles, and execute graph algorithms.',
    scope: 'This comparison uses v1.5.58. Persistence and backups require --data_dir. Database roles enforce privileges; IAM policies do not.',
  },
  {
    id: 'bigquery', slug: 'bigquery', name: 'BigQuery', engine: 'LocalCloud BigQuery',
    competitor: 'goccy BigQuery emulator', baseline: 'goccy BigQuery emulator',
    baselineUrl: 'https://github.com/goccy/bigquery-emulator/tree/cb8555bee739c794343337e8c3242b59d5d7470a',
    summary: 'Run ML, external tables, federation, policies, snapshots and clones alongside SQL.',
    scope: 'Generative ML requires a configured provider. Competitor results come from its documentation, source or backend declarations, not new test runs, and unassessed behavior never counts as a missing feature.',
  },
];

export const emulatorComparisons = definitions.map(definition => {
  const key = `./emulator-comparisons/${definition.id}.json`;
  const rows = inventories[key] as ComparisonRow[];
  return { ...definition, ...metrics[definition.id], rows, dataUrl: assets[key] as string,
    path: `/compare/emulators/${definition.slug}/`,
    workspacePath: `/compare/emulators/?service=${definition.slug}`,
    areas: [...new Set(rows.map(row => row.area))],
  };
});
