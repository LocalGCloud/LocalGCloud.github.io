# LocalCloud Documentation Accuracy Audit

**Audit date:** 2026-08-13  
**Site repository:** `localcloud-site`  
**Primary product repository:** `../localcloud`  
**Dependency repositories:** `../local_cloud_dependencies`  
**Audience:** LocalCloud users  
**Scope:** All public tutorials, how-to guides, reference pages, explanations, generated agent content, and LLM-facing files  
**Deliverable:** Findings and update plan only; no public documentation was changed

## Remediation status — 2026-08-13

The audit below is retained as the original evidence record. The approved contract-first remediation has since updated the public documentation in `localcloud-site`; sibling runtime and CLI repositories were not modified.

| Finding cluster | Status | Remediation and verification |
| --- | --- | --- |
| Root operator routes, project default, ports, and CLI-first setup | Resolved | Schema-v2 contract, CLI-first tutorial, loopback/manual boundaries, and cross-surface route scans; `verify-docs-contract`, `verify-cli-docs`, and `verify-doc-examples`. |
| Seed and Terraform workflows | Resolved with runtime-test exception | Accepted YAML envelopes, registrar limits, Terraform mode-before-start, provider-v7 credentials, routing modes, and readiness are source-validated. No qualified assembled image was available for end-to-end apply/seed qualification. |
| 27-service catalog and compatibility | Resolved | 27 overlays/icons, 27 catalog/detail routes, and 27 agent-testing routes are contract-derived with evidence state, tier, defaults, persistence, and operation limits. |
| BigQuery, Bigtable, and Spanner claims | Public wording resolved; release qualification pending | Fixed totals/parity claims and PGAdapter errors were removed. Feature-specific release-unverified references now require immutable dependency and assembled-image evidence. |
| Runtime privacy and website analytics | Disclosure resolved; product controls pending | Runtime telemetry fields/cadence/queue and other egress paths plus website PostHog events are disclosed. A zero-event runtime opt-out, ordinary TLS verification, site consent/opt-out, and a complete retention schedule remain product decisions. |
| Governing license and team/commercial claims | Public wording resolved; product decision pending | Public pages follow the proprietary root license and separate technical tiers from legal permission. The reviewed license still offers no commercial grant. |
| Agent Skills, AI/LLM, and runtime MCP links | Resolved | LLM files are generated from the contract; skills use CLI/root-route defaults; site copy points to the runtime-owned MCP guide; repository-wide forbidden-pattern scans run in `verify-distributed-docs`. |
| Unsupported marketing and vendor comparisons | Resolved | Savings/latency/startup/parity statistics were removed or replaced by evidence methodology; unvalidated vendor counts and broad comparisons were omitted. |
| Installer and released CLI behavior | Partially resolved | Installer mechanics and current checkout commands are validated, but the exact checksummed released CLI artifact is not qualified end to end. |

### Residual release and product blockers

1. Record a qualified immutable LocalCloud image digest and release association; the reviewed mutable image remains release-unverified.
2. Qualify the exact released CLI artifact—not only the checkout or mock installer—across `doctor`, `start`, `status`, `env`, `console`, and `stop`.
3. Pin and qualify BigQuery, Bigtable, and Spanner dependency identities with source/module/image digests, assembled-image smoke results, durable evidence paths, and release association.
4. Reconcile and qualify Cloud SQL's registry-default-on versus container-environment-default-off behavior.
5. Decide whether runtime telemetry opt-out must emit zero events and replace the telemetry trust-all TLS client; define website analytics consent/opt-out, retention, and request handling.
6. Decide the intended commercial/team/organization license model. Technical Pro access and CI capability do not supply permission under the current agreement.
7. Execute Cloud Storage, seed, Terraform, and dependency-sensitive examples against a qualified assembled image; current documentation records the unavailable-artifact exception instead of inferring success.

**Current repository validation:** 27 contract services, 27 service detail routes, 27 agent-testing routes, and 119 static pages build successfully. Fast contract, CLI, example, policy, distributed-doc, installer, rendered-doc, SEO, and product-fact checks are wired into `pnpm build`.

