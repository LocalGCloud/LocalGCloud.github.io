export type ServiceCategory =
  | 'storage'
  | 'databases'
  | 'analytics'
  | 'integration'
  | 'security'
  | 'operations'
  | 'compute';

export const serviceCategoryOrder: ServiceCategory[] = [
  'databases',
  'integration',
  'compute',
  'security',
  'operations',
  'storage',
  'analytics',
];

export const serviceCategoryMeta: Record<ServiceCategory, { label: string; description: string }> = {
  storage: {
    label: 'Storage',
    description: 'Buckets, blobs, and object access patterns for local file-heavy workflows.',
  },
  databases: {
    label: 'Databases',
    description: 'Transactional, document, wide-column, and cache-style data services for app backends.',
  },
  analytics: {
    label: 'Analytics',
    description: 'Warehouse-style SQL and dataset workflows for local query development.',
  },
  integration: {
    label: 'Messaging & Workflow',
    description: 'Events, background jobs, and orchestration surfaces for distributed application flows.',
  },
  security: {
    label: 'Security',
    description: 'Secret and configuration access patterns developers need during local iteration.',
  },
  operations: {
    label: 'Operations',
    description: 'Logs, metrics, and operational visibility surfaces that help teams trust local runs.',
  },
  compute: {
    label: 'Compute & Runtime',
    description: 'Container, cluster, and instance-style runtime surfaces when app flows need them.',
  },
};

export interface Service {
  name: string;
  slug: string;
  port: string;
  protocol: string;
  category: ServiceCategory;
  type: 'external' | 'facade';
  implementation: 'google-official' | 'extended-official' | 'custom-emulator' | 'third-party-emulator' | 'local-facade';
  enabled: boolean;
  envVar: string;
  description: string;
  supported: string[];
  notSupported: string[];
  iconId: string;
}

