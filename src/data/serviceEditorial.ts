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
  sheets: { slug: 'google-sheets', category: 'auxiliary', iconId: 'sheets', description: 'Values API for spreadsheet fixtures: read and write A1 ranges in seeded or test spreadsheets.' },
  secretmanager: { slug: 'secret-manager', category: 'security', iconId: 'secretmanager', description: 'Secret and version lifecycle workflows for local development.' },
  cloudtasks: { slug: 'cloud-tasks', category: 'integration', iconId: 'cloudtasks', description: 'Queue and task lifecycle workflows.' },
  cloudscheduler: { slug: 'cloud-scheduler', category: 'integration', iconId: 'cloudscheduler', description: 'Schedule and job lifecycle workflows.' },
  cloudfunctions: { slug: 'cloud-functions', category: 'compute', iconId: 'cloudfunctions', description: 'Second-generation function metadata and HTTP or Pub/Sub trigger workflows.' },
  alloydb: { slug: 'alloydb', category: 'databases', iconId: 'alloydb', description: 'AlloyDB cluster and instance management workflows with local PostgreSQL data.' },
  dataproc: { slug: 'dataproc', category: 'analytics', iconId: 'dataproc', description: 'Dataproc cluster and Spark/Hadoop job workflows in local Docker containers.' },
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
      { operations: ["gcs.buckets.lifecycle", "gcs.objects.lifecycle"], summary: "Bucket CRUD; object upload (resumable and XML multipart), download, listing, copy, move, and deletion", workflow: "Create a bucket, upload a fixture, and assert its downloaded bytes. Use a resumable or XML multipart upload for large files, then delete owned objects." },
      { operations: ["gcs.bucket-versioning", "gcs.soft-delete"], summary: "Object versioning, noncurrent generations, soft delete, and restore", workflow: "Enable versioning, overwrite and delete an object, then read an older generation. Set a soft-delete policy, then delete and restore an object." },
      { operations: ["gcs.bucket-iam", "gcs.object-iam"], summary: "Bucket IAM and mode-aware object authorization", workflow: "Set a bucket policy through the gateway, then test allowed and denied object requests in the chosen IAM mode." },
      { operations: ["gcs.lifecycle-retention", "gcs.encryption"], summary: "Retention policies, object holds, and customer-managed or customer-supplied keys", workflow: "Set a retention policy or object hold and assert that deletes are refused. Make a local Cloud KMS key the bucket default, disable it, and assert the refused read." },
      { operations: ["gcs.managed-folders"], summary: "Managed folders and hierarchical-namespace folders", workflow: "Create a managed folder and set its IAM policy, or rename a folder in a hierarchical-namespace bucket, and assert the listing." },
      { operations: ["gcs.notifications"], summary: "Object event delivery to local Pub/Sub topics, including archive events", workflow: "Create a Pub/Sub topic and bucket notification. Upload, update metadata, or delete an object, then assert the event type and object name." },
      { operations: ["gcs.hmac"], summary: "HMAC keys and signed XML requests", workflow: "Create a service-account HMAC key and sign XML requests. Rotate or revoke it, then assert that the old signature is rejected." },
    ],
    boundaries: [
      "Object versioning, archive events, soft delete, folders, and managed folders run locally",
      "Retention policies, object holds, and local Cloud KMS keys are enforced. Lifecycle rules are stored; validate scheduled lifecycle actions in Google Cloud",
      "Set bucket IAM policies through the gateway (port 5380) so IAM checks use them. Storage gRPC is not served; use the JSON or XML API",
      "Notifications deliver to existing Pub/Sub topics at least once. Ordering and atomic object-and-event delivery: validate in Google Cloud",
    ],
  },
  pubsub: {
    capabilities: [
      { operations: ["pubsub.topics.lifecycle", "pubsub.subscriptions.lifecycle", "pubsub.message.workflow"], summary: "Topics, subscriptions, push/pull, StreamingPull, and acknowledgements", workflow: "Create a topic and subscription, publish a fixture, and receive it through pull, StreamingPull, or push. Acknowledge successful work and check how the consumer handles an expired acknowledgment deadline." },
      { operations: ["pubsub.delivery-policies"], summary: "Attribute filters, dead-letter forwarding, and retries", workflow: "Publish events with matching and nonmatching attributes to test subscription filters. Make a handler fail, then inspect retries and dead-letter forwarding instead of treating publication as delivery proof." },
      { operations: ["pubsub.snapshots-replay"], summary: "Retention, snapshots, and timestamp/snapshot seek", workflow: "Create a snapshot before acknowledging test messages, then seek to the snapshot or a retained timestamp. Verify which messages are delivered again and use the new acknowledgment IDs." },
      { operations: ["pubsub.schemas"], summary: "Avro/Protobuf schemas, revisions, and JSON/binary validation", workflow: "Register an Avro or Protobuf schema and its revisions, then publish valid and invalid JSON or binary payloads. Assert that invalid batches fail before the consumer receives them." },
      { operations: ["pubsub.push-payload-wrappers"], summary: "Wrapped and unwrapped push payloads with optional metadata headers", workflow: "Configure noWrapper to deliver raw message bytes and enable writeMetadata when the receiver needs message headers. Test the default wrapped JSON path separately from unwrapped delivery." },
      { operations: ["pubsub.subscription-expiration-and-storage-policy"], summary: "Subscription expiration policy settings", workflow: "Set a subscription expirationPolicy and read it back over the API and after a restart. This supports configuration tests only: no subscription expires locally, and a topic messageStoragePolicy is accepted but not stored." },
      { operations: ["pubsub.authenticated-push"], summary: "Authenticated push with locally signed OIDC tokens", workflow: "Configure an OIDC service account and audience on a push subscription. Have the receiver validate the locally signed bearer token against the LocalCloud issuer and JWKS before accepting the message." },
    ],
    boundaries: [
      "Design consumers for at-least-once redelivery. Exactly-once delivery, per-key ordered delivery, export subscriptions, and message transforms: validate in Google Cloud",
      "Messages don't expire by age unless enforce_subscription_retention is on, and a retained backlog is held in memory; purge test subscriptions or turn retention on",
      "Authenticated push receivers verify the local issuer and JWKS. Stored Pub/Sub IAM policies aren't enforced, and retry timing is approximate; validate access control and timing in Google Cloud",
    ],
  },
  firestore: {
    capabilities: [
      { operations: ["firestore.documents.crud"], summary: "Document CRUD, batched writes, transactions, and field transforms", workflow: "Enable Firestore in the service list, create a document with a unique test ID, and read and update its fields. Commit related writes in a transaction or apply a server timestamp or increment, then delete the fixture and assert the missing-document path." },
      { operations: ["firestore.queries.indexes"], summary: "Queries, aggregations, real-time listeners, and index configuration", workflow: "Seed documents with different field values, run the filters, ordering, and aggregations used by the application, and compare the returned IDs. Attach a snapshot listener to assert the initial snapshot, and test index setup separately from document creation." },
      { operations: ["firestore.security-rules"], summary: "Security Rules for Firebase clients", workflow: "Point rulesFile in the Firestore service config at your rules file and restart Firestore. Run allowed and denied reads and writes as a mock Firebase user and assert the status your client handles." },
      { operations: ["firestore.admin.production-profile"], summary: "TTL policies, point-in-time reads, backups, and export and import", workflow: "Set compatibilityProfile: production, create a TTL policy or backup schedule, and assert expired-document deletion or a restored database. Export to a local Cloud Storage bucket and import it back." },
    ],
    boundaries: [
      "Opt-in: run localcloud start --services firestore",
      "The default profile follows the Google emulator: listeners, field transforms, transactions, and Security Rules run locally. Set compatibilityProfile: production in the Firestore service config to require composite indexes and to use TTL policies, point-in-time reads, and backups",
      "Native mode only. Datastore mode and Enterprise pipelines: use Google Cloud",
      "Managed key custody, multi-region replication, and service guarantees: validate in Google Cloud",
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
      "IAM policies are stored and returned but not enforced; change streams use a single partition. Raster statistics (ST_REGIONSTATS) and legacy table snapshots: use Google Cloud",
      "Sink bypasses later filters and is invalid inside Condition. Multi-column materialized-view keys use a local encoding; read them back with the native client",
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
      { operations: ["spanner.iam"], summary: "Database roles and fine-grained access control", workflow: "Create database roles and a session with creator_role, then test allowed and denied queries and mutations. Stored IAM policies are returned but not evaluated, so database roles are the local access check." },
      { operations: ["spanner.backup"], summary: "Backup creation, copy, restore, and schedules", workflow: "Create a backup of known data and restore it into a separate database. Compare rows and schema after restore, and inspect schedules independently of backup creation." },
    ],
    boundaries: [
      "Change streams use streaming SQL",
      "Backups and change-stream history persist in the LocalCloud volume; project checkpoints do not capture Spanner",
      "Stored IAM policies are not evaluated; test access with database roles and creator_role sessions",
      "CMEK, TrueTime, and regional infrastructure: use Google Cloud",
    ],
  },
  bigquery: {
    capabilities: [
      { operations: ["bigquery.datasets.lifecycle", "bigquery.tables.lifecycle"], summary: "Datasets, tables, clones, and time travel", workflow: "Create a dataset and table, load deterministic rows, and test clone or time-travel reads used by your application. Compare row values and schema, then remove the owned dataset." },
      { operations: ["bigquery.tables.lifecycle"], summary: "Row access policies, policy tags, and masking", workflow: "Apply a row access policy or policy tag and query as the relevant local principal. Assert both visible rows and masked values through the client path you deploy." },
      { operations: ["bigquery.sql.query"], summary: "Joins, window functions, CTEs, PIVOT/UNPIVOT, and MERGE", workflow: "Load a small input dataset and run joins, window functions, CTEs, PIVOT, or MERGE. Compare exact rows and expected errors before using the query in a larger pipeline." },
      { operations: ["bigquery.sql.scripting"], summary: "Procedural scripts, stored procedures, and dynamic SQL", workflow: "Run a multi-statement script or stored procedure against fixtures, including dynamic SQL if needed. Check variable handling, statement results, and failure behavior." },
      { operations: ["bigquery.jobs.lifecycle"], summary: "Jobs, dry runs, scheduled queries, and ML models", workflow: "Submit a job, inspect its result and dry-run response, and test scheduled-query configuration. With the full image, train a supported ML model on a small fixture and assert prediction output." },
      { operations: ["bigquery.materialized-views", "bigquery.information-schema"], summary: "Materialized views and INFORMATION_SCHEMA", workflow: "Create a materialized view and query it after changing source data. Use INFORMATION_SCHEMA to assert the metadata your migration or discovery tool relies on." },
      { operations: ["bigquery.external-tables"], summary: "External tables over local Cloud Storage: CSV, JSONL, Parquet, Avro, ORC; temporary tableDefinitions; EXTERNAL_QUERY", workflow: "Upload a supported CSV, JSONL, Parquet, Avro, or ORC fixture to local Storage, then query its external table or pass it as a temporary tableDefinitions entry on the query job. Exercise EXTERNAL_QUERY with the specific supported connection your application uses." },
      { operations: ["bigquery.storage-api"], summary: "gRPC Storage Read/Write with Avro and Arrow", workflow: "Configure the separate gRPC Storage endpoint and CA trust, then read or write Avro or Arrow records. Compare schema and row contents independently of the REST query client." },
    ],
    boundaries: [
      "Behavior varies with SQL, ML, and geography inputs; test your edge-case inputs. Policy-tag taxonomy import/export: validate in Google Cloud",
      "BigQuery ML, JavaScript UDFs, and EXTERNAL_QUERY on Cloud SQL, AlloyDB, PostgreSQL, and MySQL need the full image (localcloud start --full)",
      "Streamed rows have no streaming buffer, so DML can change them at once. External tables read local Cloud Storage; Bigtable, Sheets, HTTP, and local-file sources: use Google Cloud",
      "Reservations, production IAM, and fleet-scale behavior: use Google Cloud",
    ],
  },
  sheets: {
    capabilities: [
      { operations: ["sheets.values.get", "sheets.values.batch-get"], summary: "A1-range reads: values.get and values.batchGet", workflow: "Seed or write a spreadsheet, then read any A1 range with values.get or several with values.batchGet. Compare the returned rows with the lookup data expected by the consuming application." },
      { operations: ["sheets.values.update"], summary: "Cell writes with values.update", workflow: "Write a grid of values into a range with values.update, then read back the range or a sub-range to check which cells changed and which kept their values." },
    ],
    boundaries: [
      "Values come back as written: formulas aren't evaluated and render options are ignored",
      "Spreadsheet metadata, append, clear, and batch updates: use Google Cloud",
      "Google OAuth scopes and Drive sharing: validate in Google Cloud",
    ],
  },
  secretmanager: {
    capabilities: [
      { operations: ["secretmanager.secrets.lifecycle"], summary: "Secret CRUD, labels, filters, expiry, and etags", workflow: "Create a secret containing fake development configuration, filter by label, and delete it during cleanup. Verify missing-secret and expired-secret handling without using production credentials." },
      { operations: ["secretmanager.versions.lifecycle"], summary: "Version add/access/list/enable/disable/destroy", workflow: "Add and access a version, disable or destroy it, and check the resulting application error. Use multiple versions to test a local credential rollout." },
      { operations: ["secretmanager.advanced-secret-management"], summary: "Software-backed customer-managed encryption keys (CMEK) and per-secret IAM policy APIs", workflow: "Protect a secret with a software-protected key from local Cloud KMS, add and access versions, then disable the key version and check the refused access. Set and read back a per-secret IAM policy." },
    ],
    boundaries: [
      "Automatic rotation notifications and topic delivery: validate in Google Cloud",
      "Per-secret IAM policies are stored but secret reads are not checked against them; validate data-access policies in Google Cloud",
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
      "App Engine dispatch, logging sampling, CMEK, and pull queues: use Google Cloud",
      "Authenticated receivers verify tokens against the local issuer and JWKS. A removed task ID stays reserved for one hour",
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
      "Interrupted attempts aren't replayed, and a job that came due while LocalCloud was stopped runs once without backfilling the rest; validate catch-up behavior in Google Cloud",
      "Strict mode checks the gateway access policy, not Google IAM roles on jobs; validate authorization in Google Cloud",
    ],
  },
  cloudfunctions: {
    capabilities: [
      { operations: ["cloudfunctions.functions.metadata"], summary: "Second-generation function metadata CRUD", workflow: "Create and update a second-generation function resource, then read back its configuration. Use this path to test deployment metadata independently of function execution." },
      { operations: ["cloudfunctions.functions.metadata"], summary: "HTTP forwarding and Pub/Sub trigger routing", workflow: "Run your own HTTP execution target, register its forwarding configuration, and invoke the function route. For a Pub/Sub trigger, publish a local event and assert what reaches that target." },
      { operations: ["cloudfunctions.triggers.firestore"], summary: "Firestore document triggers delivered as CloudEvents", workflow: "Enable Firestore, register a function with a document created, updated, deleted, or written trigger, and write a matching document. Assert the CloudEvent headers and the JSON value, oldValue, and updateMask your local handler receives." },
    ],
    boundaries: [
      "Bring your own HTTP handler; LocalCloud routes requests to it",
      "HTTP, Pub/Sub, and Firestore document triggers run locally, and Firestore events arrive as JSON CloudEvents. Storage and Audit Log Eventarc triggers, protobuf event payloads, and Google identity tokens: validate in Google Cloud",
      "Source builds and managed function containers: use Google Cloud",
    ],
  },
  alloydb: {
    capabilities: [
      { operations: ["alloydb.cluster-instance.lifecycle", "alloydb.users.lifecycle"], summary: "Cluster, instance, and user lifecycle with local PostgreSQL", workflow: "Create a cluster, instance, and user, then log in to the cluster's database on the local PostgreSQL port with the user's password. Check resource fields and login behavior from your application." },
      { operations: ["alloydb.clusters-instances.maintenance"], summary: "Labels and display names, flag discovery, and backup records", workflow: "Patch labels and display names, list supported flags, and create backup records. A restore creates a new empty cluster, so check resource fields rather than restored data." },
    ],
    boundaries: [
      "Restore creates an empty cluster and backups hold no data. Engine flags, read pools, and replicas: use Google Cloud",
      "AlloyDB connectors and the Auth Proxy aren't supported; connect directly to the local PostgreSQL port",
      "Managed regional failover: use Google Cloud",
    ],
  },
  dataproc: {
    capabilities: [
      { operations: ["dataproc.clusters.crud"], summary: "Local cluster lifecycle", workflow: "Create a cluster with Docker access and poll its operation until the cluster is RUNNING. Stop, start, or patch labels, and when testing local workload identity, choose a service account and check the identity seen inside the cluster." },
      { operations: ["dataproc.jobs.execution"], summary: "Spark, PySpark, Spark SQL, Hadoop, and Hive jobs", workflow: "Submit a small job to a cluster, or without a cluster to the on-demand container, and read its terminal state and driver output. For identity-aware jobs, assert the account exposed by the cluster's metadata relay." },
    ],
    boundaries: [
      "Each cluster is one local Docker container. Docker daemon access is required",
      "Serverless batches, workflow templates, autoscaling, automated node repair, and production SLAs: validate in Google Cloud",
    ],
  },
  cloudiam: {
    capabilities: [
      { operations: ["cloudiam.policies.permissions"], summary: "Allow policies, permission checks, supported conditions, and project inheritance", workflow: "Set a project allow policy and test permissions with the chosen local principal. Exercise supported conditions and inheritance in strict mode to check denied paths as well as successful calls." },
      { operations: ["cloudiam.custom-roles.lifecycle"], summary: "Custom roles and grantable-role queries", workflow: "Create a custom role, update its included permissions, and inspect grantable roles. Apply it to a fixture principal and check the permissions the application requests." },
      { operations: ["cloudiam.service-accounts.management"], summary: "Service accounts, keys, key enable/disable, and testable-permission queries", workflow: "Create a service account and a key, inspect testable permissions, and enable or disable the key. Read back the state used by provisioning and credential-management code." },
      { operations: ["cloudiam.credentials.tokens"], summary: "Local access/ID tokens, impersonation, and blob/JWT signing", workflow: "Issue local access or ID tokens for a service account, or sign a blob or JWT. Verify token audience, issuer, and signature at your local receiver against the local JWKS." },
      { operations: ["cloudiam.workload-identity.federation"], summary: "Workload identity pool and provider resources", workflow: "Create a workload identity pool and an OIDC provider, then read, update, delete, and undelete them as your provisioning code does. Check ID validation and duplicate-create errors." },
    ],
    boundaries: [
      "Strict mode checks stored policies for IAM, KMS, Cloud Storage, Cloud Tasks, and Workflows; other services follow the strict-mode policy file. Open mode is not access control",
      "Supported conditions and project inheritance work locally. Full CEL, organization and folder ancestry, and deny policies: validate in Google Cloud",
      "Tokens are issued by the local issuer and verified against its JWKS. Workload identity token exchange and Google-issued tokens: use Google Cloud",
    ],
  },
  cloudresourcemanager: {
    capabilities: [
      { operations: ["cloudresourcemanager.projects.lifecycle"], summary: "Project CRUD, labels, project IAM policies, and completed-operation polling", workflow: "Create a test project, update its labels, read it back, and poll its completed operation. Delete it last: deletion clears the project's local data at once." },
      { operations: ["cloudresourcemanager.projects.lifecycle"], summary: "Automatic project registration on first use", workflow: "Address a new project ID through any gateway endpoint and verify that it appears in the project list. Turn off server.auto_provision_projects to test code that requires explicit project setup." },
    ],
    boundaries: [
      "Organization and folder lifecycle, moves, search, and full ancestry: use Google Cloud",
      "Creating an existing project ID returns that project, and deletion has no undelete; check those paths in Google Cloud",
      "In strict mode a new project has no owner binding for its creator; grant a project IAM role first",
    ],
  },
  serviceusage: {
    capabilities: [
      { operations: ["serviceusage.services.enablement"], summary: "Service list/get/batchGet, enable and disable that switch local services, and completed operation polling", workflow: "List APIs and read their state, then disable a served API and confirm its calls are refused until you enable it again. Inspect the completed operation in provisioning preflights and Terraform service resources." },
    ],
    boundaries: [
      "Enable and disable switch a service for the whole local runtime, not one project. IAM, Resource Manager, and Service Usage stay enabled, and Google APIs that LocalCloud does not serve report ENABLED",
      "Quotas, billing, and project-specific entitlements: validate in Google Cloud",
    ],
  },
  cloudbilling: {
    capabilities: [
      { operations: ["cloudbilling.billing.budgets"], summary: "Billing-account and budget metadata CRUD", workflow: "Create or inspect budget metadata used by your provisioning code under the local billing account. Update a budget and read back its fields without expecting charges or threshold delivery." },
      { operations: ["cloudbilling.projects.billing-info"], summary: "Project billing account links", workflow: "Link a project to a billing account, read the link back, then unlink it and check that billing reports disabled. Verify the error for a malformed account name." },
    ],
    boundaries: [
      "Cost totals and budget threshold notifications: validate in Google Cloud",
      "Billing exports and budget-triggered automation: use Google Cloud",
    ],
  },
  logging: {
    capabilities: [
      { operations: ["logging.logs.write-list"], summary: "Log ingestion, listing, and filtering", workflow: "Write structured entries with resource, label, trace and payload fields, then list them with a Cloud Logging filter, ordering and paging. Assert the entries needed to diagnose a test request." },
      { operations: ["logging.sinks.config"], summary: "Sink configuration", workflow: "Create, update and read back a sink through the client library. Test configuration readback independently of any export delivery." },
      { operations: ["logging.metrics.logs-based"], summary: "Logs-based metric definition create/get/list/update/delete APIs", workflow: "Create a logs-based metric definition through the gRPC client library, update its filter, and read it back. Log entries do not generate metric values locally." },
    ],
    boundaries: [
      "Filters cover the common Cloud Logging query fields; regular expressions and functions are refused. Logs-based metric definitions store configuration; values aren't derived locally",
      "Sink updates and logs-based metrics are served over gRPC, not REST",
      "Validate exclusions and sink delivery in Google Cloud",
    ],
  },
  monitoring: {
    capabilities: [
      { operations: ["monitoring.metrics.time-series"], summary: "Time-series writes, filtered reads, and metric descriptors", workflow: "Write points with explicit metric and resource labels, then read the metric descriptor. List points with filters, time intervals, views, and pagination, and assert the returned values." },
      { operations: ["monitoring.notification-channels"], summary: "Notification-channel metadata", workflow: "Create and update a notification-channel resource, then read back its metadata. Use this to test configuration without sending notifications." },
      { operations: ["monitoring.alert-policies"], summary: "Alert-policy create/get/list/update/delete APIs", workflow: "Create an alert policy with conditions and channel references, update it, and compare the returned fields over REST or gRPC. Evaluate alerts and notification delivery in a separate cloud test." },
    ],
    boundaries: [
      "Filters support =, != and : on metric type, resource type, and labels with AND, OR and NOT. Aggregation, alignment and orderBy are refused, so sort and aggregate raw points in your test",
      "Alert evaluation, notifications, uptime checks, groups, and dashboards: validate in Google Cloud",
    ],
  },
  gke: {
    capabilities: [
      { operations: ["gke.clusters.lifecycle"], summary: "Cluster lifecycle through the GKE API", workflow: "Create a cluster and poll its operation until k3d provisioning finishes. Check that the cluster is RUNNING, not ERROR, before using it." },
      { operations: ["gke.clusters.lifecycle"], summary: "Real local Kubernetes clusters through k3d", workflow: "Run the full image with Docker access, create a cluster, then deploy a small workload with kubectl using the cluster's k3d kubeconfig. Check pod status and application output through Kubernetes." },
    ],
    boundaries: [
      "Opt-in: run localcloud start --services gke. Runs one k3d server node with Docker; the lite image creates metadata-only clusters",
      "Node pools, autoscaling, resizing, upgrades and cluster updates: use Google Cloud",
      "Use the exported /container/v1 REST endpoint; the shared /v1 cluster routes belong to AlloyDB",
      "Pod workload identity: validate in Google Cloud",
    ],
  },
  compute: {
    capabilities: [
    ],
    boundaries: [
      "Runs in Google Cloud; LocalCloud doesn't run VMs",
      "Disks, snapshots, templates, and VPCs: use Google Cloud",
      "A default-off local facade exists only to test SDK and Terraform wiring",
    ],
  },
  cloudrun: {
    capabilities: [
      { operations: ["cloudrun.services-revisions"], summary: "Service and revision lifecycle", workflow: "Create or update a service and poll its long-running operation. Read back the service's latest ready revision and Ready condition, and inspect a failed revision before using the returned service URL." },
      { operations: ["cloudrun.services-revisions"], summary: "Docker container execution on service create/update", workflow: "Give LocalCloud Docker access, deploy an application image, and call it through its local URL or /run/invoke. Assert response content and test how deployment code handles a failed container launch." },
    ],
    boundaries: [
      "Opt-in: run localcloud start --services cloudrun. Runs one container per revision through local Docker, so Docker runtime access is required",
      "Jobs, domain mappings, traffic splitting, autoscaling and Secret Manager env references: use Google Cloud",
      "After a restart, redeploy services whose containers stopped",
    ],
  },
  memorystore: {
    capabilities: [
      { operations: ["memorystore.resp.commands"], summary: "Valkey RESP, Lua, Pub/Sub, streams, and transactions", workflow: "Connect a Redis-compatible client to the Valkey endpoint, select the instance's redisDb, write a key, and verify expiry or transaction behavior. Use separate channel names when testing Pub/Sub across application namespaces." },
      { operations: ["memorystore.admin-api"], summary: "Redis instance lifecycle, labels, version labels, and AUTH retrieval", workflow: "Create an instance, update labels or redisConfigs, and retrieve its AUTH string. Read redisDb from the instance and check the data plane separately from administration metadata." },
    ],
    boundaries: [
      "One shared server: database numbers don't isolate Pub/Sub channels, and AUTH and server configuration aren't enforced",
      "About 16 instance create and delete cycles per data volume; deleted databases aren't reused",
      "Multi-shard topology, managed failover, and capacity: use Google Cloud",
    ],
  },
  workflows: {
    capabilities: [
      { operations: ["workflows.workflows.management"], summary: "Workflow deployment and lifecycle", workflow: "Deploy a workflow definition, inspect its source and configuration, and update or delete it through the local API. Keep resource names scoped to the test project." },
      { operations: ["workflows.workflows.executions"], summary: "Local interpreter, standard library, and execution step history", workflow: "Execute a workflow that calls a local handler, branches on its result, and retries an expected failure. Inspect execution state and JSON step history to assert the path taken." },
    ],
    boundaries: [
      "Connector and expression coverage is limited; validate other connectors in Google Cloud",
      "Conditions must be booleans: a number, string, or missing field raises TypeError",
      "Active executions fail with InstanceRestart when LocalCloud restarts, and queued ones run afterwards; design restart tests to expect it",
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
      { operations: ["kms.locations.random", "kms.keys.lifecycle", "kms.versions.lifecycle", "kms.keys.deletion"], summary: "Locations, random bytes, keys and versions, manual rotation, scheduled destruction and restoration, and eligible deletion", workflow: "Create a key ring, key, and version; add a version and make it primary, or schedule destruction and restore the version. Inspect state transitions and test how the application handles unavailable key material." },
      { operations: ["kms.crypto.operations", "kms.crypto.asymmetric", "kms.crypto.mac"], summary: "Software-protected symmetric and asymmetric cryptography, public keys, and MACs", workflow: "Encrypt and decrypt a fixture, verify an asymmetric signature, or compute and check a MAC with a software-protected key. Assert plaintext or signature bytes and rejected inputs." },
      { operations: ["kms.crypto.kem-pq", "kms.import.lifecycle"], summary: "Post-quantum decapsulation and RSA-wrapped key imports", workflow: "Decapsulate with an ML-KEM or X-Wing key, or create an RSA-OAEP import job and submit correctly wrapped key material. Check the resulting version and operation-specific errors." },
      { operations: ["kms.iam.policies", "kms.audit.metrics", "kms.workflows.connectors"], summary: "Strict IAM, conditions, REST crypto audit entries, and authenticated Workflows connectors", workflow: "Apply a strict IAM policy and exercise allowed and denied cryptographic calls. Inspect the local audit entries of REST crypto calls, or invoke the authenticated KMS Workflows connector." },
      { operations: ["kms.cmek.secretmanager", "kms.inventory.protected-resources", "kms.autokey.key-handles"], summary: "Customer-managed encryption keys (CMEK) for Secret Manager, project inventory, and Autokey/KeyHandles", workflow: "Protect a Secret Manager secret with CMEK, then inspect its project-owned inventory entry. Exercise Autokey or KeyHandles for the supported Secret Manager resource scope." },
      { operations: ["kms.ekm.connections"], summary: "EKM connection and EKM config settings", workflow: "Create an EKM connection with service resolvers, update the project EKM config, and run the connectivity check. Verify validation errors without contacting an external key manager." },
    ],
    boundaries: [
      "Software-protected keys run locally; HSM and external key versions are refused. EKM connection settings are stored and checked locally. Hardware key custody and Google authority: use Google Cloud",
      "Automatic rotation and the end of a scheduled destruction do not run locally; create versions and set the primary yourself",
      "Inventory and Autokey cover project-owned Secret Manager resources. Folder scope and other protected resource types: use Google Cloud",
      "Key ring deletion is a local extension for empty rings; Google Cloud does not delete key rings",
    ],
  },
  cloudsql: {
    capabilities: [
      { operations: ["cloudsql.sql-admin.lifecycle", "cloudsql.mysql-managed-runtime"], summary: "Instance, database, and user lifecycle on local PostgreSQL and on-demand MySQL 8.4", workflow: "Create an instance, database, and user, then connect with psql or a MySQL driver using the endpoint and wire names the API reports. Run a migration and assert rows through the native driver." },
      { operations: ["cloudsql.instances.clone", "cloudsql.instances.execute-sql"], summary: "Instance clone and executeSql", workflow: "Clone a seeded instance and assert its tables and users in the copy. Run statements through executeSql and check results, including partialResult on large queries." },
      { operations: ["cloudsql.instances.admin-maintenance", "cloudsql.cloudsql-advanced-lifecycle"], summary: "Backup records and instance administration responses", workflow: "Create, list, and delete backup records and inspect administration responses. Export, import, restore, and replica calls return DONE without moving data." },
      { operations: ["cloudsql.ssl-certs.lifecycle", "cloudsql.instances.admin-maintenance"], summary: "Server CA discovery and client certificate records", workflow: "With LocalCloud-generated TLS, retrieve the server CA and verify the engine certificate through your driver. Issue and list client certificates; the private key is returned once." },
    ],
    boundaries: [
      "Instances share local engines. Version labels, database flags, tiers, and network settings don't create separate servers or change engine settings",
      "Backups are metadata. Export, import, restore, and replica calls return DONE without moving data; validate restore and migration results in Google Cloud",
      "MySQL runs in Docker, so Docker access is required. Project checkpoints and exports don't include Cloud SQL",
      "requireSsl, sslMode, client certificate checks, revocation, and CA rotation aren't enforced locally; validate TLS enforcement in Google Cloud",
    ],
  },
} satisfies Record<keyof typeof editorial, ServiceCompatibilityEditorial>;

export const serviceEditorial: Readonly<Record<string, ServiceEditorial>> = editorial;

export function getServiceEditorial(service: DocumentationServiceContract): ServiceEditorial {
  const value = serviceEditorial[service.id];
  if (!value) throw new Error(`Missing editorial overlay for LocalCloud service ${service.id}`);
  return value;
}