## Executive summary

The site builds successfully, but much of its technical documentation does not describe the current LocalCloud runtime. The most serious issues affect commands users are expected to copy, privacy and licensing statements, seed/Terraform workflows, the service catalog, and service capability claims.

The audit found four release-blocking documentation classes:

1. **Broken setup instructions.** The site uses nonexistent `/_localcloud/*` API paths, obsolete or internally inconsistent port mappings, a Docker image name that differs from the runtime launcher, and a stale default project ID.
2. **Contradicted policy statements.** The privacy page says the software sends no telemetry and makes no outbound requests, while the runtime implements default-on PostHog telemetry and other outbound checks. The licensing and team-CI positioning conflicts with the repository's governing license.
3. **Incomplete and inaccurate service reference.** The runtime registry has 27 services; the site models 18. Nine services are absent, tier information is missing, Cloud SQL is misclassified, and several capability summaries are stale.
4. **Unversioned dependency claims.** BigQuery, Bigtable, and Spanner capability documentation is not reliably tied to the exact dependency revision shipped by LocalCloud. Revalidation against `../local_cloud_dependencies` changed several initial findings, proving that release provenance must precede further capability edits.

The current `pnpm build` succeeds and reports **89 pages built**, with static SEO verification passing for 23 priority routes. This means the existing verification checks syntax and selected content facts, but not runtime/documentation parity.

## Source-of-truth rules

Conflicts were resolved in this order:

1. The dependency revision actually assembled into the LocalCloud image, plus its executable tests and current implementation.
2. LocalCloud runtime registration and generated contracts: `../localcloud/localcloud-server/src/main/**`, `../localcloud/services.yaml`, and `../localcloud/specs/api/**`.
3. LocalCloud tests and release qualification.
4. Container wiring: `Dockerfile`, `docker/**`, `start.sh`, and `build.sh`.
5. Exercised examples and Terraform qualification.
6. Current prose documentation.
7. Plans, historical reports, generated snapshots, and marketing context.

For BigQuery, Bigtable, and Spanner, dependency-head behavior was not automatically treated as shipped behavior. A capability is publishable as current LocalCloud behavior only when the assembled image identity and integration are verified.

## Documentation inventory

The public and distributed documentation includes:

- Hand-authored `/docs/` pages under `src/pages/docs/`.
- Product and task pages under `src/pages/*.astro`.
- 18 generated service pages from `src/data/services.ts`.
- Generated agent, workflow, comparison, glossary, blog, and agent-testing routes from `src/data/agenticContent.ts`.
- AI-facing HTML and Markdown under `src/pages/ai/**`.
- `public/llms.txt`, `public/llms-full.txt`, and the CLI installer at `public/install.sh`.
- Distributed agent guidance under `agent-skills/**`.
- Public links to the runtime repository’s canonical MCP integration guide.

### Coverage ledger

| Documentation family | Review status | Disposition |
| --- | --- | --- |
| Astro/MDX public routes | Reviewed | Page-family findings and plan below. |
| Generated services and agentic routes | Reviewed | Shared facts are stale; regenerate after canonical contracts are fixed. |
| AI/LLM Markdown and text files | Reviewed | Broken setup facts repeat across HTML, Markdown, and `llms` files. |
| Agent skills | Pattern-audited | 17 files contain stale routes, image/project facts, legacy ports, or unsupported command assumptions. |
| Runtime MCP links | Reviewed | Site copy must link to the runtime-owned integration guide rather than duplicate MCP implementation facts. |
| CLI installer | Sampled | It installs a separately released CLI and publishes `localcloud console`/`localcloud env`; command accuracy requires auditing that release repository, which is outside the supplied local source set. |
| Repository-internal operations/plans | Excluded unless published | Used as supporting evidence only, not treated as current user documentation. |
| External vendor documentation | Excluded by instruction | Vendor comparisons remain unvalidated. |

