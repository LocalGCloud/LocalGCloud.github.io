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
    scope: 'Generative ML requires a configured provider. Unassessed competitor behavior never counts as a missing feature.',
  },
] as const;

export const emulatorComparisons = definitions.map(definition => {
  const key = `./emulator-comparisons/${definition.id}.json`;
  const rows = inventories[key] as ComparisonRow[];
  return { ...definition, ...metrics[definition.id], rows, dataUrl: assets[key] as string,
    sourcesUrl: sourceAssets[`./emulator-comparison-sources/${definition.id}.json`] as string,
    path: `/compare/emulators/${definition.slug}/`,
    areas: [...new Set(rows.map(row => row.area))],
  };
});
