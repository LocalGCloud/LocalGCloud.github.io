<!-- gortex:communities:start -->
## Community Skills

| Area | Description | Explore |
|------|-------------|---------|
| Data 2 Dirs | 33 symbols | `analyze(operation:"communities", id:"community-20")` |
| Components 5 Dirs | 32 symbols | `analyze(operation:"communities", id:"community-23")` |
| Pages 8 Dirs | 27 symbols | `analyze(operation:"communities", id:"community-29")` |
| Components 8 Dirs | 22 symbols | `analyze(operation:"communities", id:"community-28")` |
| Scripts 2 Dirs Replace | 19 symbols | `analyze(operation:"communities", id:"community-30")` |
| Public | 19 symbols | `analyze(operation:"communities", id:"community-1")` |
| 1 Dirs Assert | 16 symbols | `analyze(operation:"communities", id:"community-7")` |
| Scripts 1 Dirs Push | 14 symbols | `analyze(operation:"communities", id:"community-11")` |
| Data Glossary | 12 symbols | `analyze(operation:"communities", id:"community-15")` |
| Scripts 1 Dirs Finalizecsp | 11 symbols | `analyze(operation:"communities", id:"community-2")` |
| Scripts 2 Dirs Validateseeddocument | 11 symbols | `analyze(operation:"communities", id:"community-4")` |
| Data 1 Dirs | 10 symbols | `analyze(operation:"communities", id:"community-19")` |
| 1 Dirs Createarchive | 10 symbols | `analyze(operation:"communities", id:"community-9")` |
| 1 Dirs Servicepage | 10 symbols | `analyze(operation:"communities", id:"community-17")` |
| Scripts 2 Dirs Handlerequest | 9 symbols | `analyze(operation:"communities", id:"community-31")` |
| Layouts 1 Dirs | 7 symbols | `analyze(operation:"communities", id:"community-27")` |
| Data Getserviceeditorial | 5 symbols | `analyze(operation:"communities", id:"community-22")` |
| 1 Dirs Log | 5 symbols | `analyze(operation:"communities", id:"community-3")` |
| Components Updateurls | 3 symbols | `analyze(operation:"communities", id:"community-13")` |
| 1 Dirs Stripevidencetag | 3 symbols | `analyze(operation:"communities", id:"community-25")` |

<!-- gortex:communities:end -->

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->

## Agent Instructions: Site Presentation, Content & Build Verification

All coding agents working on `localcloud-site` must follow these non-negotiable directives when reviewing, modifying, or creating site content and documentation.

### 1. Product Marketing Principles (Content Transformation)

User-facing content on `local.cloud` presents LocalCloud's value proposition to developers and AI agent builders. It transforms technical QA audit data and upstream engine verification ledgers into clear, capability-oriented presentations:

1. **Two Categories Only:** A service is either **Supported** or **Unsupported**.
   - **Never mark or badge any service as "Partial".** It is understood that all local cloud emulators operate within bounded local semantics for testing and CI.
   - Do not display badges or text like "Partial local emulation", "partial support", or "partially supported".
2. **Default Assumption of Support:**
   - Services in catalogs, navigation lists, and overview matrices are assumed supported by default.
   - Do not clutter service cards or tables with redundant "Supported" badges.
   - Only explicitly unsupported services (e.g. Vertex AI, Compute Engine) receive callout badges ("Unsupported" / "Cloud-only").
3. **Operational Configuration ≠ Support Status:**
   - **Firestore** is fully supported (disabled by default to conserve workstation resources; opt-in with `--services firestore` or in `localcloud.yaml`). Never classify Firestore as unsupported.
   - **Dataproc** is supported (runs clusters and serverless batch jobs via local Docker container runtimes).
4. **Positive Capability Framing:**
   - Frame features around what developers and CI suites can achieve locally rather than internal audit limitations.

See [docs/site-marketing-principles.md](file:///Users/jsenjaliya/src/AI/localcloud-site/docs/site-marketing-principles.md) for complete architectural specifications.

---

### 2. Upstream Documentation Ingestion Workflow

When syncing or reading technical documentation from upstream repositories (e.g., `localcloud`, `spanner`, `bigquery`, `dataproc`):

1. **Sync Contract:** Run `node scripts/sync-upstream-docs.mjs` and `node scripts/verify-upstream-docs.mjs` to update and verify `src/data/docs-contract.snapshot.json`.
2. **Apply Normalization:** Ensure `marketingStatus` in `src/data/services.ts` maps all active technical states (`verified`, `partial`, `release-unverified`) to `'supported'`.
3. **Draft Positive Editorial:** Author capability-oriented value copy in `src/data/serviceEditorial.ts` highlighting workflows (unit tests, integration test suites, local Docker execution).
4. **Regenerate Distributed Docs:** Run `node scripts/generate-distributed-docs.mjs` and `node scripts/verify-distributed-docs.mjs` to update `public/llms.txt` and `public/llms-full.txt`.

---

### 3. Mandatory Build & Verification Protocol

Before completing any task or proposing changes, agents **MUST** execute and pass the automated verification pipeline:

```bash
# 1. Full 13-stage build pipeline (contract checks, policy checks, Astro build, SEO checks, content facts)
pnpm run build

# 2. Installer verification test suite
pnpm run test:installer

# 3. Refresh context graph if symbols, signatures, or files changed
graft build
```

Any build failure or assertion error must be resolved before finalizing. See [BUILD.md](file:///Users/jsenjaliya/src/AI/localcloud-site/BUILD.md) for stage-by-stage pipeline details.