Primary Diátaxis classification:

| Type | Main surfaces |
| --- | --- |
| Tutorial | `/docs/`, `/immersive-demo/` |
| How-to | SDK examples, seed data, Terraform, console, agent sandboxes, service agent-testing pages, workflow pages, local/CI setup pages |
| Reference | Configuration, compatibility, service catalog/detail pages, feature matrices, FAQ, licensing, privacy, glossary, AI/LLM Markdown |
| Explanation | Architecture, emulator concepts/comparisons, product pages, blog, cost and local-development pages |

The highest duplication risk is BigQuery, followed by the six dedicated emulator pages and generated service/agent content. Docker commands, endpoint paths, service counts, and compatibility claims are copied across many source families.

## Critical findings

### 1. Control API paths are wrong across the site

**Severity:** Critical

The site publishes `/_localcloud/health`, `/_localcloud/env`, `/_localcloud/seed`, and related paths. Current runtime registrations and generated contracts use root paths such as:

- `/health`
- `/env`
- `/seed`
- `/reset`
- `/services`
- `/terraform/readiness`

Affected sources include:

- `src/pages/docs/index.mdx`
- `src/pages/docs/configuration.mdx`
- `src/pages/docs/faq.mdx`
- `src/pages/docs/sdk-examples.mdx`
- `src/pages/docs/seed-data.mdx`
- `src/pages/docs/terraform.mdx`
- `src/data/agenticFacts.ts`
- `src/data/agenticContent.ts`
- `public/llms-full.txt`

**Runtime evidence:** `../localcloud/localcloud-server/src/main/java/com/localcloud/LocalCloudApplication.java`, `admin/EnvService.java`, `admin/SeedService.java`, and `../localcloud/specs/api/openapi/localcloud.json`.

**Action:** Replace the stale prefix everywhere and generate shared operator URLs from the API contract or a single site fact source.

### 2. Docker quick starts use incompatible image and port contracts

**Severity:** Critical

The site commonly uses `jaysen2apache/localcloud` and legacy host remappings, then tells users to connect to ports `24080-24089`. Some commands map `8080:24080`, `4443:24081`, or `6379:6379`, making the later localhost instructions fail.

The runtime launcher uses `localcloud/localcloud:latest` and publishes the canonical fixed port range. Runtime services use `24080-24092`; optional transparent networking uses `24093-24095`.

**Evidence:**

- Site: `src/data/productFacts.ts:13`, `src/data/agenticFacts.ts:49-50`, multiple docs and Astro quick starts.
- Runtime: `../localcloud/start.sh`, `../localcloud/services.yaml`, and `../localcloud/Dockerfile`.

**Action:** First decide and pin the supported distribution image. Then replace every command atomically with loopback-bound, one-to-one mappings. Do not mount the Docker socket in the default quick start; document it only for host-runtime services that require it.

### 3. Seed-data examples are not accepted by the runtime

**Severity:** Critical

`src/pages/docs/seed-data.mdx` uses unsupported keys and shapes:

- `storage` instead of `gcs`
- flat `secrets` instead of `secretmanager.secrets`
- nested BigQuery tables rather than the current top-level table list
- Firestore seeding even though Firestore is not an implemented seed registrar

**Evidence:** `../localcloud/localcloud-server/src/main/java/com/localcloud/admin/SeedService.java` and `../localcloud/seed.yaml`.

**Action:** Replace the page with tested minimal fixtures derived from the checked-in seed contract. Clearly label supported seed services and partial/unsupported behavior.

### 4. Terraform quick start overstates zero-change compatibility

**Severity:** Critical

The page claims a generic provider `>=5.0`, `/dev/null` credentials, no provider changes, and universal custom-endpoint behavior. Exercised LocalCloud material uses provider 7.x, requires a syntactically valid fake service-account file for current provider behavior, and needs transparent DNS/TLS for resources that ignore custom endpoints. BigQuery requires special routing, and the endpoint table does not match generated `/env?format=terraform` output.

**Evidence:**

