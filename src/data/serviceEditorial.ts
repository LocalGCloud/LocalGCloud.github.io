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
  sheets: { slug: 'google-sheets', category: 'auxiliary', iconId: 'sheets', description: 'Read-only API for fixture values used by BigQuery external tables and seed data, selected by exact A1 range.' },
  secretmanager: { slug: 'secret-manager', category: 'security', iconId: 'secretmanager', description: 'Secret and version lifecycle workflows for local development.' },
  cloudtasks: { slug: 'cloud-tasks', category: 'integration', iconId: 'cloudtasks', description: 'Queue and task lifecycle workflows.' },
  cloudscheduler: { slug: 'cloud-scheduler', category: 'integration', iconId: 'cloudscheduler', description: 'Schedule and job lifecycle workflows.' },
  cloudfunctions: { slug: 'cloud-functions', category: 'compute', iconId: 'cloudfunctions', description: 'Second-generation function metadata and HTTP or Pub/Sub trigger workflows.' },
  alloydb: { slug: 'alloydb', category: 'databases', iconId: 'alloydb', description: 'AlloyDB cluster and instance management workflows with local PostgreSQL data.' },
  dataproc: { slug: 'dataproc', category: 'analytics', iconId: 'dataproc', description: 'Dataproc cluster and job workflows in serverless and cluster modes with Docker execution.' },
  cloudiam: { slug: 'cloud-iam', category: 'security', iconId: 'cloudiam', description: 'IAM policy API workflows for local development.' },
  cloudresourcemanager: { slug: 'cloud-resource-manager', category: 'operations', iconId: 'cloudresourcemanager', description: 'Project lifecycle workflows for local development.' },
  serviceusage: { slug: 'service-usage', category: 'operations', iconId: 'serviceusage', description: 'Service enablement and metadata workflows.' },
  cloudbilling: { slug: 'cloud-billing', category: 'operations', iconId: 'cloudbilling', description: 'Billing-account, budget, and cost metadata workflows.' },
  logging: { slug: 'cloud-logging', category: 'operations', iconId: 'logging', description: 'Log ingestion, listing, metrics, and sink workflows.' },
  monitoring: { slug: 'cloud-monitoring', category: 'operations', iconId: 'monitoring', description: 'Metric writes, filtered time-series reads, and alert-policy configuration.' },
  gke: { slug: 'gke', category: 'compute', iconId: 'gke', description: 'Cluster workflows backed by a local k3d Kubernetes runtime.' },
  compute: { slug: 'compute-engine', category: 'compute', iconId: 'compute', description: "Compute Engine doesn't run in LocalCloud; use Google Cloud for VM workloads." },
  cloudrun: { slug: 'cloud-run', category: 'compute', iconId: 'cloudrun', description: 'Service and revision workflows backed by local Docker containers.' },
  memorystore: { slug: 'memorystore', category: 'databases', iconId: 'memorystore', description: 'Valkey-backed RESP data workflows.' },
  workflows: { slug: 'cloud-workflows', category: 'integration', iconId: 'workflows', description: 'Workflow deployment and execution workflows.' },
  vertexai: { slug: 'vertex-ai', category: 'compute', iconId: 'vertexai', description: "Vertex AI doesn't run in LocalCloud; use Google Cloud for inference and training." },
  kms: { slug: 'cloud-kms', category: 'security', iconId: 'kms', description: 'Key-management and cryptographic workflows.' },
  cloudsql: { slug: 'cloud-sql', category: 'databases', iconId: 'cloudsql', description: 'Instance, database, and user workflows with PostgreSQL and on-demand MySQL.' },
} as const satisfies Record<string, ServiceEditorial>;

// Compatibility summaries reference upstream operation IDs so verification can
// reject stale claims and require editorial review when capabilities change.
export interface ServiceCompatibilityEditorial {
  capabilities: { operations: string[]; summary: string; workflow: string }[];
  boundaries: string[];
}

