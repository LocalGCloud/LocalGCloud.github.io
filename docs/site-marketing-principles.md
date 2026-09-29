# LocalCloud Site Presentation & Content Principles

This document defines the principles and architectural pipeline for presenting LocalCloud services, features, and capabilities to developers. It establishes how raw technical documentation and verification matrices from upstream repositories (such as `localcloud`, `spanner`, `bigquery`, `dataproc`, etc.) are transformed into clean, developer-first marketing and product content on `local.cloud`.

---

## 1. Core Philosophy: Product Marketing vs. QA Audit Ledger

Upstream engineering repositories maintain granular test matrices, operation audits, and coverage ledgers (e.g., `documentation.yaml`, test reports). These exist to guide internal development and track low-level API delta.

**The website serves a different purpose:** It presents LocalCloud's value proposition to software developers, platform engineers, and AI agent builders looking to run Google Cloud workloads locally.

Presenting internal verification caveats verbatim (such as marking services "partial" because advanced global cloud operations like cross-region multi-master synchronization or petabyte-scale distributed sharding aren't simulated locally) harms developer confidence and creates confusion. Every local emulator in the industry (including LocalStack for AWS) implements a bounded local subset suitable for development and testing.

---

## 2. Fundamental Site Content Principles

### Principle 1: Two Categories Only (`Supported` vs. `Unsupported`)
- The site categorizes services into exactly two states:
  1. **Supported:** The service can be used locally for development, testing, and CI workflows.
  2. **Unsupported:** The service is not available locally (e.g., Vertex AI foundation models, Compute Engine VMs) and requires connecting to real Google Cloud or mock stubs.
- **Never tag any service as "Partial":** There is no "partial" category on the website. Developers already understand that a local runtime does not replicate an entire hyperscaler data center. Operation-level nuances are listed cleanly as capabilities and boundaries, not as a degraded tier.

### Principle 2: Default Assumption of Support
- Services listed in catalogs, navigation, and overview tables are **assumed supported by default**.
- Do not clutter service cards or tables with repetitive "Supported" badges.
- Visual status indicators should only highlight exceptions:
  - **Unsupported / Cloud-only:** Clearly tagged so developers know they need real GCP.
  - **Coming Soon / Roadmap:** Tagged if scheduled for a future release.

### Principle 3: Operational Configuration is NOT Support Status
- **Disabled-by-default ≠ Unsupported:** Services such as **Firestore** are fully supported, but disabled by default to keep LocalCloud lightweight (conserving workstation RAM and CPU). They must be marked as **Supported** with a clear note explaining how to enable them (e.g., `localcloud start --services firestore` or via `localcloud.yaml`).
- **Full Execution Emulators (e.g., Dataproc):** LocalCloud provides runtime container execution for Dataproc clusters and serverless batch jobs via Docker. Describe this capability proactively rather than highlighting internal virtualization differences.
- **Auxiliary Integration APIs (e.g., Google Sheets):** Utility services provided for other cloud services to use (such as BigQuery external tables and fixture seeding) are categorized as **Auxiliary Integration APIs**, not primary cloud services under Messaging & Workflow.

### Principle 4: Positive Capability Framing
- Frame features by what developers **can** achieve:
  - *Instead of:* "Pub/Sub does not support dead-letter queue backoff retry policies or cross-project subscription forwarding."
  - *Say:* "Pub/Sub supports topics, push/pull subscriptions, message ordering, message attributes, and dead-letter topics for local event-driven architectures."
- When noting boundaries, frame them as developer guidance:
  - *Instead of:* "BigQuery SQL emulation is incomplete and lacks 35 obscure math functions."
  - *Say:* "BigQuery supports standard SQL queries, datasets, tables, streaming ingestion, and information schema views for local analytics and application testing."

---

## 3. Data Transformation Architecture

The website codebase implements a multi-tier transformation pipeline to enforce these principles automatically:

```
┌────────────────────────────────────────────────────────┐
│               Upstream Technical Repos                 │
│  (localcloud/documentation.yaml, spanner, bq, etc.)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ scripts/sync-upstream-docs.mjs
                            ▼
┌────────────────────────────────────────────────────────┐
│            Contract Snapshot (Source of Truth)         │
│         src/data/docs-contract.snapshot.json           │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Transformation & Normalization Layer
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Editorial & Facts Layer                │
│  • src/data/services.ts         -> marketingStatus      │
│  • src/data/serviceEditorial.ts  -> positive value copy │
│  • src/data/agenticFacts.ts      -> clean agent schema  │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Astro Components & Distributed Docs
                            ▼
┌────────────────────────────────────────────────────────┐
│                 User-Facing Surfaces                   │
│  • src/pages/services/[slug].astro (Landing Pages)     │
│  • src/pages/compatibility.astro   (Matrix)            │
│  • public/llms.txt, llms-full.txt  (AI / Agent docs)   │
└────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **`scripts/sync-upstream-docs.mjs`:**
   - Synchronizes raw `documentation.yaml` from the `localcloud` engine repository into `src/data/docs-contract.snapshot.json`.
   - Generates sha256 checksums to verify integrity.

2. **Transformation Layer (`src/data/services.ts`):**
   - Maps technical statuses (`verified`, `partial`, `release-unverified`) to `marketingStatus: 'supported'`.
   - Filters out `partial` and maps status labels via `getServiceStatusLabel(service)`.
   - Identifies services that are supported but disabled by default via `isServiceDisabledByDefault(service)`.

3. **Editorial Layer (`src/data/serviceEditorial.ts`):**
   - Contains developer-centric, value-focused descriptions of each service.
   - Highlights typical developer workflows (local testing, CI test suites, SDK usage).

4. **Distributed Docs Layer (`scripts/generate-distributed-docs.mjs`):**
   - Automatically generates `public/llms.txt` and `public/llms-full.txt` from the contract snapshot.
   - Applies the two-category rule so AI assistants and LLMs reading the site receive concise, developer-first information.

---

## 4. Maintenance Checklist for Future Upgrades

When adding new services or syncing updates from upstream repositories, follow this checklist:

1. **Sync Upstream Contract:**
   ```bash
   node scripts/sync-upstream-docs.mjs
   node scripts/verify-upstream-docs.mjs
   ```

2. **Verify Marketing Status Mapping:**
   - Ensure `marketingStatus` in `src/data/services.ts` evaluates only to `'supported'` or `'unsupported'`.
   - Check that no page or component outputs the word `partial` as a status label.

3. **Review Service Editorial:**
   - Ensure the service entry in `src/data/serviceEditorial.ts` describes what developers can build and test.
   - Ensure Firestore is documented as enabled on-demand (`--services firestore`), not unsupported.
   - Ensure Dataproc highlights cluster and serverless mode execution.

4. **Regenerate Distributed Docs & Verify:**
   ```bash
   node scripts/generate-distributed-docs.mjs
   node scripts/verify-distributed-docs.mjs
   ```

5. **Full Site Build & Test:**
   ```bash
   pnpm run build
   pnpm run test:installer
   ```
   Confirm all static routes, SEO checks, and contract assertions pass cleanly.