- Site: `src/pages/docs/terraform.mdx`.
- Runtime: `../localcloud/terraform/TERRAFORM_SETUP.md`, exercised examples, `admin/EnvService.java`, and `/terraform/readiness`.

**Action:** Rewrite as two workflows: endpoint-only resources and transparent-network resources. Publish the tested provider version, credentials setup, readiness check, certificate requirements, and exact supported resources.

### 5. Software privacy statements contradict runtime telemetry

**Severity:** Critical

`src/pages/docs/privacy.mdx` says the software sends no telemetry, does not phone home, makes no outbound connections unless configured, and transmits no data. The runtime implements default-on PostHog startup events, hourly heartbeats, persisted retry, system/service metadata, and an error-event method that appears currently unwired, plus other outbound checks.

**Evidence:**

- `../localcloud/localcloud-server/src/main/java/com/localcloud/admin/TelemetryService.java`
- `../localcloud/docker/docker-entrypoint.sh`
- `../localcloud/localcloud-server/src/test/java/com/localcloud/admin/TelemetryServiceTest.java`

The website privacy section also understates PostHog collection: page views, interaction autocapture, search text, feedback events, and optional free-text comments are sent from `BaseLayout.astro`, `SearchModal.astro`, `DocFeedback.astro`, and `FeedbackFab.astro`.

**Action:** Replace categorical no-collection/no-sharing statements with an accurate data inventory, processor disclosure, event fields, identifiers, storage/retention, retry behavior, opt-out behavior, and user controls. Runtime changes are required if the intended promise is truly zero telemetry.

### 6. Distributed agent and installer guidance also carries stale facts

**Severity:** Critical

The same broken operator contract is distributed outside the website pages:

- `agent-skills/**`: 17 files contain stale API routes, Docker image/project facts, legacy ports, or command assumptions. Examples include `agent-skills/skills/localcloud-sdk-tests/references/sdk-tests.md`, `localcloud-ci-sidecar/SKILL.md`, and `localcloud-seed-data/references/seed-data.md`.
- `public/install.sh`: installs a separately released CLI and recommends `localcloud console` and `localcloud env`. The CLI implementation is not present in the supplied product repository, so these commands cannot be validated from `../localcloud`; they require release-repository and artifact verification.

**Action:** Include distributed skills in the same canonical-facts migration as the site. Audit the separate CLI release before retaining installer command guidance, and add cross-surface stale-string/contract tests.

### 7. Licensing and team-use positioning conflict with the governing license

**Severity:** Critical

The site markets free developer use, company CI, team onboarding, and cost savings. The governing `../localcloud/LICENSE` restricts use to an individual acting personally and excludes employer/commercial workflows, cost-saving commercial advantage, and team CI. It also states that no commercial license is currently available.

**Affected surfaces:** Homepage, licensing, FAQ, CI/how-to pages, cost pages, product facts, AI content, and generated workflows.

**Action:** Treat this as a legal/product decision before copy editing. Either change the governing license or remove commercial/team/CI adoption claims. Separate the legal use boundary from the technical “validate against real GCP” boundary.

## High-priority technical findings

### Service catalog parity

The runtime registry contains **27 services**; `src/data/services.ts` contains **18**. Missing site services are:

1. Google Sheets
2. Cloud Scheduler
3. Cloud Functions
4. AlloyDB
5. Dataproc
6. Cloud IAM
7. Cloud Resource Manager
8. Service Usage
9. Cloud Billing

Consequences:

- No catalog cards or service detail routes.
- Missing compatibility cards.
- AI/LLM metadata is incomplete.
- Hard-coded “20+” claims coexist with only 18 generated cards.

The site also lacks tier data, although the runtime enforces Community/Pro boundaries. Cloud SQL, Vertex AI, and KMS are materially misclassified; Cloud Workflows has the wrong protocol; several other summaries overstate partial behavior.

