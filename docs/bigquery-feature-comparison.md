# BigQuery Emulator Feature Comparison

**Comparison Target:** Production Google Cloud BigQuery vs. Go Emulator (goccy/bigquery-emulator) vs. LocalCloud BigQuery (Native GoogleSQL + DuckDB 1.5.5)  
**Ports:** 5388 (REST / SQL) | 5389 (Storage Read gRPC with TLS)  
**Architecture:** Pinned Google ZetaSQL 2026.9.2 analyzer + DuckDB 1.5.5 columnar execution engine  

---

## Architecture & Platform

| Feature / Dimension | Production BigQuery | goccy/bigquery-emulator | LocalCloud BigQuery |
| :--- | :---: | :---: | :---: |
| **SQL Parser & Type Checker** | Native GoogleSQL | Go custom parser | **Native ZetaSQL 2026.9.2 (Authentic GoogleSQL)** |
| **Execution Engine** | Distributed Dremel | SQLite 3 / In-Memory Go | **DuckDB 1.5.5 Vectorized Columnar OLAP** |
| **Container Runtime** | Managed Multi-Tenant Cloud | Standalone Go binary | **Built-in LocalCloud Container (Supervisord)** |
| **Default Ports** | 443 | 9050 / 9060 | **5388 (REST) / 5389 (Storage Read gRPC)** |
| **Silent Wrong Results (Hazard Benchmark)** | 0 | 18 / 88 hazards | **0 / 88 hazards (100% fail-safe or correct)** |
| **Storage Read API (Arrow IPC)** | Yes | No | **Yes (High-throughput Arrow streaming)** |
| **Direct Spark Connector Support** | Yes | No | **Yes (11/11 qualified profiles)** |

---

## High-Level Feature Categories

### 1. Advanced SQL Dialect & Syntax

| Capability Category | Production BigQuery | goccy/bigquery-emulator | LocalCloud BigQuery |
| :--- | :---: | :---: | :---: |
| **Recursive CTEs (`WITH RECURSIVE`)** | Yes | No | **Yes** |
| **Pipe SQL Syntax (`\|>`)** | Yes | No | **Yes** |
| **Value Tables (`SELECT AS STRUCT / VALUE`)** | Yes | No | **Yes** |
| **Differential Privacy (`WITH DIFFERENTIAL_PRIVACY`)** | Yes | No | **Yes** |
| **Time Series Gap Filling (`GAP_FILL`)** | Yes | No | **Yes** |
| **Stateful Sessions & Temp Tables** | Yes | Partial | **Yes (`createSession`, `BQ.ABORT_SESSION`)** |
| **Wildcard Tables (`_TABLE_SUFFIX`)** | Yes | Partial | **Yes** |
| **Table Sampling (`TABLESAMPLE BERNOULLI`)** | Yes | Partial | **Yes** |

### 2. Machine Learning & Generative AI

| Capability Category | Production BigQuery | goccy/bigquery-emulator | LocalCloud BigQuery |
| :--- | :---: | :---: | :---: |
| **Standard BQML Models (Linear, Logistic, K-Means)** | Yes | No | **Yes (`CREATE MODEL`)** |
| **Boosted Trees & Matrix Factorization** | Yes | No | **Yes** |
| **Model Evaluation (`ML.EVALUATE`, `ML.WEIGHTS`)** | Yes | No | **Yes** |
| **Model Preprocessing (`ML.TRANSFORM`)** | Yes | No | **Yes** |
| **LLM Inference (`ML.GENERATE_TEXT`)** | Yes (Vertex AI) | No | **Yes (Local OpenAI-compatible API)** |
| **Vector Embeddings (`ML.GENERATE_EMBEDDING`)** | Yes (Vertex AI) | No | **Yes (Local OpenAI-compatible API)** |
| **Deep Neural Networks & TensorFlow Models** | Yes | No | No (Refused locally) |

### 3. Vector Search & Full-Text Retrieval

| Capability Category | Production BigQuery | goccy/bigquery-emulator | LocalCloud BigQuery |
| :--- | :---: | :---: | :---: |
| **Vector Search (`VECTOR_SEARCH`)** | Yes | No | **Yes** |
| **Vector Indexing (`CREATE VECTOR INDEX`)** | Yes | No | **Yes** |
| **Distance Metrics (Cosine, Euclidean, Dot Product)** | Yes | No | **Yes** |
| **Full-Text Search (`SEARCH` index)** | Yes | No | **Yes** |
| **Text Analysis (`TF_IDF`, `BAG_OF_WORDS`)** | Yes | No | **Yes** |

### 4. Geospatial Analytics (S2 Spherical)

| Capability Category | Production BigQuery | goccy/bigquery-emulator | LocalCloud BigQuery |
| :--- | :---: | :---: | :---: |
| **Spherical Geometry Predicates** | Yes | No | **Yes** |
| **Bounding Box Operations (`ST_BOUNDINGBOX`, `ST_INTERSECTSBOX`)** | Yes | No | **Yes** |
| **Line Interpolation (`ST_LINEINTERPOLATEPOINT`, `ST_LINESUBSTRING`)** | Yes | No | **Yes** |
| **Spatial Distance (`ST_MAXDISTANCE`, `ST_CLOSESTPOINT`)** | Yes | No | **Yes** |
| **Spatial Clustering (`ST_CLUSTERDBSCAN`)** | Yes | No | **Yes** |
| **GeoJSON Export & Parsing (`ST_ASGEOJSON`)** | Yes | No | **Yes** |
| **Specialized Line Snapping (`ST_SNAPTOGRID` on multilinestrings)** | Yes | No | Partial (Limited by local S2 bindings) |

### 5. Security & Governance

| Capability Category | Production BigQuery | goccy/bigquery-emulator | LocalCloud BigQuery |
| :--- | :---: | :---: | :---: |
| **Row-Level Security (RLS)** | Yes | No | **Yes (Enforced across all read paths)** |
| **Column Data Masking & Policy Tags** | Yes | No | **Yes (Data Policy API v1)** |
| **Conditional IAM Roles (Google CEL Engine)** | Yes | No | **Yes (`cel-expr-python`)** |
| **Cross-Location Taxonomy Replication** | Yes | No | No (Cloud managed only) |

### 6. Storage, Table Lifecycle & Federation

| Capability Category | Production BigQuery | goccy/bigquery-emulator | LocalCloud BigQuery |
| :--- | :---: | :---: | :---: |
| **Time Travel (`FOR SYSTEM_TIME AS OF`)** | Yes | No | **Yes** |
| **Zero-Copy Table Clones (`CREATE TABLE CLONE`)** | Yes | No | **Yes** |
| **Materialized Views with Always-Fresh Reads** | Yes | No | **Yes** |
| **External Tables on Object Storage (`gs://`)** | Yes | No | **Yes (CSV, Parquet, JSONL, Avro, ORC)** |
| **Relational Federation (`EXTERNAL_QUERY`)** | Yes | No | **Yes (PostgreSQL 16 & MySQL 8.4)** |
| **Slot Reservations & Hardware HSM (CMEK)** | Yes | No | No (Cloud managed infrastructure) |
