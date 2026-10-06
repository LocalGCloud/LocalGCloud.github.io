import type { DocumentationServiceContract } from './docs-contract.ts';

export type ServiceCategory =
  | 'storage'
  | 'databases'
  | 'analytics'
  | 'integration'
  | 'security'
  | 'operations'
  | 'compute'
  | 'auxiliary';

export interface ServiceEditorial {
  slug: string;
  category: ServiceCategory;
  iconId: string;
  description: string;
}

const editorial = {
  gcs: { slug: 'cloud-storage', category: 'storage', iconId: 'gcs', description: 'Bucket and object lifecycle workflows for local SDK and API development.' },
  pubsub: { slug: 'pubsub', category: 'integration', iconId: 'pubsub', description: 'Topic, subscription, publish, pull, and acknowledgement workflows.' },
  firestore: { slug: 'firestore', category: 'databases', iconId: 'firestore', description: 'Document CRUD, query, and collection workflows; opt-in to save memory.' },
  bigtable: { slug: 'bigtable', category: 'databases', iconId: 'bigtable', description: 'Row mutation, read, table administration, and PostgreSQL-backed data workflows.' },
  spanner: { slug: 'spanner', category: 'databases', iconId: 'spanner', description: 'Spanner data and administration workflows over gRPC and REST.' },
  bigquery: { slug: 'bigquery', category: 'analytics', iconId: 'bigquery', description: 'Dataset, table, query, scripting, and API workflows.' },
  sheets: { slug: 'google-sheets', category: 'auxiliary', iconId: 'sheets', description: 'Auxiliary read-only values lookup API for BigQuery external tables and fixture seeding, selected by exact A1 range.' },
  secretmanager: { slug: 'secret-manager', category: 'security', iconId: 'secretmanager', description: 'Secret and version lifecycle workflows for local development.' },
  cloudtasks: { slug: 'cloud-tasks', category: 'integration', iconId: 'cloudtasks', description: 'Queue and task lifecycle workflows.' },
  cloudscheduler: { slug: 'cloud-scheduler', category: 'integration', iconId: 'cloudscheduler', description: 'Schedule and job lifecycle workflows.' },
  cloudfunctions: { slug: 'cloud-functions', category: 'compute', iconId: 'cloudfunctions', description: 'Second-generation function control-plane workflows.' },
  alloydb: { slug: 'alloydb', category: 'databases', iconId: 'alloydb', description: 'AlloyDB cluster and instance control-plane workflows.' },
  dataproc: { slug: 'dataproc', category: 'analytics', iconId: 'dataproc', description: 'Dataproc cluster and job workflows in serverless and cluster modes with Docker execution.' },
  cloudiam: { slug: 'cloud-iam', category: 'security', iconId: 'cloudiam', description: 'IAM policy API workflows for local development.' },
  cloudresourcemanager: { slug: 'cloud-resource-manager', category: 'operations', iconId: 'cloudresourcemanager', description: 'Project lifecycle workflows for local development.' },
  serviceusage: { slug: 'service-usage', category: 'operations', iconId: 'serviceusage', description: 'Service enablement and metadata workflows.' },
  cloudbilling: { slug: 'cloud-billing', category: 'operations', iconId: 'cloudbilling', description: 'Billing-account, budget, and cost metadata workflows.' },
  logging: { slug: 'cloud-logging', category: 'operations', iconId: 'logging', description: 'Log ingestion, listing, metrics, and sink workflows.' },
  monitoring: { slug: 'cloud-monitoring', category: 'operations', iconId: 'monitoring', description: 'Time-series, metric-descriptor, alerting, and dashboard workflows.' },
  gke: { slug: 'gke', category: 'compute', iconId: 'gke', description: 'Cluster workflows with opt-in k3d runtime integration.' },
  compute: { slug: 'compute-engine', category: 'compute', iconId: 'compute', description: "Compute Engine doesn't run in LocalCloud; use Google Cloud for VM workloads." },
  cloudrun: { slug: 'cloud-run', category: 'compute', iconId: 'cloudrun', description: 'Service and revision workflows with host-runtime integration.' },
  memorystore: { slug: 'memorystore', category: 'databases', iconId: 'memorystore', description: 'Valkey-backed RESP data workflows.' },
  workflows: { slug: 'cloud-workflows', category: 'integration', iconId: 'workflows', description: 'Workflow deployment and execution workflows.' },
  vertexai: { slug: 'vertex-ai', category: 'compute', iconId: 'vertexai', description: "Vertex AI doesn't run in LocalCloud; use Google Cloud for inference and training." },
  kms: { slug: 'cloud-kms', category: 'security', iconId: 'kms', description: 'Key-management and cryptographic workflows.' },
  cloudsql: { slug: 'cloud-sql', category: 'databases', iconId: 'cloudsql', description: 'Local control-plane and MySQL data-plane workflows.' },
} as const satisfies Record<string, ServiceEditorial>;