**Action:** Have the runtime publish a versioned documentation contract derived from `services.yaml` and per-service compatibility data; consume that immutable artifact in the site rather than coupling builds to an adjacent checkout. Keep site-only fields—slug, category, icon, prose—in a small overlay. Add parity tests for IDs, ports, protocols, default enablement, tier, and coverage status.

### Configuration and architecture

- Default project is `local-gcp-project`, not `local-project`.
- IAM `strict` and `gcp-live` behavior is misdescribed.
- Configuration omits many service toggles and all tier effects.
- Architecture uses obsolete ports and implementation descriptions.
- Console documentation incorrectly calls the Data Browser read-only.
- Cloud SQL's registry and image defaults conflict and must be reconciled before documentation is updated.

### Service-specific overclaims outside the dependency revalidation

- Firestore security rules, listeners, query/index behavior, and seed behavior are presented more confidently than current integration evidence permits.
- Cloud Storage lifecycle, multipart, signed URL, and advanced-operation claims exceed the maintained LocalCloud compatibility contract.
- Pub/Sub persistence claims are wrong: the external emulator is volatile and reseeded after restart.
- CI pages promise emulator/production equivalence that the compatibility records explicitly do not guarantee.

## Corrected dependency-backed findings

The initial audit was re-run against `../local_cloud_dependencies` for BigQuery, Bigtable, and Spanner. The corrections below supersede findings based only on LocalCloud's aggregate compatibility YAML.

### BigQuery

**Dependency reviewed:** `bigquery-emulator-on-duckdb` at local HEAD `ebf8580f...`.

The dependency contains newer behavior than LocalCloud's compatibility summary, including implementations or tests for grouping extensions, TABLESAMPLE, search/vector behavior, additional `INFORMATION_SCHEMA` surfaces, and nuanced BIGNUMERIC/AEAD/NET support. Therefore, blanket statements that these features are entirely unimplemented should not be used.

However, LocalCloud does not currently prove that it ships this revision:

- The image input is mutable.
- `ci/bigquery-emulator.lock.json` lacks the required immutable identity and qualification data.
- LocalCloud's compatibility summary and dependency docs represent different generations.

**Revised action:**

1. Pin the exact BigQuery source revision and image digest.
2. Qualify the assembled LocalCloud candidate.
3. Regenerate LocalCloud compatibility data from that pinned result.
4. Remove all current exact totals—813, 932, 936, 958, 175+, 200+—and do not imply `~96%` is calculated from them.
5. Describe grouping extensions and TABLESAMPLE as upstream-tested but LocalCloud-release-unverified until qualification.
6. Keep scripting, materialized views, external tables, Storage API, search/vector, BIGNUMERIC, AEAD, and NET claims explicitly partial and bounded.
7. Replace the fixed “11 INFORMATION_SCHEMA views” claim with status-aware categories: populated/tested, schema-only stub, unknown, and unsupported.
8. Archive or regenerate the April gap/comparison documents; they are historical analyses presented as current reference.
9. Keep the finding that broad multi-language SDK compatibility needs an assembled, executable client matrix.

### Bigtable

**Dependency reviewed:** `little_bigtable` current HEAD `9891802...`; LocalCloud requests fork module `v0.0.1`.

The prior instruction to remove change streams, app profiles, cluster CRUD, backup APIs, IAM stubs, and logical views is **conditionally retracted** based on the inspected machine-local module cache. That cached `v0.0.1` artifact includes those surfaces, while current dependency HEAD does not. Because Docker resolves mutable `v0.0.1` with checksum verification disabled—and the checked-out tag and cache identify different commits—these are **observed cached-artifact capabilities, not deterministically integrated LocalCloud behavior**. This mismatch is a release blocker.

**Candidate status wording after immutable resolution and assembled-image qualification:**

- Change streams: partial, single-partition local implementation.
- Clusters and app profiles: metadata CRUD only; no topology/routing fidelity.
- Backups: metadata lifecycle and schema-only restore, not row recovery.
- IAM: permissive non-enforcing stub; policy storage is not production IAM.
- Logical views: metadata CRUD; query is not executed.
- Materialized views: functional local implementation with no backfill and limited parser/schema behavior.
- GoogleSQL: unsupported.
- Replication, failover, multi-region behavior, CMEK, and production IAM enforcement: unsupported.
- Persistence: LocalCloud uses PostgreSQL; standalone dependency behavior differs.

