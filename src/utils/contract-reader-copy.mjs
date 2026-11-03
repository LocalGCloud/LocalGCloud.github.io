// Reader copy for upstream-synced contract text, applied by presentContract() so the
// docs pages and the generated llms.txt files show the same wording.

/**
 * Reader copy for upstream-synced text that the generic presentation layer cannot
 * clean up. The snapshot keeps upstream wording; these entries replace it on display
 * only. Entries are keyed by stable operation or service IDs, and each replacement
 * list replaces the whole upstream list, so re-read an entry when its upstream text
 * changes. An ID that upstream drops simply stops matching.
 */
/** @type {Record<string, { label?: string, limitations: string[] }>} */
const OPERATION_READER_COPY = {
  'bigquery.sql.query': {
    limitations: [
      'Coverage varies by function and input. Test the semantics and errors your queries depend on.',
    ],
  },
  'bigquery.information-schema': {
    limitations: [
      'COLUMNS, TABLES, SCHEMATA, PARTITIONS, VIEWS, ROUTINES, ROUTINE_OPTIONS, PARAMETERS, COLUMN_FIELD_PATHS, TABLE_OPTIONS, TABLE_STORAGE, OBJECT_PRIVILEGES, MATERIALIZED_VIEWS, JOBS_BY_*, SESSIONS_BY_*, RESERVATIONS, and search and vector index views.',
    ],
  },
  'bigquery.storage-api': {
    limitations: [
      'Storage Read and Write APIs (Avro, Arrow) over gRPC with TLS on port 5389. Clients need to trust the LocalCloud CA.',
    ],
  },
  'bigtable.admin.lifecycle': {
    limitations: [
      'Instances, clusters, app profiles, tables, column families and schema bundles, with ID and field validation, update masks, pagination, deletion protection, soft delete with 7-day undelete, and initial splits. Long-running operations are tracked. Cluster node and autoscaling settings are stored but do not change capacity.',
    ],
  },
  'bigtable.rows.data': {
    limitations: [
      'Each mutation is validated before any cell is written, so a row changes atomically. MutateRows returns per-entry codes, and idempotency tokens are honored. Aggregate families (Sum, Min, Max, HLL++), every RowFilter, SampleRowKeys, request stats, authorized-view, materialized-view and app-profile targets, and the OpenTable, OpenAuthorizedView and OpenMaterializedView session protocol are supported. ReadRows streams last_scanned_row_key progress responses. Sink cells bypass later filters, and Sink is invalid inside Condition.',
    ],
  },
  'bigtable.cli.cbt': {
    limitations: [
      'Set BIGTABLE_EMULATOR_HOST and pass -project to cbt unless the project is set in .cbtrc or gcloud. GOOGLE_CLOUD_PROJECT alone does not select the project. Table commands also need -instance. Clear stored -admin-endpoint and -data-endpoint overrides so the emulator variable applies. In open and permissive IAM modes any project and instance ID is accepted without registration; in strict mode create the instance first. Instance create, list, get and delete work over gRPC, and table and row commands work as expected.',
    ],
  },
  'bigtable.browser.console': {
    limitations: [
      'Browse rows, write cells and delete rows in the console, and manage instances, tables, app profiles, views and backups. Every console action goes to the emulator and shows its errors. Adding a row with an existing key is refused, and binary cell values are shown base64.',
    ],
  },
  'bigtable.persistence': {
    limitations: [
      'Tables, views, backups, IAM policies, long-running operations and change-stream records persist in PostgreSQL on the mounted volume and survive restarts.',
    ],
  },
  'bigtable.materialized-views': {
    limitations: [
      'Continuous materialized views are built from GoogleSQL GROUP BY or ORDER BY queries over existing tables. Views are read-only, refresh before a read when stale, and their query cannot be changed. The limit is 50 per instance and 5 per source table. Multi-column row keys use an emulator-specific encoding.',
    ],
  },
  'bigtable.query.googlesql': {
    limitations: [
      'GoogleSQL queries run through PrepareQuery and ExecuteQuery. A schema change returns FailedPrecondition (PREPARED_QUERY_EXPIRED). Logical views are queryable, including parameterized views. ST_REGIONSTATS is not available. The console SQL editor uses a separate translator.',
    ],
  },
  'bigtable.change-streams': {
    limitations: [
      'Change streams are available on tables with change_stream_config (1 to 7 day retention) and need a single-cluster app profile. Each row commit returns one grouped record, including garbage-collection and DropRowRange records, with heartbeats and resume tokens. There is one partition for the whole key space, so partition split and merge are not exercised.',
    ],
  },
  'bigtable.snapshots-backups': {
    limitations: [
      'Backups are immutable schema and row snapshots. Create, get, list (with filter, order and pagination), update, copy, delete and restore to a new table work, tables with an automated backup policy are backed up every 24 hours, and UndeleteTable restores a deleted table within 7 days. Legacy table snapshot RPCs return Unimplemented; use backups for data protection.',
    ],
  },
  'bigtable.iam': {
    limitations: [
      'IAM policies persist with etags and update masks, but they are not evaluated: TestIamPermissions grants every requested permission. In strict IAM mode the gateway requires an identified caller on port 5385.',
    ],
  },
  'bigtable.safety.forward-compat': {
    label: 'Unlisted RPCs',
    limitations: [
      'RPCs not listed here return Unimplemented rather than failing silently. Intentionally unsupported RPCs, such as legacy snapshots, hot tablets and memory layers, return Unimplemented too.',
    ],
  },
  'spanner.data-plane': {
    limitations: [
      'ExecuteSql and ExecuteStreamingSql run in the GoogleSQL and PostgreSQL dialects. StreamingRead and ExecuteStreamingSql stream whole rows with resume tokens at row boundaries. Unary ExecuteSql rejects change-stream queries. Full-text search (TOKENIZE_*, SEARCH, SNIPPET, SCORE), vector search (APPROX_*, ScaNN) and 13 graph algorithms (such as PageRank and ShortestPath) run locally. Search also works over rows written before a restart.',
    ],
  },
  'spanner.sessions-transactions': {
    limitations: [
      'Sessions (including batch-create and multiplexed), read-write, read-only and single-use transactions. SERIALIZABLE (default) and REPEATABLE_READ isolation. Lock waits follow wound-wait. Exclusive locks come from SELECT ... FOR UPDATE and LOCK_SCANNED_RANGES=exclusive. Commit-timestamp columns and commit stats are supported. A deadlock aborts exactly one transaction, and unique indexes are checked at commit.',
    ],
  },
  'spanner.iam': {
    limitations: [
      'IAM policies are stored durably and returned through native endpoints, with etag checks, but they are not evaluated. Fine-grained access control (FGAC) is enforced for sessions created with a creator_role, on queries, DML, reads, mutations and change stream reads. In strict IAM mode the gateway requires an identified caller on ports 5386 and 5387.',
    ],
  },
};

