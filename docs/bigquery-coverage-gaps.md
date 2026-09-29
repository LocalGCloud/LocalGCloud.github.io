# BigQuery Emulator Coverage & Known Boundaries

**Stack:** Native GoogleSQL (pinned ZetaSQL 2026.9.2) + DuckDB 1.5.5 OLAP Engine  
**Ports:** 5388 (REST / SQL) | 5389 (Storage Read gRPC with TLS)  
**Updated:** 2026-09-28  

---

## Executive Summary

LocalCloud's BigQuery emulator executes queries natively using Google's pinned ZetaSQL analyzer coupled directly to the DuckDB columnar OLAP execution engine. This replaces legacy SQL transpilers with authentic GoogleSQL parsing, strict type checking, and vectorized analytical query execution inside the LocalCloud container.

The emulator is continuously evaluated against a canonical census of **1,534 capabilities**:

| Dimension | Implemented | Partial | Unsupported | Unknown / Edge | Total Census |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Development** | 1,065 | 11 | 73 | 385 | 1,534 |
| **Production Parity** | 1,065 | 11 | 73 | 385 | 1,534 |

- **Implemented (1,065)**: The named developer-visible operation behaves identically to production BigQuery through SQL, REST API, or Storage API paths.
- **Partial (11)**: The core feature works locally, but specific edge variants (such as nested record tagging or specialized model types) have defined boundaries.
- **Unsupported (73)**: Cloud control-plane infrastructure, fleet reservations, or hardware-dependent features that have no local standalone equivalent.
- **Unknown / Edge (385)**: Unassessed edge cases or internal telemetry hooks.

---

## High-Level Logical Feature Categories

### 1. Machine Learning & GenAI (`BQML`)
- **Model Training**: `CREATE MODEL` for Linear Regression, Logistic Regression, K-Means clustering, Matrix Factorization, and Boosted Trees.
- **Inference & Evaluation**: `ML.PREDICT`, `ML.EVALUATE`, `ML.WEIGHTS`, and `ML.CONFUSION_MATRIX` composed into analytical queries.
- **Feature Preprocessing**: `ML.TRANSFORM` for inline scaling, normalization, and feature encoding.
- **Generative AI & LLMs**: `ML.GENERATE_TEXT` and `ML.GENERATE_EMBEDDING` connected to local OpenAI-compatible endpoints or Ollama instances.

### 2. Vector Search & Semantic Retrieval
- **Vector Operations**: Native `VECTOR_SEARCH` with distance metrics including Cosine, Euclidean, and Dot Product.
- **Index Management**: `CREATE VECTOR INDEX`, `DROP VECTOR INDEX`, and `ALTER VECTOR INDEX REBUILD`.
- **Text Analysis & Tokenization**: `SEARCH` full-text index matching, `TF_IDF`, and `BAG_OF_WORDS`.

### 3. Geospatial Analytics (GoogleSQL Geo / S2)
- **Spatial Filters & Bounds**: `ST_BOUNDINGBOX`, `ST_INTERSECTSBOX`, and planar/spherical spatial predicates.
- **Interpolation & Measurement**: `ST_LINEINTERPOLATEPOINT`, `ST_LINELOCATEPOINT`, `ST_LINESUBSTRING`, `ST_MAXDISTANCE`, and `ST_CLOSESTPOINT`.
- **Aggregation & Clustering**: `ST_CENTROID_AGG`, `ST_EXTENT`, and `ST_CLUSTERDBSCAN` (density-based spatial clustering per window partition).
- **Format Conversion**: Full GeoJSON parsing and generation (`ST_ASGEOJSON`) for points, linestrings, polygons, and geometry collections.

### 4. Security, Governance & Fine-Grained Access
- **Row-Level Security (RLS)**: Row-access policies evaluated consistently across queries, views, Storage Read API streams, tabledata exports, copy jobs, and DML updates.
- **Data Masking**: Column data masking policies using predefined rules (nullify, default, hash), custom masking routines, and Data Policy API v1 integration.
- **CEL IAM Conditions**: Role bindings evaluated at runtime using Google's Common Expression Language (`cel-expr-python`) runtime across dataset, table, and routine resources.