**Revised action:**

1. Pin the exact fork revision instead of relying on a mutable/inconsistent `v0.0.1` resolution.
2. Retain the extended features, but downgrade them to the bounded statuses above.
3. Regenerate LocalCloud's stale Bigtable compatibility YAML from the integrated artifact.
4. Revise the support legend so “Supported” means implemented for documented local workflows, not production API parity.
5. Run release-level gRPC and persistence tests before presenting the matrix as verified.

### Spanner

**Dependency reviewed:** `cloud-spanner-emulator` at local HEAD `462bfd5...`, plus the local Spanner Omni image contents.

Confirmed runtime ports:

- `24085`: Spanner gRPC
- `24086`: REST/grpc-gateway

The site's psycopg2/SQLAlchemy example targets `24086` as PostgreSQL wire protocol and cannot work. LocalCloud supports the Spanner PostgreSQL dialect through the Spanner API, but does not package PGAdapter as a separate PostgreSQL-wire service.

**Corrected capability findings:**

- Keep `MERGE` unsupported.
- TABLESAMPLE is partial: BERNOULLI/RESERVOIR supported; SYSTEM/REPEATABLE unsupported.
- Retract the blanket “change streams unsupported” claim; current dependency implements bounded GoogleSQL and PostgreSQL-dialect change streams, pending assembled-image verification.
- Treat LocalCloud's Spanner IAM gateway as a partial permissive stub; production IAM enforcement remains unsupported. Keep Cloud Spanner Backup APIs unsupported.
- Distinguish internal safety snapshots from Cloud Spanner Backup API support.
- Persistence uses LevelDB row storage plus metadata; document mounted-volume lifecycle and recovery caveats.
- Remove or substantiate the site's “95% feature coverage” claim.

**Revised action:** Remove the current SQLAlchemy example, use the tested official Spanner SDK on `24085`, correct all port labels, update compatibility from a pinned revision, and add negative tests proving `24086` is not a PostgreSQL-wire listener.

## Unsubstantiated claims

The following claims were not proven by repository-local evidence. They should be removed, framed as hypothetical examples, or backed by dated methodologies:

- `$100–500+` per developer/month savings.
- `$5–50` per CI run and `$3K–10K+` monthly CI costs.
- 40–60%, 50–80%, 70–90%, and 90% savings claims.
- Universal under-60-second startup.
- Sub-millisecond or microsecond latency comparisons.
- “Emulators catch 95%+ of issues.”
- Exact Google/AWS/Azure emulator counts and vendor comparisons.

External vendor claims were not validated because this audit was restricted to repository-local sources.

## Page-family disposition

| Family | Disposition |
| --- | --- |
| Getting started/configuration | Rewrite commands from current runtime contracts; current copy is unsafe to follow. |
| Seed data | Rewrite from tested seed fixtures. |
| Terraform | Rewrite around tested provider/version and two networking modes. |
| Privacy/licensing | Block on policy/legal reconciliation; publish corrected disclosure urgently. |
| Service catalog/compatibility | Generate from runtime registry and compatibility artifacts. |
| BigQuery docs | Pin and qualify dependency, then regenerate; archive historical analyses. |
| Bigtable docs | Retain extended features with partial/stub boundaries after pinning integrated revision. |
| Spanner docs | Correct ports and remove PGAdapter/psycopg2 claims; revise change-stream/TABLESAMPLE status. |
| Other emulator pages | Correct overclaims and volatility/persistence semantics from integration evidence. |
| AI/LLM files | Regenerate after canonical facts are corrected; currently repeat broken commands. |
| Cost/marketing pages | Remove or source quantified assertions. |

## Finding-to-plan traceability

