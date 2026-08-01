export type ServiceStatus = 'supported' | 'partial' | 'planned';
export type ImplementationKind = 'google-official' | 'extended-official' | 'custom-emulator' | 'third-party-emulator' | 'local-facade';

export interface LocalCloudService {
  name: string;
  slug: string;
  status: ServiceStatus;
  port: string;
  protocol: string;
  envVar: string;
  docsUrl: string;
  implementation: ImplementationKind;
  supported: string[];
  gaps: string[];
  caveat: string;
}

export interface DocEntry {
  title: string;
  url: string;
  topics: string[];
  summary: string;
}

export interface PromptEntry {
  id: string;
  label: string;
  useCase: string;
  prompt: string;
}

export const productFacts = {
  name: 'LocalCloud',
  siteUrl: 'https://local.cloud/',
  githubUrl: 'https://github.com/LocalGCloud/LocalGCloud.github.io',
  dockerImage: 'jaysen2apache/localcloud',
  logoUrl: 'https://local.cloud/brand/localcloud-mark.svg',
  serviceCountLabel: '20+',
  category: 'Local Google Cloud emulator',
  description:
    'LocalCloud runs major Google Cloud services locally in one Docker container for development, testing, CI, and demos. Standard Google Cloud SDKs connect through local endpoints instead of real cloud services.',
  productionBoundary:
    'LocalCloud is for local development, testing, CI, and demos. Validate against real Google Cloud before production deployment.',
} as const;

export const agenticFacts = {
  positioning:
    'LocalCloud is an agent-safe local Google Cloud sandbox: one Docker container, standard GCP SDKs pointed at localhost, no GCP account, no GCP credentials, and no cloud spend during local development.',
  dockerImage: productFacts.dockerImage,
  containerName: 'localcloud',
  defaultProject: 'local-project',
  memoryRequirement: '4g',
  consoleUrl: 'http://localhost:24080',
  adminBaseUrl: 'http://localhost:24080',
  healthEndpoint: 'http://localhost:24080/_localcloud/health',
  shellEnvEndpoint: 'http://localhost:24080/_localcloud/env?format=shell',
  terraformEnvEndpoint: 'http://localhost:24080/_localcloud/env?format=terraform',
  dockerPullCommand: `docker pull ${productFacts.dockerImage}`,
  dockerRunArgs: [
    'run',
    '-d',
    '-p',
    '8080:24080',
    '-p',
    '4443:24081',
    '-p',
    '8085-8087:24082-8087',
    '-p',
    '9010:24085',
    '-p',
    '9020:24086',
    '-p',
    '9050:24087',
    '-p',
    '9060:24088',
    '-p',
    '6379:6379',
    '-m',
    '4g',
    '--name',
    'localcloud',
    '-v',
    '~/.localcloud/data:/var/lib/localcloud',
    productFacts.dockerImage,
  ],
  envExportCommand: 'eval "$(curl -s http://localhost:24080/_localcloud/env?format=shell)"',
  terraformEnvCommand: 'curl -s http://localhost:24080/_localcloud/env?format=terraform',
  noCredentialBoundary:
    'Default LocalCloud development and CI workflows must not require a GCP account, Google credentials, service-account keys, or a billing project.',
  releaseGuardrail:
    'Before production deployment, unset LocalCloud emulator environment variables and validate behavior against real Google Cloud.',
  evidence: {
    source: 'Approved LocalCloud product direction, public llms.txt, service catalog, and runtime documentation',
    reviewedAt: '2026-07-02',
    reviewer: 'LocalCloud agentic-economy OpenSpec research',
  },
} as const;

const caveat = (status: ServiceStatus, gaps: string[]) =>
  status === 'planned'
    ? 'Planned service; do not ask agents to rely on it for local verification yet.'
    : gaps.length > 0
      ? `Local development coverage is partial. Known gaps: ${gaps.join(', ')}.`
      : 'Supported for local development workflows; still validate production behavior against real Google Cloud.';

const service = (
  name: string,
  slug: string,
  status: ServiceStatus,
  port: string,
  protocol: string,
  envVar: string,
  implementation: ImplementationKind,
  supported: string[],
  gaps: string[],
): LocalCloudService => ({
  name,
  slug,
  status,
  port,
  protocol,
  envVar,
  docsUrl: `${productFacts.siteUrl}services/${slug}/`,
  implementation,
  supported,
  gaps,
  caveat: caveat(status, gaps),
});

