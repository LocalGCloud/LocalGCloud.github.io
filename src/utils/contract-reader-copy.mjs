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
      "Storage Read/Write API (Avro, Arrow) on port 5389, including the Spark BigQuery connector's read path.",
    ],
  },
  'bigtable.admin.lifecycle': {
    limitations: [
      'Instances, clusters, app profiles, tables, column families and schema bundles, with ID and field validation, update masks, pagination, deletion protection, soft delete with 7-day undelete, and initial splits. Long-running operations are tracked. Cluster node and autoscaling settings are stored but do not change capacity.',
    ],
  },
  'bigtable.rows.data': {
    limitations: [
      'Each mutation is validated before any cell is written, so a row changes atomically. MutateRows returns per-entry codes, and idempotency tokens are honored. Aggregate families (Sum, Min, Max, HLL++), every RowFilter, SampleRowKeys, authorized-view, materialized-view and app-profile targets, and the OpenTable, OpenAuthorizedView and OpenMaterializedView session protocol are supported. ReadRows does not emit last_scanned_row_key. Sink cells bypass later filters, and Sink is invalid inside Condition.',
    ],
  },
  'bigtable.cli.cbt': {
    limitations: [
      'Set BIGTABLE_EMULATOR_HOST and pass -project to cbt unless the project is set in .cbtrc or gcloud. GOOGLE_CLOUD_PROJECT alone does not select the project. Table commands also need -instance. Clear stored -admin-endpoint and -data-endpoint overrides so the emulator variable applies. Any project and instance ID is accepted without registration. For plaintext local use, -access-token=localcloud is optional for the tested cbt version and is not a Google credential. The data API accepts requests without credentials. Instance create, list, get and delete work over gRPC, and table and row commands work as expected.',
    ],
  },
  'bigtable.browser.console': {
    limitations: [
      'Browse rows, write cells and delete rows in the console. Instance, table and backup actions return emulator errors. Row writes and deletes, app profile and view changes, and instance or table edits made in the console are not fully validated by the emulator, so confirm them with the native client.',
    ],
  },
  'bigtable.persistence': {
    limitations: [
      'Tables, views, backups, IAM policies, long-running operations and change-stream records persist in PostgreSQL. Data persists across restarts on the mounted volume. Table metadata migrates in place on first start, and that migration is one-way.',
    ],
  },
  'bigtable.materialized-views': {
    limitations: [
      'Continuous materialized views are built from GoogleSQL GROUP BY or ORDER BY queries over existing tables. Views are read-only, refresh before a read when stale, and their query cannot be changed. The limit is 50 per instance and 5 per source table. Multi-column row keys use an emulator-specific encoding.',
    ],
  },
  'bigtable.query.googlesql': {
    limitations: [
      'GoogleSQL queries run through PrepareQuery and ExecuteQuery. Prepared-query tokens last one hour, and a schema change returns FailedPrecondition (PREPARED_QUERY_EXPIRED). Logical views are queryable. Query statistics and view parameters are not supported. The console SQL editor uses a separate translator.',
    ],
  },
  'bigtable.change-streams': {
    limitations: [
      'Change streams are available on tables with change_stream_config (1 to 7 day retention) and need a single-cluster app profile. Each row commit returns one grouped record, including garbage-collection and DropRowRange records, with heartbeats and resume tokens. There is one partition for the whole key space, so partition split and merge are not exercised.',
    ],
  },
  'bigtable.snapshots-backups': {
    limitations: [
      'Backups are immutable schema and row snapshots. Create, get, list (with filter, order and pagination), update, copy, delete and restore to a new table work, and UndeleteTable restores a deleted table within 7 days. Legacy table snapshot RPCs return Unimplemented; use backups for data protection.',
    ],
  },
  'bigtable.iam': {
    limitations: [
      'IAM policies persist with etags and update masks, but policies are permissive. TestIamPermissions grants every requested permission. The emulator is unauthenticated, so the direct gRPC listener does not enforce IAM either.',
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
      'Sessions (including batch-create and multiplexed), read-write, read-only and single-use transactions. SERIALIZABLE (default) and REPEATABLE_READ isolation. Lock waits follow wound-wait, bounded by --lock_wait_timeout_ms. Exclusive locks come from SELECT ... FOR UPDATE and LOCK_SCANNED_RANGES=exclusive. PENDING_COMMIT_TIMESTAMP and commit stats are supported. A deadlock aborts exactly one transaction, and unique indexes are checked at commit.',
    ],
  },
  'spanner.iam': {
    limitations: [
      'IAM policies are stored durably and returned through native endpoints, with etag checks. Fine-grained access control (FGAC) is enforced for sessions created with a creator_role, on queries, DML, reads, mutations and change stream reads. Unauthenticated emulator connections bypass network IAM.',
    ],
  },
};

/** @type {Record<string, string[]>} */
const SERVICE_READER_COPY = {
  bigtable: [
    'Tables, backups and IAM policies persist in PostgreSQL. IAM is permissive and is not enforced on the gRPC listener.',
    'Change streams use one partition. The HLL++ and multi-column materialized-view row-key encodings differ from Cloud Bigtable.',
    'Legacy table snapshot RPCs return Unimplemented. Use backups instead.',
    'Row writes and some admin edits made in the console are not validated by the emulator. Confirm them with the native client.',
  ],
  spanner: [
    'PROTO and ENUM columns can be created, but a commit that writes a non-NULL value to one fails with UNIMPLEMENTED. Rows that leave them NULL are stored.',
    'Database roles and FGAC are enforced for sessions created with a creator_role. Unauthenticated emulator connections bypass network IAM.',
    'Change streams require ExecuteStreamingSql. With --data_dir, stream definitions, records and resume tokens survive restarts.',
    'Backups require --data_dir and are full database copies. Customer-managed encryption keys (CMEK) are not implemented, so data is stored in plaintext.',
    'Cloud-only infrastructure (TrueTime, multi-region quorums, physical split points, tablet distribution, cross-region migration and multi-tenant compute) does not apply to local development.',
    'Exports and project checkpoints record Spanner instance and database names and table counts, not schema or rows. A checkpoint restore leaves Spanner unchanged, so use Spanner backups to keep data.',
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