| Finding | Main surfaces | Authority | Gate/owner | Phase | Verification |
| --- | --- | --- | --- | --- | --- |
| Broken API routes and Docker contract | Docs, Astro pages, AI/LLM files, and skills | Runtime contracts, `services.yaml`, launcher | Distribution owner | Immediate containment, Phase 1 | Execute every published quick start against qualified image. |
| Installer and CLI commands | `public/install.sh` and install guidance | Released CLI repository plus checksummed binary | CLI release owner | Immediate containment, Phase 1 | Verify `doctor`, `start`, `console`, and `env` from the exact released artifact. |
| Seed and Terraform workflows | Seed/Terraform docs and workflows | `SeedService`, tested Terraform setup | Runtime/integration owner | Immediate containment, Phase 1 | Run published fixtures and both Terraform networking modes. |
| Privacy/telemetry contradiction | Privacy page and all analytics-enabled routes | Runtime telemetry and site analytics code | Privacy/product owner | Immediate disclosure + Phase 0 decision | Event inventory review and egress/opt-out tests. |
| Licensing/team-use contradiction | Homepage, licensing, CI, cost, AI content | Governing `LICENSE` | Legal/product owner | Immediate suppression + Phase 0 decision | Legal approval and cross-site claim scan. |
| Incomplete service catalog | Catalog, compatibility, config, AI metadata | Versioned runtime documentation contract | Runtime + docs owner | Phase 2 | Exact 27-ID and metadata parity test. |
| BigQuery provenance/capabilities | All BigQuery surfaces | Pinned dependency + assembled qualification | Release owner | Phase 0, Phase 3 | Source/image/assembled digest and qualification artifact. |
| Bigtable provenance/capabilities | All Bigtable surfaces | Pinned module checksum + assembled qualification | Release owner | Phase 0, Phase 3 | Clean resolution, gRPC matrix, persistence tests. |
| Spanner ports/capabilities | All Spanner surfaces | Pinned source/image + assembled qualification | Release owner | Phase 1, Phase 3 | SDK/REST smoke tests and negative PostgreSQL-wire test. |
| Other service overclaims | Service pages and workflow guides | Operation-level compatibility evidence | Service owners | Phase 4 | Evidence-backed per-operation review. |
| Quantified marketing claims | Cost, startup, latency, comparison pages | Dated methodology/benchmarks | Product marketing | Phase 4 | Source ledger and reproducible benchmark/calculator. |

## Prioritized update plan

### Immediate harm containment

Do not wait for unrelated product decisions before reducing active user harm:

1. Temporarily remove or flag broken quick starts, invalid seed/Terraform snippets, and the Spanner psycopg2 example.
2. Correct or temporarily replace categorical privacy and licensing statements with reviewed notices.
3. Stop MCP/agent skills from emitting known-broken routes and port mappings.
4. Temporarily remove or mark `localcloud console` and `localcloud env` installer guidance as unverified until the released CLI artifact passes command-level validation.
5. Mark dependency-sensitive feature matrices as release-unverified until provenance is established.

**Exit criteria:** No actively promoted workflow is known to fail or materially misstate privacy/licensing behavior.

### Phase 0 — Product, legal, and release decisions

1. Decide the supported Docker image/repository.
2. Reconcile the governing license with intended team, CI, and commercial positioning.
3. Decide intended telemetry/privacy behavior and whether runtime changes are required.
4. Reconcile Cloud SQL's registry default with the image environment override.
5. Pin immutable BigQuery, Bigtable, and Spanner dependency identities.

For each dependency, record the source commit, module checksum where applicable, dependency image digest, assembled LocalCloud image digest, qualification result, evidence path, and release association.

**Exit criteria:** Approved decisions exist for distribution, licensing, telemetry, Cloud SQL default, and dependency provenance; every dependency identity is reproducible from recorded artifacts.

### Phase 1 — Stop users copying broken instructions