/** @type {Record<string, string[]>} */
const SERVICE_READER_COPY = {
  bigtable: [
    'Tables, backups and IAM policies persist in PostgreSQL. IAM policies are stored but not evaluated.',
    'Change streams use one partition. Multi-column materialized-view row keys use a local encoding.',
    'Legacy table snapshot RPCs return Unimplemented. Use backups instead.',
    'Project checkpoints do not capture Bigtable data. Use backups to keep it.',
  ],
  spanner: [
    'PROTO and ENUM columns can be created, but a commit that writes a non-NULL value to one fails with UNIMPLEMENTED. Rows that leave them NULL are stored.',
    'Database roles and FGAC are enforced for sessions created with a creator_role. Stored IAM policies are not evaluated.',
    'Change streams require ExecuteStreamingSql. Stream definitions, records and resume tokens survive restarts.',
    'Backups are full database copies. Customer-managed encryption keys (CMEK) are not implemented, so data is stored in plaintext.',
    'Cloud-only infrastructure (TrueTime, multi-region quorums, physical split points, tablet distribution, cross-region migration and multi-tenant compute) does not apply to local development.',
    'Project checkpoints do not capture Spanner. Use Spanner backups to keep data.',
  ],
};

/** Replacement boundaries for BigQuery feature rows, keyed by capability ID. */
const CAPABILITY_BOUNDARY_COPY = {
  'client.spark.spark-bigquery-connector-storage-read':
    'Production Storage Read IAM is not emulated. Managed-service scale and global availability are cloud-only.',
};

/** Test-matrix wording that can appear in any service limitation. */
const BUILD_JARGON = /pinned client profile/g;

/**
 * Applies reader copy after the generic presentation layer. Capability rows that share
 * one recorded boundary are shown once, since the matrix lists the same limit under
 * several IDs (for example CREATE MODEL and CREATE MODEL (BQML)).
 */
export function applyReaderCopy(contract) {
  for (const service of contract.services ?? []) {
    const serviceCopy = SERVICE_READER_COPY[service.id];
    if (serviceCopy) service.limitations = serviceCopy;
    else if (Array.isArray(service.limitations)) service.limitations = service.limitations.map((item) => item.replace(BUILD_JARGON, 'tested client profile'));
    for (const operation of service.operations ?? []) {
      const copy = OPERATION_READER_COPY[operation.id];
      if (!copy) continue;
      operation.limitations = copy.limitations;
      if (copy.label) operation.label = copy.label;
    }
  }
  if (!contract.bigqueryCoverage?.partialCapabilities) return contract;
  const seenBoundaries = new Set();
  contract.bigqueryCoverage.partialCapabilities = contract.bigqueryCoverage.partialCapabilities
    .map((capability) => ({
      ...capability,
      boundary: CAPABILITY_BOUNDARY_COPY[capability.id] ?? capability.boundary,
    }))
    .filter((capability) => {
      if (seenBoundaries.has(capability.boundary)) return false;
      seenBoundaries.add(capability.boundary);
      return true;
    });
  return contract;
}