export const serviceCompatibilityEditorial: Readonly<Record<string, ServiceCompatibilityEditorial>> = {
  gcs: {
    capabilities: [
      { operations: ["gcs.buckets.lifecycle", "gcs.objects.lifecycle"], summary: "Bucket CRUD; object upload, download, listing, deletion, and versioning", workflow: "Create a bucket, upload a fixture, and assert its downloaded bytes. List and delete owned objects to test cleanup." },
      { operations: ["gcs.bucket-iam", "gcs.object-iam"], summary: "Bucket IAM and mode-aware object authorization", workflow: "Set a bucket policy, then test allowed and denied object requests in the chosen IAM mode through direct listeners and the gateway." },
      { operations: ["gcs.notifications"], summary: "Object event delivery to local Pub/Sub topics, including archive events", workflow: "Create a Pub/Sub topic and bucket notification. Upload, update metadata, or delete an object, then assert the event type and object name." },
      { operations: ["gcs.hmac"], summary: "HMAC keys and signed XML requests", workflow: "Create a service-account HMAC key and sign XML requests. Rotate or revoke it, then assert that the old signature is rejected." },
    ],
    boundaries: [
      "Object versioning and archive events run locally. Managed folders: use Google Cloud",
      "Lifecycle, retention, hold, and encryption settings are stored and returned; validate enforcement in Google Cloud",
      "Notifications deliver to existing Pub/Sub topics. Ordering and atomic object-and-event delivery: validate in Google Cloud",
    ],
  },
  pubsub: {
    capabilities: [
      { operations: ["pubsub.topics.lifecycle", "pubsub.subscriptions.lifecycle", "pubsub.message.workflow"], summary: "Topics, subscriptions, push/pull, StreamingPull, acknowledgements, and message ordering", workflow: "Create a topic and subscription, publish a fixture, and receive it through pull, StreamingPull, or push. Acknowledge successful work and check how the consumer handles an expired acknowledgment deadline." },
      { operations: ["pubsub.delivery-policies"], summary: "Attribute filters, dead-letter forwarding, and retries", workflow: "Publish events with matching and nonmatching attributes to test subscription filters. Make a handler fail, then inspect retries and dead-letter forwarding instead of treating publication as delivery proof." },
      { operations: ["pubsub.snapshots-replay"], summary: "Retention, snapshots, and timestamp/snapshot seek", workflow: "Create a snapshot before acknowledging test messages, then seek to the snapshot or a retained timestamp. Verify which messages are delivered again and use the new acknowledgment IDs." },
      { operations: ["pubsub.schemas"], summary: "Avro/Protobuf schemas, revisions, and JSON/binary validation", workflow: "Register an Avro or Protobuf schema and its revisions, then publish valid and invalid JSON or binary payloads. Assert that invalid batches fail before the consumer receives them." },
      { operations: ["pubsub.push-payload-wrappers"], summary: "Wrapped and unwrapped push payloads with optional metadata headers", workflow: "Configure noWrapper to deliver raw message bytes and enable writeMetadata when the receiver needs message headers. Test the default wrapped JSON path separately from unwrapped delivery." },
      { operations: ["pubsub.subscription-expiration-and-storage-policy"], summary: "Expiration and message-storage policy settings", workflow: "Set subscription expirationPolicy and topic messageStoragePolicy, then read them back over the API and after restart. These settings support configuration tests; they do not expire subscriptions or relocate messages locally." },
      { operations: ["pubsub.authenticated-push"], summary: "Authenticated push with locally signed OIDC tokens", workflow: "Configure an OIDC service account and audience on a push subscription. Have the receiver validate the locally signed bearer token against the LocalCloud issuer and JWKS before accepting the message." },
    ],
    boundaries: [
      "Message ordering is supported. Design consumers for at-least-once redelivery. Exactly-once delivery, export subscriptions, and transforms: validate in Google Cloud",
      "Authenticated push receivers verify the local issuer and JWKS. Retry and retention timing is approximate; confirm exact timing in Google Cloud",
      "Expiration and message-storage policies are stored and read back for configuration tests. They don't expire subscriptions or move messages locally. Stored IAM policies are not enforced; validate access control in Google Cloud",
    ],
  },
  firestore: {
    capabilities: [
      { operations: ["firestore.documents.crud"], summary: "Document CRUD", workflow: "Enable Firestore in the service list, create a document with a unique test ID, and read and update its fields. Delete the fixture and assert the missing-document path." },
      { operations: ["firestore.queries.indexes"], summary: "Queries and single-field indexes", workflow: "Seed documents with different field values, run the filters and ordering used by the application, and compare the returned IDs. Test index setup separately from document creation." },
    ],
    boundaries: [
      "Opt-in: run `localcloud start --services firestore`",
      "Composite indexes, concurrent transactions, listeners, transforms, Security Rules, and triggers: validate in Google Cloud",
    ],
  },
  bigtable: {
    capabilities: [
      { operations: ["bigtable.admin.lifecycle", "bigtable.safety.forward-compat"], summary: "Instances, clusters, tables, families, app profiles, and schema bundles", workflow: "Create an instance, cluster, table, and column family for a test namespace. Configure its app profile or schema bundle, then read the administration resources back before writing data." },
      { operations: ["bigtable.rows.data"], summary: "Atomic mutations, row filters including Sink, aggregates, and read sessions", workflow: "Write cells with explicit row keys and timestamps, apply an atomic mutation, and read a bounded key range. Assert returned bytes and filter results, including the effect of Sink on later filters." },
      { operations: ["bigtable.query.googlesql", "bigtable.materialized-views"], summary: "Prepared GoogleSQL, logical views, and continuous materialized views", workflow: "Prepare and execute a GoogleSQL query against fixture rows, then exercise the logical or continuous materialized view your application uses. Compare returned values after a source-row change." },
      { operations: ["bigtable.change-streams"], summary: "Change streams", workflow: "Open a change stream, mutate a row, and check the resulting record and continuation path. Use the local single-partition stream to test consumer handling of repeated records." },
      { operations: ["bigtable.snapshots-backups", "bigtable.persistence"], summary: "Data-bearing backups, copy/restore, and seven-day table undelete", workflow: "Back up a table containing known bytes, restore or copy the backup, and compare the restored rows through the native client. Test seven-day table undelete separately from backup restoration." },
      { operations: ["bigtable.iam", "bigtable.cli.cbt", "bigtable.browser.console"], summary: "IAM policy storage, cbt, and Console browsing", workflow: "Read and update stored IAM policies, browse rows in the Console, and run the cbt commands used by your scripts. Check native API errors when a write or cleanup operation fails." },
    ],
    boundaries: [
      "IAM policies are stored and returned but not enforced; change streams use a single partition. Query statistics, view parameters, and legacy snapshots: use Google Cloud",
      "Sink bypasses later filters and is invalid inside Condition. HLL++ and multi-column view keys use local encodings; read them back with the native client",
      "Clean up by deleting owned backups and clearing deletion protection first. Check native API errors and retained project records after cleanup",
      "Filter, order, and pagination work on native backup listings; REST ignores them. Verify durability and row bytes with the native client",
    ],
  },
  spanner: {
    capabilities: [
      { operations: ["spanner.data-plane"], summary: "GoogleSQL/PostgreSQL queries, UUIDs, and change streams", workflow: "Create a database in the chosen dialect, apply DDL, insert fixtures, and assert query results. For change streams, use streaming SQL and verify records produced by committed writes." },
      { operations: ["spanner.data-plane"], summary: "Full-text/vector search, property graphs, and graph algorithms", workflow: "Build small text, vector, or property-graph fixtures, run the application query, and assert matched rows or paths. Keep input shape and expected ordering explicit for search and graph tests." },
      { operations: ["spanner.sessions-transactions"], summary: "Sessions, serializable/repeatable-read transactions, and batch DML", workflow: "Open sessions and commit related writes in a transaction. Exercise the selected isolation level, conflicting updates, retries, and batch-DML results with application assertions." },
      { operations: ["spanner.partition-batch"], summary: "Partitioned queries/reads and batch writes", workflow: "Partition a read or query, process every returned token, and compare the combined result with a normal read. For batch writes, inspect each mutation-group result before retrying failures." },
      { operations: ["spanner.instance-admin", "spanner.database-admin", "spanner.operations"], summary: "Instance/database administration, DDL, and long-running operations", workflow: "Create an instance and database, apply schema changes, and poll the returned operation. Read back configuration and DDL so provisioning tests verify the resulting resource." },
      { operations: ["spanner.iam"], summary: "Database roles and fine-grained access control", workflow: "Create database roles and a session with creator_role, then test allowed and denied queries and mutations. Stored network IAM policies and database-role enforcement are distinct checks." },
      { operations: ["spanner.backup"], summary: "Backup creation, copy, restore, and schedules", workflow: "Use persistent storage, create a backup of known data, and restore it into a separate database. Compare rows and schema after restore, and inspect schedules independently of backup creation." },
    ],
    boundaries: [
      "Change streams use streaming SQL",
      "Backups and durable change-stream recovery need a persistent data directory",
      "Use authenticated connections to test network IAM; unauthenticated emulator connections skip it",
      "CMEK, TrueTime, and regional infrastructure: use Google Cloud",
    ],
  },
  bigquery: {
    capabilities: [
      { operations: ["bigquery.datasets.lifecycle", "bigquery.tables.lifecycle"], summary: "Datasets, tables, clones, and time travel", workflow: "Create a dataset and table, load deterministic rows, and test clone or time-travel reads used by your application. Compare row values and schema, then remove the owned dataset." },
      { operations: ["bigquery.tables.lifecycle"], summary: "Row access policies, top-level policy tags, and masking", workflow: "Apply a row access policy or top-level policy tag and query as the relevant local principal. Assert both visible rows and masked values through the client path you deploy." },
      { operations: ["bigquery.sql.query"], summary: "Joins, window functions, CTEs, PIVOT/UNPIVOT, and MERGE", workflow: "Load a small input dataset and run joins, window functions, CTEs, PIVOT, or MERGE. Compare exact rows and expected errors before using the query in a larger pipeline." },
      { operations: ["bigquery.sql.scripting"], summary: "Procedural scripts, stored procedures, and dynamic SQL", workflow: "Run a multi-statement script or stored procedure against fixtures, including dynamic SQL if needed. Check variable handling, statement results, and failure behavior." },
      { operations: ["bigquery.jobs.lifecycle"], summary: "Jobs, dry runs, scheduled queries, and selected ML models", workflow: "Submit a job, inspect its result and dry-run response, and test scheduled-query configuration. For a supported ML model, train on a small fixture and assert prediction output." },
      { operations: ["bigquery.materialized-views", "bigquery.information-schema"], summary: "Materialized views and INFORMATION_SCHEMA", workflow: "Create a materialized view and query it after changing source data. Use INFORMATION_SCHEMA to assert the metadata your migration or discovery tool relies on." },
      { operations: ["bigquery.external-tables"], summary: "External tables over local Cloud Storage: CSV, JSONL, Parquet, Avro, ORC; EXTERNAL_QUERY", workflow: "Upload a supported CSV, JSONL, Parquet, Avro, or ORC fixture to local Storage, then query its external table. Exercise EXTERNAL_QUERY with the specific supported connection your application uses." },
      { operations: ["bigquery.storage-api"], summary: "gRPC Storage Read/Write with Avro and Arrow", workflow: "Configure the separate gRPC Storage endpoint and CA trust, then read or write Avro or Arrow records. Compare schema and row contents independently of the REST query client." },
    ],
    boundaries: [
      "Behavior varies with SQL, ML, and geography inputs; test your edge-case inputs. Ingestion-time pseudocolumn reads and nested policy tags: validate in Google Cloud",
      "External tables read from local Cloud Storage. Native Bigtable, Sheets, HTTP, and local-file sources: use Google Cloud",
      "Reservations, production IAM, and fleet-scale behavior: use Google Cloud",
    ],
  },
  sheets: {
    capabilities: [
      { operations: ["sheets.values.get", "sheets.values.batch-get"], summary: "Exact A1-range reads: values.get and values.batchGet", workflow: "Seed a spreadsheet ID and exact A1 range, then call values.get or values.batchGet. Compare the returned rows with the lookup data expected by the consuming application." },
    ],
    boundaries: [
      "Read-only: seed spreadsheet fixtures locally; writes are not available",
      "Spreadsheet metadata, range slicing, and formulas: use Google Cloud",
      "Google OAuth authority: validate in Google Cloud",
    ],
  },
  secretmanager: {
    capabilities: [
      { operations: ["secretmanager.secrets.lifecycle"], summary: "Secret CRUD", workflow: "Create a secret containing fake development configuration, inspect its labels, and delete it during cleanup. Verify missing-secret handling without using production credentials." },
      { operations: ["secretmanager.versions.lifecycle"], summary: "Version add/access/list/enable/disable/destroy", workflow: "Add and access a version, disable or destroy it, and check the resulting application error. Use multiple versions to test a local credential rollout." },
      { operations: ["secretmanager.advanced-secret-management"], summary: "Software-backed customer-managed encryption keys (CMEK) and per-secret IAM policy APIs", workflow: "Configure a local software-protected KMS key for a secret and test version access with the required IAM policy. Verify denied access and unavailable-key behavior separately from policy readback." },
    ],
    boundaries: [
      "Automatic rotation notifications and topic delivery: validate in Google Cloud",
      "Authorization depends on transport and IAM mode; test each client path you deploy",
      "Hardware-backed key custody and geographic replication: use Google Cloud",
    ],
  },
  cloudtasks: {
    capabilities: [
      { operations: ["cloudtasks.queues.lifecycle"], summary: "Queue lifecycle, pause/resume, purge, and HTTP target overrides", workflow: "Create a queue, change dispatch settings, and configure HTTP target URI, method, or header overrides. Check delivered requests, then pause, resume, or purge the queue for the next test run." },
      { operations: ["cloudtasks.tasks.lifecycle"], summary: "Task CRUD, BufferTask, and manual/automatic HTTP dispatch", workflow: "Create an HTTP task or POST a raw body through BufferTask on a queue with an HTTP target host. Trigger dispatch and assert the received body, delivery headers, and observed response." },
      { operations: ["cloudtasks.tasks.lifecycle"], summary: "Rate/concurrency limits, deadlines, retries, and attempt history", workflow: "Make the handler fail or exceed a deadline, then inspect attempt history and retry timing. Test rate and concurrency settings with enough tasks to observe their effect." },
      { operations: ["cloudtasks.tasks.lifecycle"], summary: "HTTP delivery with locally issued OAuth/OIDC credentials", workflow: "Set a task OAuth or OIDC credential and have the receiver verify the local token. Exercise queue-level credential overrides separately from the task-level configuration." },
    ],
    boundaries: [
      "Queue target overrides: validate against the image you deploy. App Engine dispatch and logging sampling: use Google Cloud",
      "Authenticated receivers verify tokens against the local issuer and JWKS",
      "Restarts can redeliver tasks. Pause, purge, and delete don't cancel in-flight requests, so inspect attempt history before replaying a task",
    ],
  },
  cloudscheduler: {
    capabilities: [
      { operations: ["cloudscheduler.jobs.lifecycle"], summary: "Job CRUD, pause/resume, and manual runs", workflow: "Create a job with a local target, pause and resume it, and request a manual run. Inspect the resulting job and attempt state before deleting the fixture." },
      { operations: ["cloudscheduler.jobs.lifecycle"], summary: "Timezone-aware cron and schedule previews", workflow: "Configure a cron expression and timezone, then inspect the next-run preview. Choose a short test schedule and compare observed trigger times with the expected local schedule." },
      { operations: ["cloudscheduler.jobs.lifecycle"], summary: "HTTP/Pub/Sub delivery, retries, deadlines, and attempt history", workflow: "Point an HTTP job at a test receiver or a Pub/Sub job at a local topic. Introduce a failure and inspect retries, deadlines, and attempt history." },
      { operations: ["cloudscheduler.jobs.lifecycle"], summary: "HTTP delivery with locally issued OAuth/OIDC credentials", workflow: "Configure an OAuth or OIDC credential on an HTTP job and verify the token at the receiver. Trust the LocalCloud issuer and JWKS for this local delivery test." },
    ],
    boundaries: [
      "Authenticated receivers verify tokens against the local issuer and JWKS. App Engine targets: use Google Cloud",
      "Interrupted attempts aren't replayed and downtime isn't backfilled; validate catch-up behavior in Google Cloud",
      "Stored policies are returned but not enforced per job; validate authorization in Google Cloud",
    ],
  },
  cloudfunctions: {
    capabilities: [
      { operations: ["cloudfunctions.functions.metadata"], summary: "Second-generation function metadata CRUD", workflow: "Create and update a second-generation function resource, then read back its configuration. Use this path to test deployment metadata independently of function execution." },
      { operations: ["cloudfunctions.functions.metadata"], summary: "HTTP forwarding and Pub/Sub trigger routing", workflow: "Run your own HTTP execution target, register its forwarding configuration, and invoke the function route. For a Pub/Sub trigger, publish a local event and assert what reaches that target." },
    ],
    boundaries: [
      "Bring your own HTTP handler; LocalCloud routes requests to it",
      "HTTP and Pub/Sub triggers run locally. Firestore, Storage, and Audit Log Eventarc triggers and Google identity tokens: validate in Google Cloud",
      "Source builds and managed function containers: use Google Cloud",
    ],
  },
  alloydb: {
    capabilities: [
      { operations: ["alloydb.cluster-instance.lifecycle"], summary: "Cluster/instance CRUD and local PostgreSQL access", workflow: "Create a cluster and instance, then connect to the local PostgreSQL data path. Apply a small schema and assert application reads and writes." },
      { operations: ["alloydb.clusters-instances.maintenance"], summary: "Configuration patching, flag discovery, and backup metadata restore", workflow: "Patch cluster configuration and inspect flag discovery. Create backup metadata and restore its configuration, checking resource fields rather than expecting database contents to be restored." },
    ],
    boundaries: [
      "Backup restore applies configuration metadata, not database contents. Advanced engine behavior and replicas: use Google Cloud",
      "Managed regional failover: use Google Cloud",
    ],
  },
  dataproc: {
    capabilities: [
      { operations: ["dataproc.clusters.crud"], summary: "Local cluster lifecycle", workflow: "Create a cluster in cluster mode with Docker access and wait for its lifecycle result. When testing local workload identity, select a service account and scopes and verify the identity seen inside the cluster." },
      { operations: ["dataproc.jobs.execution"], summary: "Spark/Hadoop execution in cluster and serverless modes", workflow: "Submit a small Spark or Hadoop job in cluster or serverless mode and inspect its terminal result and output. For identity-aware jobs, assert the account exposed by the local metadata relay." },
    ],
    boundaries: [
      "Runs cluster and serverless jobs in local Docker containers. Docker daemon access is required",
      "Autoscaling, automated node repair, and production SLAs: validate in Google Cloud",
    ],
  },
  cloudiam: {
    capabilities: [
      { operations: ["cloudiam.policies.permissions"], summary: "Allow policies, permission checks, supported conditions, and project inheritance", workflow: "Set a project allow policy and test permissions with the chosen local principal. Exercise supported conditions and inheritance in strict mode to check denied paths as well as successful calls." },
      { operations: ["cloudiam.custom-roles.lifecycle"], summary: "Custom roles and grantable-role queries", workflow: "Create a custom role, update its included permissions, and inspect grantable roles. Apply it to a fixture principal and check the permissions the application requests." },
      { operations: ["cloudiam.service-accounts.management"], summary: "Service-account metadata, key enable/disable, and testable-permission queries", workflow: "Create a service-account resource, inspect testable permissions, and enable or disable an owned key. Read back the state used by provisioning and credential-management code." },
      { operations: ["cloudiam.credentials.tokens"], summary: "Local access/ID tokens, impersonation, and blob/JWT signing", workflow: "Issue local access or ID tokens, impersonate a service account, or sign a blob or JWT. Verify token audience, issuer, and signature at your local receiver." },
      { operations: ["cloudiam.workload-identity.federation"], summary: "OIDC workload identity pools, providers, and token exchange", workflow: "Create an OIDC workload identity pool and provider, then exchange a test subject token. Check provider matching and the resulting local principal before using its credential." },
    ],
    boundaries: [
      "Enforcement depends on service, transport, and IAM mode. Test denied paths in strict mode; open mode is not access control",
      "Supported conditions and project inheritance work locally. Full CEL, organization and folder ancestry, and deny policies: validate in Google Cloud",
      "Tokens are issued by the local issuer and verified against its JWKS; Google-issued tokens need Google Cloud",
    ],
  },
  cloudresourcemanager: {
    capabilities: [
      { operations: ["cloudresourcemanager.projects.lifecycle"], summary: "Project CRUD and completed-operation polling", workflow: "Create a test project, read it back, and poll its completed operation. Delete owned service resources before checking project deletion." },
      { operations: ["cloudresourcemanager.projects.lifecycle"], summary: "Automatic project registration through gateway entry points, outside strict mode", workflow: "Outside strict mode, address a new project through a supported gateway entry point and verify its registration. Repeat with strict mode to test code that requires explicit project setup." },
    ],
    boundaries: [
      "Organization and folder lifecycle, moves, search, and full ancestry: use Google Cloud",
      "Direct emulator listeners don't register projects automatically; use the gateway entry points",
    ],
  },
  serviceusage: {
    capabilities: [
      { operations: ["serviceusage.services.enablement"], summary: "Service list/get/enable/batchEnable preflights and completed operation polling", workflow: "List available APIs, request enable or batchEnable, and inspect the completed operation. Use the response for provisioning preflights; select running services through LocalCloud runtime controls." },
    ],
    boundaries: [
      "Enablement reports ENABLED. Start services with LocalCloud service controls",
      "Quotas, billing, and project-specific entitlements: validate in Google Cloud",
    ],
  },
  cloudbilling: {
    capabilities: [
      { operations: ["cloudbilling.billing.budgets"], summary: "Billing-account and budget metadata CRUD; selected Terraform paths", workflow: "Create or inspect billing-account and budget metadata used by your provisioning code. Update a budget and read back its fields without expecting charges or threshold delivery." },
    ],
    boundaries: [
      "Cost totals and budget threshold notifications: validate in Google Cloud",
      "Billing exports and budget-triggered automation: use Google Cloud",
    ],
  },
  logging: {
    capabilities: [
      { operations: ["logging.logs.write-list"], summary: "Log ingestion, listing, and local filtering", workflow: "Write structured entries with project, resource, and label fields, then list them using the supported local filter subset. Assert the entries needed to diagnose a test request." },
      { operations: ["logging.logs.write-list"], summary: "Sink configuration and runtime/KMS audit events", workflow: "Create a sink configuration and inspect runtime or KMS audit entries. Test configuration readback independently of any external sink delivery." },
      { operations: ["logging.metrics.logs-based"], summary: "Logs-based metric definition create/get/list/update/delete APIs", workflow: "Create a logs-based metric definition, update its filter, and read it back. This checks metric configuration; log entries do not generate metric values locally." },
    ],
    boundaries: [
      "Local filters cover a subset of Google Cloud query syntax. Logs-based metric definitions store configuration; values aren't derived locally",
      "Validate exclusions and sink delivery in Google Cloud",
    ],
  },
  monitoring: {
    capabilities: [
      { operations: ["monitoring.metrics.time-series"], summary: "Time-series writes, filtered reads, and derived metric descriptors", workflow: "Write points with explicit metric and resource labels, then inspect the derived metric descriptor. List points using supported equality filters, time intervals, views, and pagination, and assert returned values." },
      { operations: ["monitoring.metrics.time-series"], summary: "Notification-channel metadata", workflow: "Create and update a notification-channel resource, then read back its metadata. Use this to test configuration without sending notifications." },
      { operations: ["monitoring.alert-policies"], summary: "Alert-policy create/get/list/update/delete APIs", workflow: "Create an alert policy with conditions and channel references, update it, and compare the returned fields over REST or gRPC. Evaluate alerts and notification delivery in a separate cloud test." },
    ],
    boundaries: [
      "Filters support AND-joined equality on metric type, resource type, and labels. Aggregation and order_by are ignored, so sort and aggregate results in your test",
      "Alert evaluation, notifications, uptime execution, and dashboards: validate in Google Cloud",
    ],
  },
  gke: {
    capabilities: [
      { operations: ["gke.clusters.lifecycle"], summary: "Cluster metadata lifecycle", workflow: "Create a cluster and poll its pending operation until k3d provisioning finishes. Inspect the terminal result before treating the cluster as available." },
      { operations: ["gke.clusters.lifecycle"], summary: "Real local Kubernetes clusters through k3d", workflow: "Use Docker and k3d to bring up the local Kubernetes cluster, then deploy a small workload. Check pod status and application output through Kubernetes." },
      { operations: ["gke.workload-identity.pods"], summary: "Pod Application Default Credentials (ADC) through annotated Kubernetes-to-Google service-account bindings", workflow: "Enable TLS and local identity, configure the project workload pool, annotate the Kubernetes service account, and grant workloadIdentityUser to its Google service-account mapping. Check ADC inside a pod before calling a local API." },
    ],
    boundaries: [
      "Opt-in: run `localcloud start --services gke`. Runs one k3d server node with Docker",
      "Node-pool creation, autoscaling, resizing, and upgrades: use Google Cloud",
      "Use the exported /container/v1 REST endpoint; the shared /v1 cluster routes belong to AlloyDB",
      "Pod identity needs TLS, local identity, the Kubernetes service account annotation, and the workloadIdentityUser role. Direct principal federation: validate in Google Cloud",
    ],
  },
  compute: {
    capabilities: [
    ],
    boundaries: [
      "Runs in Google Cloud; LocalCloud doesn't run VMs",
      "Disks, snapshots, templates, and VPCs: use Google Cloud",
      "Stub routes exist only to test SDK wiring",
    ],
  },
  cloudrun: {
    capabilities: [
      { operations: ["cloudrun.services-revisions"], summary: "Service/revision metadata", workflow: "Create or update a service and poll its long-running operation. Read back revision metadata and inspect failures before using the returned service endpoint." },
      { operations: ["cloudrun.services-revisions"], summary: "Docker container execution on service create/update", workflow: "Give LocalCloud Docker access, deploy an application image, and call the local HTTP endpoint. Assert response content and test how deployment code handles a failed container launch." },
    ],
    boundaries: [
      "Opt-in: run `localcloud start --services cloudrun`. Runs service containers through local Docker, so Docker runtime access is required",
      "Jobs, domain mappings, and full revision traffic splitting: use Google Cloud",
    ],
  },
  memorystore: {
    capabilities: [
      { operations: ["memorystore.resp.commands"], summary: "Valkey RESP, Lua, Pub/Sub, streams, and transactions", workflow: "Connect a Redis-compatible client to the Valkey endpoint, write a key, and verify expiry or transaction behavior. Use separate channel names when testing Pub/Sub across application namespaces." },
      { operations: ["memorystore.admin-api"], summary: "Redis instance lifecycle, configuration, version labels, and AUTH retrieval", workflow: "Create an instance resource, update configuration or version labels, and retrieve its AUTH string. Check the shared data plane separately from administration metadata." },
    ],
    boundaries: [
      "One shared server: use separate channel names for Pub/Sub tests, because database numbers don't isolate channels",
      "Multi-shard topology, managed failover, and project authorization: use Google Cloud",
    ],
  },
  workflows: {
    capabilities: [
      { operations: ["workflows.workflows.management"], summary: "Workflow deployment and lifecycle", workflow: "Deploy a workflow definition, inspect its source and configuration, and update or delete it through the local API. Keep resource names scoped to the test project." },
      { operations: ["workflows.workflows.executions"], summary: "Local interpreter, standard library, and execution step history", workflow: "Execute a workflow that calls a local handler, branches on its result, and retries an expected failure. Inspect execution state and JSON step history to assert the path taken." },
    ],
    boundaries: [
      "Connector and expression coverage is limited; validate other connectors in Google Cloud",
      "Active executions fail with InstanceRestart when LocalCloud restarts; design restart tests to expect it",
    ],
  },
  vertexai: {
    capabilities: [
    ],
    boundaries: [
      "Stub routes return fixed responses so you can test SDK wiring",
      "Inference, embeddings, and tokenization run in Google Cloud",
      "Training, tuning, endpoints, and batch prediction run in Google Cloud",
    ],
  },
  kms: {
    capabilities: [
      { operations: ["kms.locations.random", "kms.keys.lifecycle", "kms.versions.lifecycle", "kms.keys.deletion"], summary: "Locations, random bytes, keys and versions, rotation, destruction and restoration, and eligible deletion", workflow: "Create a key ring, key, and version; rotate or schedule destruction and restore the eligible version. Inspect state transitions and test how the application handles unavailable key material." },
      { operations: ["kms.crypto.operations", "kms.crypto.asymmetric", "kms.crypto.mac"], summary: "Software-protected symmetric and asymmetric cryptography, public keys, and MACs", workflow: "Encrypt and decrypt a fixture, verify an asymmetric signature, or compute and check a MAC with a software-protected key. Assert plaintext or signature bytes and rejected inputs." },
      { operations: ["kms.crypto.kem-pq", "kms.import.lifecycle"], summary: "Supported post-quantum signing/decapsulation and wrapped key imports", workflow: "Use a supported post-quantum key type or create an import job and submit correctly wrapped key material. Check the resulting version and operation-specific errors." },
      { operations: ["kms.iam.policies", "kms.audit.metrics", "kms.workflows.connectors"], summary: "Strict IAM, conditions, audits, metrics, and authenticated Workflows connectors", workflow: "Apply a strict IAM policy and exercise allowed and denied cryptographic calls. Inspect local audit events and metrics, or invoke the authenticated KMS Workflows connector." },
      { operations: ["kms.cmek.secretmanager", "kms.inventory.protected-resources", "kms.autokey.key-handles"], summary: "Customer-managed encryption keys (CMEK) for Secret Manager, project inventory, and Autokey/KeyHandles", workflow: "Protect a Secret Manager secret with CMEK, then inspect its project-owned inventory entry. Exercise Autokey or KeyHandles for the supported global Secret Manager resource scope." },
    ],
    boundaries: [
      "Software-protected keys run locally. Hardware key custody and Google authority: use Google Cloud",
      "Inventory and Autokey cover project-owned global Secret Manager resources. Folder ancestry and other protected resource types: use Google Cloud",
      "Key ring deletion differs from Google Cloud; validate it in Google Cloud",
    ],
  },
  cloudsql: {
    capabilities: [
      { operations: ["cloudsql.sql-admin.lifecycle", "cloudsql.mysql-managed-runtime"], summary: "Instance, database, and user lifecycle; PostgreSQL and on-demand MySQL 8.4", workflow: "Create a local instance, database, and user, then connect through PostgreSQL or on-demand MySQL 8.4. Run a migration and assert rows through the native driver." },
      { operations: ["cloudsql.instances.admin-maintenance", "cloudsql.cloudsql-advanced-lifecycle"], summary: "Backup metadata CRUD and instance administration responses", workflow: "Create, list, and delete backup metadata and inspect instance administration responses. Export, import, restore, restart, and replica calls return DONE without moving data." },
      { operations: ["cloudsql.instances.admin-maintenance"], summary: "Local server CA discovery and client certificate issuance", workflow: "With LocalCloud-generated TLS enabled, retrieve the engine CA and issue a client certificate, then verify the server through your driver. Operator-provided chains do not give LocalCloud a CA signing key." },
    ],
    boundaries: [
      "Instances share local engines. Version labels, instance flags, and infrastructure settings don't create separate servers",
      "Backups are metadata. Export, import, restore, restart, and replica calls return DONE without moving data; validate restore and migration results in Google Cloud",
      "MySQL runs in Docker, so Docker access is required. Project exports omit MySQL data, non-public PostgreSQL schemas, and passwords",
      "requireSsl, sslMode, certificate revocation, and CA rotation are not enforced locally; validate TLS enforcement in Google Cloud. PostgreSQL doesn't require client certificates",
    ],
  },
} satisfies Record<keyof typeof editorial, ServiceCompatibilityEditorial>;

export const serviceEditorial: Readonly<Record<string, ServiceEditorial>> = editorial;

export function getServiceEditorial(service: DocumentationServiceContract): ServiceEditorial {
  const value = serviceEditorial[service.id];
  if (!value) throw new Error(`Missing editorial overlay for LocalCloud service ${service.id}`);
  return value;
}