1. Fix all root control API routes.
2. Replace Docker commands and port mappings.
3. Correct the default project ID.
4. Remove the unsafe default Docker-socket mount.
5. Replace invalid seed and Terraform quick starts.
6. Remove the Spanner psycopg2/SQLAlchemy example.
7. Audit the separately released CLI and checksummed binary before retaining installer commands; verify `doctor`, `start`, `console`, and `env`.
8. Correct the privacy page and legal availability statements.

**Exit criteria:** Every quick start can be executed against the qualified image, and policy pages match current behavior.

### Phase 2 — Establish generated technical truth

1. Generate and publish a versioned runtime documentation contract from `services.yaml` and compatibility records.
2. Consume that immutable contract in the site and add a site-only overlay for slugs, icons, categories, and editorial summaries.
3. Generate service cards, compatibility status, ports, protocols, tiers, default enablement, and endpoint tables.
4. Add all nine missing service routes.
5. Generate AI/LLM service metadata from the same artifact.

**Exit criteria:** Site/runtime service-ID parity is exact and contract-tested.

### Phase 3 — Rebuild dependency-backed references

1. Qualify pinned BigQuery, Bigtable, and Spanner artifacts inside the assembled LocalCloud image.
2. Regenerate operation-level compatibility records.
3. Rewrite feature pages with explicit Supported/Partial/Stub/Unsupported definitions.
4. Remove unsupported exact percentages and test counts unless generated from the pinned evidence.
5. Archive historical BigQuery gap/comparison pages or mark them clearly as historical.

**Exit criteria:** Each published capability links to a pinned revision and evidence record.

### Phase 4 — Correct remaining service and workflow pages

1. Reconcile Firestore, Cloud Storage, Pub/Sub, Workflows, GKE, Cloud Run, Tasks, Vertex AI, KMS, and Cloud SQL pages.
2. Replace emulator/production equivalence claims with bounded compatibility language.
3. Correct console mutation and cost-estimate wording.
4. Remove or source quantitative cost, startup, latency, and ecosystem claims.

**Exit criteria:** No page claims broader support than its operation-level evidence.

### Phase 5 — Prevent recurrence

Apply Diátaxis during the rewrite: tutorials must preserve a verified learning sequence; how-to guides must solve one bounded task; reference must be generated from contracts; explanation must separate concepts from compatibility promises.

Add CI checks that fail when:

- Site service IDs differ from the runtime's 27 IDs.
- Ports, protocols, tier, or default enablement differ.
- A checked “supported” capability has no compatibility evidence.
- Runtime API contracts change without updating site facts.
- Dependency identity or qualification evidence is absent.
- Runtime compatibility evidence is newer than the site's review date.
- Forbidden stale strings appear, including `/_localcloud/`, obsolete image names, stale project defaults, or legacy port maps.
- Public docs contain route collisions or duplicate canonical sources.

Also remove or reconcile the unused duplicate `/blog/localcloud-for-ai-agents/` data record. The dynamic route currently filters that slug, so there is no build collision, but the unused generated content remains a drift risk.

## Validation checklist for the eventual update

- Run the qualified LocalCloud image and execute every published quick start.
- Verify `/health`, `/env`, `/seed`, `/services`, and `/terraform/readiness` examples.
- Exercise one SDK workflow per advertised language/service surface.
- Run seed fixtures from the published guide.
- Run endpoint-only and transparent-network Terraform examples.
- Verify all 27 service routes and catalog cards.
- Run BigQuery, Bigtable, and Spanner assembled-image qualification against pinned revisions.
- Verify telemetry opt-out and outbound-network claims with an egress-denial test.
- Run `pnpm build`, rendered-doc verification, static SEO verification, content-fact verification, and link checks.
- Review policy/licensing copy with the appropriate owner before publication.

## Existing validation result

Surface review status is recorded in the coverage ledger above. “89 pages built” is build evidence, not proof that every page received line-by-line factual review.

`pnpm build` completed successfully during this audit:

- 89 pages built.
- Rendered/static build completed.
- Static SEO verification passed for 23 priority routes.

This confirms build health only. It does not validate the factual accuracy issues documented above.