export const services: Service[] = [
  {
    name: 'Cloud Storage',
    slug: 'cloud-storage',
    port: '4443',
    protocol: 'HTTP/REST',
    category: 'storage',
    type: 'external',
    implementation: 'third-party-emulator',
    enabled: true,
    envVar: 'STORAGE_EMULATOR_HOST=http://localhost:4443',
    description: 'Object storage for buckets, blobs, and local file workflows.',
    supported: ['Bucket CRUD', 'Object upload/download/list/delete/copy', 'Object metadata'],
    notSupported: ['Versioning', 'Lifecycle execution', 'CMEK'],
    iconId: 'gcs',
  },
  {
    name: 'Pub/Sub',
    slug: 'pubsub',
    port: '8085',
    protocol: 'gRPC',
    category: 'integration',
    type: 'external',
    implementation: 'google-official',
    enabled: true,
    envVar: 'PUBSUB_EMULATOR_HOST=localhost:8085',
    description: 'Messaging and event streaming for async, fan-out, and queue-driven flows.',
    supported: ['Topics', 'Subscriptions', 'Publish', 'Pull', 'Streaming pull', 'Ack'],
    notSupported: ['Schema validation', 'BigQuery/GCS subscriptions'],
    iconId: 'pubsub',
  },
  {
    name: 'Firestore',
    slug: 'firestore',
    port: '8086',
    protocol: 'gRPC',
    category: 'databases',
    type: 'external',
    implementation: 'google-official',
    enabled: true,
    envVar: 'FIRESTORE_EMULATOR_HOST=localhost:8086',
    description: 'Document database for app state, user data, and event-driven backends.',
    supported: ['Document CRUD', 'Collection queries', 'Batch writes', 'Real-time listeners'],
    notSupported: ['Composite indexes', 'Aggregation queries'],
    iconId: 'firestore',
  },
  {
    name: 'BigQuery',
    slug: 'bigquery',
    port: '9050 / 9060',
    protocol: 'REST + gRPC',
    category: 'analytics',
    type: 'external',
    implementation: 'custom-emulator',
    enabled: true,
    envVar: 'BIGQUERY_EMULATOR_HOST=http://localhost:9050',
    description: 'Warehouse-style SQL analytics for datasets, tables, and local query development.',
    supported: ['~96% SQL coverage across DQL/DDL/DML', '175+ mapped BigQuery functions', 'Full scripting and stored procedures', 'JOINs, CTEs, window functions, UNNEST, PIVOT', 'External tables for Parquet, CSV, JSON', 'REST API and simplified gRPC Storage API', '11 INFORMATION_SCHEMA views'],
    notSupported: ['BQML', 'AEAD encryption functions', 'Security policy enforcement', 'Full GEOGRAPHY parity (12 ST_* functions supported)'],
    iconId: 'bigquery',
  },
  {
    name: 'Spanner',
    slug: 'spanner',
    port: '9010 / 9020',
    protocol: 'gRPC + REST',
    category: 'databases',
    type: 'external',
    implementation: 'extended-official',
    enabled: true,
    envVar: 'SPANNER_EMULATOR_HOST=localhost:9010',
    description: 'Relational database surface for strongly consistent SQL and transactional workloads.',
    supported: ['Instance/DB admin APIs', 'DDL, SQL, and DML', 'Sessions and transactions', 'Secondary indexes and commit timestamps', 'Partitioned read/query/DML APIs', 'NUMERIC, JSON, generated columns', 'PostgreSQL interface and PGAdapter', 'Data persistence via --data_dir'],
    notSupported: ['IAM and Backup APIs', 'Production performance parity', 'Quota enforcement', 'Some SPANNER_SYS introspection tables'],
    iconId: 'spanner',
  },
  {
    name: 'Bigtable',
    slug: 'bigtable',
    port: '8087',
    protocol: 'gRPC',
    category: 'databases',
    type: 'external',
    implementation: 'custom-emulator',
    enabled: true,
    envVar: 'BIGTABLE_EMULATOR_HOST=localhost:8087',
    description: 'Wide-column store for large key ranges, event streams, and time-series workloads.',
    supported: ['Tables', 'Column families', 'ReadRows', 'MutateRow', 'CheckAndMutate', 'Instance/cluster/app profile admin', 'Change streams', 'Materialized views', 'Persistence (SQLite/PostgreSQL)'],
    notSupported: ['GoogleSQL for Bigtable', 'Replication and multi-cluster', 'CMEK encryption'],
    iconId: 'bigtable',
  },
  {
    name: 'Secret Manager',
    slug: 'secret-manager',
    port: '8080',
    protocol: 'gRPC',
    category: 'security',
    type: 'facade',
    implementation: 'local-facade',
    enabled: true,
    envVar: 'SECRET_MANAGER_EMULATOR_HOST=localhost:8080',
    description: 'Secret storage and version access for local credential and configuration flows.',
    supported: ['Secret CRUD', 'Version management', 'Enable/disable/destroy'],
    notSupported: ['Rotation', 'CMEK', 'Per-secret IAM'],
    iconId: 'secretmanager',
  },
  {
    name: 'Cloud Tasks',
    slug: 'cloud-tasks',
    port: '8080',
    protocol: 'gRPC',
    category: 'integration',
    type: 'facade',
    implementation: 'local-facade',
    enabled: true,
    envVar: 'CLOUD_TASKS_EMULATOR_HOST=localhost:8080',
    description: 'Managed task queue behavior for background jobs and HTTP dispatch workflows.',
    supported: ['Queue CRUD', 'HTTP tasks', 'Auto-dispatch with retries'],
    notSupported: ['App Engine tasks', 'OAuth token generation'],
    iconId: 'cloudtasks',
  },
  {
    name: 'Cloud Logging',
    slug: 'cloud-logging',
    port: '8080',
    protocol: 'gRPC',
    category: 'operations',
    type: 'facade',
    implementation: 'local-facade',
    enabled: true,
    envVar: 'CLOUD_LOGGING_EMULATOR_HOST=localhost:8080',
    description: 'Centralized log ingestion and query-friendly local observability.',
    supported: ['WriteLogEntries', 'ListLogEntries', 'ListLogs', 'DeleteLog'],
    notSupported: ['Metrics', 'Sinks', 'Exclusions', 'Audit logs'],
    iconId: 'logging',
  },
  {
    name: 'Cloud Monitoring',
    slug: 'cloud-monitoring',
    port: '8080',
    protocol: 'gRPC',
    category: 'operations',
    type: 'facade',
    implementation: 'local-facade',
    enabled: true,
    envVar: 'CLOUD_MONITORING_EMULATOR_HOST=localhost:8080',
    description: 'Metrics ingestion and local monitoring flows for app health and instrumentation.',
    supported: ['CreateTimeSeries', 'ListTimeSeries', 'Metric descriptors'],
    notSupported: ['Alerting', 'Uptime checks', 'Dashboards'],
    iconId: 'monitoring',
  },
  {
    name: 'Memorystore',
    slug: 'memorystore',
    port: '6379',
    protocol: 'RESP2',
    category: 'databases',
    type: 'facade',
    implementation: 'local-facade',
    enabled: true,
    envVar: 'REDIS_HOST=localhost',
    description: 'Redis-compatible cache and low-latency data surface for local development.',
    supported: ['GET/SET/DEL', 'Lists, sets, hashes, sorted sets', 'TTL, KEYS', '16 logical databases'],
    notSupported: ['Pub/Sub', 'Lua scripting', 'Streams', 'MULTI/EXEC'],
    iconId: 'memorystore',
  },
  {
    name: 'Cloud Workflows',
    slug: 'cloud-workflows',
    port: '8080',
    protocol: 'REST',
    category: 'integration',
    type: 'facade',
    implementation: 'local-facade',
    enabled: true,
    envVar: 'WORKFLOWS_EMULATOR_HOST=localhost:8080',
    description: 'Workflow orchestration for multi-step service calls and long-running flows.',
    supported: ['YAML workflow definitions', 'All step types', 'Full stdlib', 'Connector shims', 'Callbacks'],
    notSupported: ['Persistent execution checkpointing', 'KMS', 'IAM enforcement'],
    iconId: 'workflows',
  },
  {
    name: 'GKE',
    slug: 'gke',
    port: '8080',
    protocol: 'gRPC',
    category: 'compute',
    type: 'facade',
    implementation: 'local-facade',
    enabled: false,
    envVar: 'GKE_EMULATOR_HOST=localhost:8080',
    description: 'Cluster-oriented runtime surface for Kubernetes-style local testing.',
    supported: ['Cluster CRUD (real k3d clusters)'],
    notSupported: ['Node pools', 'Auto-scaling', 'Upgrades'],
    iconId: 'gke',
  },
  {
    name: 'Compute Engine',
    slug: 'compute-engine',
    port: '8080',
    protocol: 'REST',
    category: 'compute',
    type: 'facade',
    implementation: 'local-facade',
    enabled: false,
    envVar: 'COMPUTE_EMULATOR_HOST=localhost:8080',
    description: 'VM-like runtime surface for instance-based local workflows.',
    supported: ['Instance CRUD', 'Start/stop (Docker containers as VMs)'],
    notSupported: ['Disks', 'Snapshots', 'Templates', 'Networking'],
    iconId: 'compute',
  },
  {
    name: 'Cloud Run',
    slug: 'cloud-run',
    port: '8080',
    protocol: 'gRPC',
    category: 'compute',
    type: 'facade',
    implementation: 'local-facade',
    enabled: false,
    envVar: 'CLOUD_RUN_EMULATOR_HOST=localhost:8080',
    description: 'Serverless container runtime behavior for local service deployment flows.',
    supported: ['Service CRUD', 'Revisions (real Docker containers)'],
    notSupported: ['Traffic splitting', 'Custom domains', 'Jobs'],
    iconId: 'cloudrun',
  },
  {
    name: 'Vertex AI',
    slug: 'vertex-ai',
    port: '8080',
    protocol: 'REST',
    category: 'compute',
    type: 'facade',
    implementation: 'local-facade',
    enabled: false,
    envVar: 'AIPLATFORM_EMULATOR_HOST=http://localhost:8080',
    description: 'AI/ML platform service for local model training, prediction, and Vertex AI workflow testing.',
    supported: ['Planned — coming soon'],
    notSupported: [],
    iconId: 'vertexai',
  },
  {
    name: 'Cloud KMS',
    slug: 'cloud-kms',
    port: '8080',
    protocol: 'REST',
    category: 'security',
    type: 'facade',
    implementation: 'local-facade',
    enabled: false,
    envVar: 'CLOUD_KMS_EMULATOR_HOST=http://localhost:8080',
    description: 'Key management service for local cryptographic key and encryption workflow testing.',
    supported: ['Planned — coming soon'],
    notSupported: [],
    iconId: 'kms',
  },
  {
    name: 'Cloud SQL',
    slug: 'cloud-sql',
    port: '8080',
    protocol: 'REST',
    category: 'databases',
    type: 'facade',
    implementation: 'local-facade',
    enabled: false,
    envVar: 'CLOUD_SQL_EMULATOR_HOST=http://localhost:8080',
    description: 'Managed relational database service for local Cloud SQL API workflow testing.',
    supported: ['Planned — coming soon'],
    notSupported: [],
    iconId: 'cloudsql',
  },
];

export function getServiceImplementationLabel(service: Service): string {
  switch (service.implementation) {
    case 'google-official':
      return 'Google Official';
    case 'extended-official':
      return 'Extended Official';
    case 'custom-emulator':
      return 'Custom Emulator';
    case 'third-party-emulator':
      return 'Third-Party Emulator';
    case 'local-facade':
      return 'Local Facade';
  }
}

export function getServiceImplementationNote(service: Service): string {
  switch (service.implementation) {
    case 'google-official':
      return 'Backed by a Google-provided emulator process.';
    case 'extended-official':
      return 'Backed by an extended emulator path built around the official Spanner emulator.';
    case 'custom-emulator':
      return 'Backed by a custom LocalCloud-managed emulator implementation.';
    case 'third-party-emulator':
      return 'Backed by a third-party emulator process integrated into LocalCloud.';
    case 'local-facade':
      return 'Implemented inside LocalCloud as a facade for local development.';
  }
}

export function getServiceCategoryLabel(service: Service): string {
  return serviceCategoryMeta[service.category].label;
}