### 5. Advanced Storage, Versioning & Table Lifecycle
- **Time Travel**: `FOR SYSTEM_TIME AS OF` queries reading past table snapshots within the retention window.
- **Clones & Copies**: Zero-copy `CREATE TABLE CLONE` (including cross-project destinations and historical timestamp sources) and `CREATE TABLE COPY`.
- **Materialized Views**: Fast incremental aggregations with automatic query rewrites and always-fresh reads.
- **Advanced Querying**: Recursive CTEs (`WITH RECURSIVE`), Pipe SQL syntax (`|>`), wildcard tables (`_TABLE_SUFFIX`), and persistent table functions (`RETURNS TABLE`).
- **Interactive Sessions**: Stateful scripting sessions via `createSession` and `BQ.ABORT_SESSION`.

### 6. Storage Read API & Connector Ecosystem
- **Arrow IPC Streams**: High-throughput columnar reading over gRPC (port 5389 with TLS) returning Apache Arrow record batches.
- **Spark Connector**: Compatible with the official Google Cloud Spark BigQuery connector and PyArrow data pipelines.

### 7. Data Federation & External Tables
- **Federated Relational Queries**: `EXTERNAL_QUERY` bridging live PostgreSQL 16 (port 5391) and MySQL 8.4 (port 5406) instances running inside LocalCloud.
- **Object Storage Tables**: External tables queried directly from emulated Cloud Storage `gs://` buckets supporting Parquet, CSV (with automatic schema autodetect and header resolution), JSONL, Avro, and ORC.

---

## Known Boundaries: The 11 Partial Capabilities

| Category | Capability | Local Behavior & Current Boundary |
| :--- | :--- | :--- |
| **Security** | Column-Level Security (2 rows) | Root column policy tags and masking rules work fully. Policy tags on nested `RECORD` fields are refused. Taxonomy import/export across locations is not emulated. |
| **Machine Learning** | Advanced ML Models & Deep Architectures (4 rows) | Tabular regression, classification, clustering, and boosted trees work natively. Deep neural networks (`DNN_*`), imported TensorFlow graphs, and AutoML training are refused locally. `TRANSFORM` clauses reject `* REPLACE` expansions. |
| **Table DDL** | Ingestion-Time Partitioning (1 row) | Partitioning by explicit date/timestamp/integer columns (`PARTITION BY col`) is fully supported. Legacy ingestion-time pseudo-columns (`_PARTITIONTIME`, `_PARTITIONDATE`) in DDL are rejected by the pinned analyzer. |
| **Geospatial** | Specialized Snapping & Unions (3 rows) | Point and polygon operations are complete. Complex linestring snapping (`ST_SNAPTOGRID` with arbitrary multi-lines) and mixed point/polygon geometric unions lack `S2Builder` in local bindings. |
| **Connectors** | Spark Multi-Architecture Binary Profile (1 row) | The local Spark Storage Read gate passes 11/11 cases on arm64; dual-architecture verification awaits published multi-platform image digests. |

---

## Unsupported Capabilities: Cloud-Only Operations

The **73 unsupported capabilities** represent cloud-managed infrastructure, multi-tenant fleet operations, or external services that do not apply to local developer environments:

1. **Fleet & Capacity Infrastructure**:
   - Slot reservation management (`RESERVATIONS`, capacity commitments, slot leasing).
   - BI Engine in-memory caching tiers (DuckDB already executes fully in-memory).
   - Multi-tenant streaming fleet telemetry (`STREAMING_TIMELINE` grouped by minute across distributed fleets).
2. **Cloud-Managed Security & Remote Services**:
   - Customer-Managed Encryption Keys (CMEK) via physical Cloud HSM modules (LocalCloud uses local AEAD keyset chains).
   - Remote user-defined functions invoking external Google Cloud Functions or Cloud Run without local mock definitions.
   - Cloud Data Loss Prevention (DLP) remote inspection routines.
   - Analytics Hub organization-wide data exchange listings.
3. **Legacy Syntax & Remote Clouds**:
   - Legacy SQL hints (`#legacySQL`).
   - Direct querying of proprietary remote cloud object stores (AWS S3, Azure Blob) without local S3 proxy emulation.
   - Custom Unicode collation rules (`COLLATE 'und:ci'`).