// Compatibility summaries reference upstream operation IDs so verification can
// reject stale claims and require editorial review when capabilities change.
export interface ServiceCompatibilityEditorial {
  capabilities: { operations: string[]; summary: string }[];
  boundaries: string[];
}

export const serviceCompatibilityEditorial: Readonly<Record<string, ServiceCompatibilityEditorial>> = {
  gcs: {
    capabilities: [
      { operations: ["gcs.buckets.lifecycle", "gcs.objects.lifecycle"], summary: "Bucket CRUD; object upload, download, listing, and deletion" },
      { operations: ["gcs.bucket-iam", "gcs.object-iam"], summary: "Bucket IAM and mode-aware object authorization" },
      { operations: ["gcs.notifications"], summary: "Object event delivery to local Pub/Sub topics" },
      { operations: ["gcs.hmac"], summary: "HMAC keys and signed XML requests" },
    ],
    boundaries: [
      "No bucket versioning, archive events, or managed folders",
      "No lifecycle scheduling or retention enforcement",
      "Notifications need precreated Pub/Sub topics",
      "No event ordering or atomic object/event delivery guarantees",
    ],
  },
  pubsub: {
    capabilities: [
      { operations: ["pubsub.topics.lifecycle", "pubsub.subscriptions.lifecycle", "pubsub.message.workflow"], summary: "Topics, subscriptions, push/pull, StreamingPull, and acknowledgements" },
      { operations: ["pubsub.delivery-policies"], summary: "Attribute filters, dead-letter forwarding, and retries" },
      { operations: ["pubsub.snapshots-replay"], summary: "Retention, snapshots, and timestamp/snapshot seek" },
      { operations: ["pubsub.schemas"], summary: "Avro/Protobuf schemas, revisions, and JSON/binary validation" },
    ],
    boundaries: [
      "No exactly-once delivery, authenticated push, exports, or transforms",
      "Approximate local retry and retention schedules",
      "Stored IAM bindings do not enforce publish or topic deletion",
    ],
  },
  firestore: {
    capabilities: [
      { operations: ["firestore.documents.crud"], summary: "Document CRUD" },
      { operations: ["firestore.queries.indexes"], summary: "Queries and single-field indexes" },
    ],
    boundaries: [
      "Opt-in: add firestore to localcloud start --services",
      "Validate composite indexes, concurrent transactions, listeners, and transforms",
      "Security Rules and Firestore triggers need runtime validation",
    ],
  },
  bigtable: {
    capabilities: [
      { operations: ["bigtable.admin.lifecycle", "bigtable.safety.forward-compat"], summary: "Instances, clusters, tables, families, app profiles, and schema bundles" },
      { operations: ["bigtable.rows.data"], summary: "Atomic mutations, row filters including Sink, aggregates, and read sessions" },
      { operations: ["bigtable.query.googlesql", "bigtable.materialized-views"], summary: "Prepared GoogleSQL, logical views, and continuous materialized views" },
      { operations: ["bigtable.change-streams"], summary: "Change streams" },
      { operations: ["bigtable.snapshots-backups", "bigtable.persistence"], summary: "Data-bearing backups, copy/restore, and seven-day table undelete" },
      { operations: ["bigtable.iam", "bigtable.cli.cbt", "bigtable.browser.console"], summary: "IAM policy storage, cbt, and Console browsing" },
    ],
    boundaries: [
      "Sink preserves cells past later filters; invalid inside a Condition",
      "Verify backup listing and project deletion through the native admin API",
      "Validate Sink filters, PostgreSQL-backed durability, and cbt scripts in your own test suite",
      "Delete owned backups and clear resource deletion protection before instance or project deletion",
      "Failed project cleanup keeps the project record; confirm deletion through the native admin API",
      "Native backup listing supports filter/order/pagination; REST ignores those options",
      "Confirm writes through the native API; the Console view may not surface rejected writes",
      "Permissive IAM; one change-stream partition",
      "No query statistics, view parameters, or legacy snapshot RPCs",
      "Local encodings for HLL++ bytes and multi-column view keys",
    ],
  },
  spanner: {
    capabilities: [
      { operations: ["spanner.data-plane"], summary: "GoogleSQL/PostgreSQL queries, UUIDs, and change streams" },
      { operations: ["spanner.data-plane"], summary: "Full-text/vector search, property graphs, and graph algorithms" },
      { operations: ["spanner.sessions-transactions"], summary: "Sessions, serializable/repeatable-read transactions, and batch DML" },
      { operations: ["spanner.partition-batch"], summary: "Partitioned queries/reads and batch writes" },
      { operations: ["spanner.instance-admin", "spanner.database-admin", "spanner.operations"], summary: "Instance/database administration, DDL, and long-running operations" },
      { operations: ["spanner.iam"], summary: "Database roles and fine-grained access control" },
      { operations: ["spanner.backup"], summary: "Backup creation, copy, restore, and schedules" },
    ],
    boundaries: [
      "Change streams require streaming SQL",
      "Backups and durable stream recovery require a persistent data directory",
      "Unauthenticated emulator connections bypass network IAM",
      "No CMEK; Google TrueTime and regional infrastructure are cloud-only",
    ],
  },
  bigquery: {
    capabilities: [
      { operations: ["bigquery.datasets.lifecycle", "bigquery.tables.lifecycle"], summary: "Datasets, tables, clones, and time travel" },
      { operations: ["bigquery.tables.lifecycle"], summary: "Row access policies, top-level policy tags, and masking" },
      { operations: ["bigquery.sql.query"], summary: "Joins, window functions, CTEs, PIVOT/UNPIVOT, and MERGE" },
      { operations: ["bigquery.sql.scripting"], summary: "Procedural scripts, stored procedures, and dynamic SQL" },
      { operations: ["bigquery.jobs.lifecycle"], summary: "Jobs, dry runs, scheduled queries, and selected ML models" },
      { operations: ["bigquery.materialized-views", "bigquery.information-schema"], summary: "Materialized views and INFORMATION_SCHEMA" },
      { operations: ["bigquery.external-tables"], summary: "Emulated GCS: CSV, JSONL, Parquet, Avro, ORC; EXTERNAL_QUERY" },
      { operations: ["bigquery.storage-api"], summary: "gRPC Storage Read/Write with Avro and Arrow" },
    ],
    boundaries: [
      "Function/input-specific SQL limits; check the feature matrix",
      "No ingestion-time partitioning or nested policy tags",
      "No native Bigtable, Sheets, HTTP, or local-file external sources",
      "Model, ML transform, and geography input limits",
      "Managed reservations, production IAM, and fleet scale are cloud-only",
    ],
  },
  sheets: {
    capabilities: [
      { operations: ["sheets.values.get", "sheets.values.batch-get"], summary: "Exact A1-range reads: values.get and values.batchGet" },
    ],
    boundaries: [
      "Read-only auxiliary fixture API",
      "No spreadsheet metadata, writes, range slicing, or formulas",
      "No Google OAuth authority",
    ],
  },
  secretmanager: {
    capabilities: [
      { operations: ["secretmanager.secrets.lifecycle"], summary: "Secret CRUD" },
      { operations: ["secretmanager.versions.lifecycle"], summary: "Version add/access/list/enable/disable/destroy" },
      { operations: ["secretmanager.advanced-secret-management"], summary: "SOFTWARE CMEK encryption and per-secret IAM policy APIs" },
    ],
    boundaries: [
      "No automatic rotation notifications or topic delivery",
      "Authorization varies by transport and IAM mode",
      "Hardware key custody and geographic replication are cloud-only",
    ],
  },
  cloudtasks: {
    capabilities: [
      { operations: ["cloudtasks.queues.lifecycle"], summary: "Queue lifecycle, pause/resume, and purge" },
      { operations: ["cloudtasks.tasks.lifecycle"], summary: "Task CRUD and manual/automatic HTTP dispatch" },
      { operations: ["cloudtasks.tasks.lifecycle"], summary: "Rate/concurrency limits, deadlines, retries, and attempt history" },
    ],
    boundaries: [
      "No OAuth/OIDC, App Engine delivery, or routing/header overrides",
      "No logging sampling",
      "Restart may redeliver; pause/purge/delete cannot cancel in-flight requests",
      "Check attempt history before replaying ambiguous requests",
    ],
  },
  cloudscheduler: {
    capabilities: [
      { operations: ["cloudscheduler.jobs.lifecycle"], summary: "Job CRUD, pause/resume, and manual runs" },
      { operations: ["cloudscheduler.jobs.lifecycle"], summary: "Timezone-aware cron and schedule previews" },
      { operations: ["cloudscheduler.jobs.lifecycle"], summary: "HTTP/Pub/Sub delivery, retries, deadlines, and attempt history" },
    ],
    boundaries: [
      "No App Engine targets or OAuth/OIDC credentials",
      "No interrupted-attempt replay or downtime backfill",
      "Stored policies do not enforce per-job authorization",
    ],
  },
  cloudfunctions: {
    capabilities: [
      { operations: ["cloudfunctions.functions.metadata"], summary: "Second-generation function metadata CRUD" },
      { operations: ["cloudfunctions.functions.metadata"], summary: "HTTP forwarding and Pub/Sub trigger routing" },
    ],
    boundaries: [
      "Requires your own execution target",
      "No source builds or managed function containers",
      "No Firestore/Storage/Audit Log Eventarc triggers or Google identity tokens",
    ],
  },
  alloydb: {
    capabilities: [
      { operations: ["alloydb.cluster-instance.lifecycle"], summary: "Cluster/instance CRUD and local PostgreSQL access" },
      { operations: ["alloydb.clusters-instances.maintenance"], summary: "Configuration patching, flag discovery, and backup metadata restore" },
    ],
    boundaries: [
      "Backup restore covers metadata",
      "No advanced AlloyDB engine behavior or replicas",
      "Managed regional failover is cloud-only",
    ],
  },
  dataproc: {
    capabilities: [
      { operations: ["dataproc.clusters.crud"], summary: "Local cluster lifecycle" },
      { operations: ["dataproc.jobs.execution"], summary: "Spark/Hadoop execution in cluster and serverless modes" },
    ],
    boundaries: [
      "Requires Docker daemon access",
      "Cloud scaling, automated node repair, and production SLAs are cloud-only",
    ],
  },
  cloudiam: {
    capabilities: [
      { operations: ["cloudiam.policies.permissions"], summary: "Allow policies, permission checks, supported conditions, and project inheritance" },
      { operations: ["cloudiam.custom-roles.lifecycle"], summary: "Custom roles and grantable-role queries" },
      { operations: ["cloudiam.service-accounts.management"], summary: "Service-account metadata, key enable/disable, and testable-permission queries" },
    ],
    boundaries: [
      "Enforcement varies by service, transport, and IAM mode",
      "Open/permissive probes do not establish enforced access",
      "No full CEL, organization/folder ancestry, or deny policies",
      "No federation or enterprise identity integrations",
    ],
  },
  cloudresourcemanager: {
    capabilities: [
      { operations: ["cloudresourcemanager.projects.lifecycle"], summary: "Project CRUD through v1/v3 APIs; completed operation polling" },
      { operations: ["cloudresourcemanager.projects.lifecycle"], summary: "Project auto-registration on supported entry points outside strict mode" },
    ],
    boundaries: [
      "No organization/folder lifecycle, moves, search, or full ancestry",
      "No project auto-registration on direct emulator listeners",
    ],
  },
  serviceusage: {
    capabilities: [
      { operations: ["serviceusage.services.enablement"], summary: "Service list/get/enable/batchEnable preflights and completed operation polling" },
    ],
    boundaries: [
      "Reports ENABLED; runtime activation uses LocalCloud service controls",
      "No quota enforcement, billing, or project-specific entitlement",
    ],
  },
  cloudbilling: {
    capabilities: [
      { operations: ["cloudbilling.billing.budgets"], summary: "Billing-account and budget metadata CRUD; selected Terraform paths" },
    ],
    boundaries: [
      "No cost accumulation or threshold notifications",
      "No billing exports or budget-triggered automation",
    ],
  },
  logging: {
    capabilities: [
      { operations: ["logging.logs.write-list"], summary: "Log ingestion, listing, and local filtering" },
      { operations: ["logging.logs.write-list"], summary: "Sink configuration and runtime/KMS audit events" },
    ],
    boundaries: [
      "Limited Google filter semantics",
      "Validate log-based metrics, exclusions, and sink delivery in Google Cloud",
    ],
  },
  monitoring: {
    capabilities: [
      { operations: ["monitoring.metrics.time-series"], summary: "Time-series and metric-descriptor create/list APIs" },
      { operations: ["monitoring.metrics.time-series"], summary: "Alert-policy and notification-channel metadata" },
    ],
    boundaries: [
      "Limited query alignment/aggregation",
      "Validate alert evaluation, notifications, uptime execution, and dashboards in Google Cloud",
    ],
  },
  gke: {
    capabilities: [
      { operations: ["gke.clusters.lifecycle"], summary: "Cluster metadata lifecycle" },
      { operations: ["gke.clusters.lifecycle"], summary: "Real local Kubernetes clusters through k3d" },
    ],
    boundaries: [
      "Requires k3d and Docker",
      "No node-pool creation, autoscaling, resize, or upgrades",
      "GKE REST cluster calls require AlloyDB disabled; gRPC is separate",
    ],
  },
  compute: {
    capabilities: [
    ],
    boundaries: [
      "Local VM execution: not available yet",
      "Disks, snapshots, templates, VPCs: use Google Cloud",
      "Local stub routes only",
    ],
  },
  cloudrun: {
    capabilities: [
      { operations: ["cloudrun.services-revisions"], summary: "Service/revision metadata" },
      { operations: ["cloudrun.services-revisions"], summary: "Docker container execution on service create/update" },
    ],
    boundaries: [
      "Requires Docker runtime access",
      "No jobs, domain mappings, or full revision traffic splitting",
    ],
  },
  memorystore: {
    capabilities: [
      { operations: ["memorystore.resp.commands"], summary: "Valkey RESP, Lua, Pub/Sub, streams, and transactions" },
      { operations: ["memorystore.admin-api"], summary: "Redis instance lifecycle, configuration, version labels, and AUTH retrieval" },
    ],
    boundaries: [
      "Shared server; database numbers do not isolate Pub/Sub channels",
      "No multi-shard topology, managed failover, or project authorization",
    ],
  },
  workflows: {
    capabilities: [
      { operations: ["workflows.workflows.management"], summary: "Workflow deployment and lifecycle" },
      { operations: ["workflows.workflows.executions"], summary: "Local interpreter, standard library, and execution step history" },
    ],
    boundaries: [
      "Limited connector and expression support",
      "Active executions fail on restart with InstanceRestart",
    ],
  },
  vertexai: {
    capabilities: [
    ],
    boundaries: [
      "Local stubs: deterministic responses only",
      "Inference, embeddings, tokenization: use Google Cloud",
      "Training, tuning, endpoints, batch prediction: use Google Cloud",
    ],
  },
  kms: {
    capabilities: [
      { operations: ["kms.locations.random", "kms.keys.lifecycle", "kms.versions.lifecycle", "kms.keys.deletion"], summary: "Locations, random bytes, keys/versions, rotation, destruction/restoration, and eligible deletion" },
      { operations: ["kms.crypto.operations", "kms.crypto.asymmetric", "kms.crypto.mac"], summary: "SOFTWARE symmetric/asymmetric cryptography, public keys, and MACs" },
      { operations: ["kms.crypto.kem-pq", "kms.import.lifecycle"], summary: "Supported post-quantum signing/decapsulation and wrapped key imports" },
      { operations: ["kms.iam.policies", "kms.audit.metrics", "kms.workflows.connectors"], summary: "Strict IAM, conditions, audits, metrics, and authenticated Workflows connectors" },
      { operations: ["kms.cmek.secretmanager", "kms.inventory.protected-resources", "kms.autokey.key-handles"], summary: "Secret Manager CMEK, project Inventory, and Autokey/KeyHandles" },
    ],
    boundaries: [
      "SOFTWARE keys; hardware custody and Google authority are cloud-only",
      "Inventory/Autokey: project-owned global Secret Manager resources only",
      "No folder ancestry or other protected-resource types",
      "KeyRing deletion isn't guaranteed to match Google Cloud",
    ],
  },
  cloudsql: {
    capabilities: [
      { operations: ["cloudsql.sql-admin.lifecycle", "cloudsql.mysql-managed-runtime"], summary: "Instance/database/user lifecycle; PostgreSQL and on-demand MySQL 8.4" },
      { operations: ["cloudsql.instances.admin-maintenance", "cloudsql.cloudsql-advanced-lifecycle"], summary: "Backup/replica administration, restore/import/export management, and upgrade prechecks" },
      { operations: ["cloudsql.instances.admin-maintenance"], summary: "Development certificate maintenance APIs" },
    ],
    boundaries: [
      "Shared installed engines; version labels do not provision separate versions",
      "No per-instance database flags; infrastructure settings are metadata",
      "No managed backup recovery or replication guarantees",
      "Development certificates for local connections; validate production TLS settings in Google Cloud",
    ],
  },
} satisfies Record<keyof typeof editorial, ServiceCompatibilityEditorial>;

export const serviceEditorial: Readonly<Record<string, ServiceEditorial>> = editorial;

export function getServiceEditorial(service: DocumentationServiceContract): ServiceEditorial {
  const value = serviceEditorial[service.id];
  if (!value) throw new Error(`Missing editorial overlay for LocalCloud service ${service.id}`);
  return value;
}