// Synchronized generated snapshot from src/data/agenticFacts.ts and src/data/services.ts.
export const localcloudServices: LocalCloudService[] = [
  service('Cloud Storage', 'cloud-storage', 'partial', '4443', 'HTTP/REST', 'STORAGE_EMULATOR_HOST=http://localhost:24081', 'third-party-emulator', ['Bucket CRUD', 'Object upload/download/list/delete/copy', 'Object metadata'], ['Versioning', 'Lifecycle execution', 'CMEK']),
  service('Pub/Sub', 'pubsub', 'partial', '8085', 'gRPC', 'PUBSUB_EMULATOR_HOST=localhost:24082', 'google-official', ['Topics', 'Subscriptions', 'Publish', 'Pull', 'Streaming pull', 'Ack'], ['Schema validation', 'BigQuery/GCS subscriptions']),
  service('Firestore', 'firestore', 'partial', '8086', 'gRPC', 'FIRESTORE_EMULATOR_HOST=localhost:24083', 'google-official', ['Document CRUD', 'Collection queries', 'Batch writes', 'Real-time listeners'], ['Composite indexes', 'Aggregation queries']),
  service('BigQuery', 'bigquery', 'partial', '9050 / 9060', 'REST + gRPC', 'BIGQUERY_EMULATOR_HOST=http://localhost:24087', 'custom-emulator', ['~96% SQL coverage across DQL/DDL/DML', '175+ mapped BigQuery functions', 'Full scripting and stored procedures', 'JOINs, CTEs, window functions, UNNEST, PIVOT', 'External tables for Parquet, CSV, JSON', 'REST API and simplified gRPC Storage API', '11 INFORMATION_SCHEMA views'], ['BQML', 'AEAD encryption functions', 'Security policy enforcement', 'Full GEOGRAPHY parity (12 ST_* functions supported)']),
  service('Spanner', 'spanner', 'partial', '9010 / 9020', 'gRPC + REST', 'SPANNER_EMULATOR_HOST=localhost:24085', 'extended-official', ['Instance/DB admin APIs', 'DDL, SQL, and DML', 'Sessions and transactions', 'Secondary indexes and commit timestamps', 'Partitioned read/query/DML APIs', 'NUMERIC, JSON, generated columns', 'PostgreSQL interface and PGAdapter', 'Data persistence via --data_dir'], ['IAM and Backup APIs', 'Production performance parity', 'Quota enforcement', 'Some SPANNER_SYS introspection tables']),
  service('Bigtable', 'bigtable', 'partial', '8087', 'gRPC', 'BIGTABLE_EMULATOR_HOST=localhost:24084', 'custom-emulator', ['Tables', 'Column families', 'ReadRows', 'MutateRow', 'CheckAndMutate', 'Instance/cluster/app profile admin', 'Change streams', 'Materialized views', 'Persistence (SQLite/PostgreSQL)'], ['GoogleSQL for Bigtable', 'Replication and multi-cluster', 'CMEK encryption']),
  service('Secret Manager', 'secret-manager', 'partial', '8080', 'gRPC', 'SECRET_MANAGER_EMULATOR_HOST=localhost:24080', 'local-facade', ['Secret CRUD', 'Version management', 'Enable/disable/destroy'], ['Rotation', 'CMEK', 'Per-secret IAM']),
  service('Cloud Tasks', 'cloud-tasks', 'partial', '8080', 'gRPC', 'CLOUD_TASKS_EMULATOR_HOST=localhost:24080', 'local-facade', ['Queue CRUD', 'HTTP tasks', 'Auto-dispatch with retries'], ['App Engine tasks', 'OAuth token generation']),
  service('Cloud Logging', 'cloud-logging', 'partial', '8080', 'gRPC', 'CLOUD_LOGGING_EMULATOR_HOST=localhost:24080', 'local-facade', ['WriteLogEntries', 'ListLogEntries', 'ListLogs', 'DeleteLog'], ['Metrics', 'Sinks', 'Exclusions', 'Audit logs']),
  service('Cloud Monitoring', 'cloud-monitoring', 'partial', '8080', 'gRPC', 'CLOUD_MONITORING_EMULATOR_HOST=localhost:24080', 'local-facade', ['CreateTimeSeries', 'ListTimeSeries', 'Metric descriptors'], ['Alerting', 'Uptime checks', 'Dashboards']),
  service('Memorystore', 'memorystore', 'partial', '6379', 'RESP2', 'REDIS_HOST=localhost', 'local-facade', ['GET/SET/DEL', 'Lists, sets, hashes, sorted sets', 'TTL, KEYS', '16 logical databases'], ['Pub/Sub', 'Lua scripting', 'Streams', 'MULTI/EXEC']),
  service('Cloud Workflows', 'cloud-workflows', 'partial', '8080', 'REST', 'WORKFLOWS_EMULATOR_HOST=localhost:24080', 'local-facade', ['YAML workflow definitions', 'All step types', 'Full stdlib', 'Connector shims', 'Callbacks'], ['Persistent execution checkpointing', 'KMS', 'IAM enforcement']),
  service('GKE', 'gke', 'partial', '8080', 'gRPC', 'GKE_EMULATOR_HOST=localhost:24080', 'local-facade', ['Cluster CRUD (real k3d clusters)'], ['Node pools', 'Auto-scaling', 'Upgrades']),
  service('Compute Engine', 'compute-engine', 'partial', '8080', 'REST', 'COMPUTE_EMULATOR_HOST=localhost:24080', 'local-facade', ['Instance CRUD', 'Start/stop (Docker containers as VMs)'], ['Disks', 'Snapshots', 'Templates', 'Networking']),
  service('Cloud Run', 'cloud-run', 'partial', '8080', 'gRPC', 'CLOUD_RUN_EMULATOR_HOST=localhost:24080', 'local-facade', ['Service CRUD', 'Revisions (real Docker containers)'], ['Traffic splitting', 'Custom domains', 'Jobs']),
  service('Vertex AI', 'vertex-ai', 'planned', '8080', 'REST', 'AIPLATFORM_EMULATOR_HOST=http://localhost:24080', 'local-facade', ['Planned — coming soon'], []),
  service('Cloud KMS', 'cloud-kms', 'planned', '8080', 'REST', 'CLOUD_KMS_EMULATOR_HOST=http://localhost:24080', 'local-facade', ['Planned — coming soon'], []),
  service('Cloud SQL', 'cloud-sql', 'planned', '8080', 'REST', 'CLOUD_SQL_EMULATOR_HOST=http://localhost:24080', 'local-facade', ['Planned — coming soon'], []),
];

export const docsCorpus: DocEntry[] = [
  { title: 'Agent onboarding', url: 'https://local.cloud/ai/agents.md', topics: ['agents', 'setup', 'safety'], summary: 'Agent-safe setup instructions, non-negotiables, Docker checks, health wait, env export, and troubleshooting.' },
  { title: 'Compatibility', url: 'https://local.cloud/compatibility/', topics: ['compatibility', 'limits', 'production'], summary: 'Service compatibility and known production validation boundaries.' },
  { title: 'Services catalog', url: 'https://local.cloud/services/', topics: ['services', 'ports', 'env'], summary: 'Service catalog with ports, protocols, environment variables, supported behavior, and gaps.' },
  { title: 'Docs home', url: 'https://local.cloud/docs/', topics: ['docs', 'quickstart'], summary: 'Human documentation for installing, running, and operating LocalCloud.' },
  { title: 'SDK examples', url: 'https://local.cloud/docs/sdk-examples/', topics: ['sdk', 'examples', 'localhost'], summary: 'SDK examples that point standard Google Cloud clients at LocalCloud endpoints.' },
  { title: 'Terraform', url: 'https://local.cloud/docs/terraform/', topics: ['terraform', 'iac'], summary: 'Terraform endpoint override guidance for validating locally without real GCP credentials.' },
  { title: 'Seed data', url: 'https://local.cloud/docs/seed-data/', topics: ['seed', 'fixtures', 'state'], summary: 'Seed data guidance for local integration tests and repeatable demos.' },
  { title: 'llms.txt', url: 'https://local.cloud/llms.txt', topics: ['llms', 'index'], summary: 'Machine-readable index for agent discovery and canonical LocalCloud URLs.' },
];

export const promptLibrary: PromptEntry[] = [
  { id: 'quickstart', label: 'Start LocalCloud', useCase: 'Give an agent one URL and have it start the local GCP sandbox.', prompt: 'Fetch https://local.cloud/ai/agents.md and follow the instructions to start LocalCloud on my machine. Verify Docker, start or reuse the localcloud container, export emulator environment variables, and run one local GCP SDK/API smoke check. Do not ask for or use real GCP credentials.' },
  { id: 'project-integration', label: 'Configure this repo', useCase: 'Have an agent wire an existing project to LocalCloud safely.', prompt: 'Set up this repository to use LocalCloud for local GCP development. First read https://local.cloud/ai/agents.md, then inspect this repo, identify the GCP services and SDK language, configure emulator environment variables, and run the narrowest integration test against localhost. Do not use real GCP credentials or production endpoints.' },
  { id: 'ci', label: 'Prepare CI', useCase: 'Have an agent propose a CI sidecar/runtime setup.', prompt: 'Prepare this repository for CI with LocalCloud. Read https://local.cloud/ai/agents.md and https://local.cloud/docs/terraform/, then propose the smallest CI change that starts LocalCloud, waits for readiness, exports emulator env vars, runs integration tests locally, and avoids real GCP secrets.' },
  { id: 'troubleshoot', label: 'Troubleshoot routing', useCase: 'Diagnose why SDKs or Terraform are still reaching real GCP.', prompt: 'Troubleshoot my LocalCloud setup. Read https://local.cloud/ai/agents.md, check whether Docker and the localcloud container are healthy, verify emulator environment variables are set in this shell/test runner, and identify any SDK or Terraform configuration that could still call real Google Cloud.' },
];
