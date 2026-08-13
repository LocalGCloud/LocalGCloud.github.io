# LocalCloud Documentation Remediation Implementation Plan

**Specification:** `docs/superpowers/specs/2026-08-13-localcloud-documentation-remediation-design.md`  
**Audit:** `reports/localcloud-documentation-accuracy-audit.md`

## Phase 1: Establish a versioned documentation contract

### Files

- `src/data/docs-contract.ts` (new)
- `src/data/docs-contract.snapshot.json` (new)
- `src/data/serviceEditorial.ts` (new)
- `src/data/services.ts`
- `src/data/productFacts.ts`
- `src/data/agenticFacts.ts`
- `scripts/verify-docs-contract.mjs` (new)
- `scripts/verify-content-facts.mjs`
- `package.json`

### Steps

1. Define typed contract models for evidence state, provenance, operator defaults, CLI behavior, services, operations, seed support, Terraform qualification, telemetry, outbound behavior, and licensing.
2. Vendor a reviewed site-local snapshot sourced from `../localcloud`, `../localcloud-cli`, and the dependency revalidation evidence. Record source paths/revisions, review date, and explicit release-unverified states where immutable artifact identity is absent.
3. Populate all 27 runtime service IDs with registry port, protocol, default enablement, minimum tier, runtime type, persistence, compatibility status, bounded supported workflows, limitations, and evidence references.
4. Move titles, slugs, icons, categories, descriptions, navigation, and related content into an editorial overlay keyed by runtime service ID.
5. Refactor `services.ts`, `productFacts.ts`, and `agenticFacts.ts` to expose derived view models instead of independent operator and service snapshots.
6. Add contract validation for schema version, unique IDs/slugs, exact 27-service parity, one overlay per service, recognized evidence states, required limitations/evidence for positive claims, root endpoint rules, CLI defaults, and release-unverified provenance.
7. Add the contract verifier to the root `build` pipeline before content rendering checks.

### Proof

- The verifier reports exactly 27 unique service IDs and 27 overlays.
- `services.ts`, `productFacts.ts`, and `agenticFacts.ts` derive operator and catalog facts from the contract.
- No service with missing evidence renders as supported.
- `pnpm build` reaches Astro with the contract verifier passing.

## Phase 2: Publish the CLI-first getting-started tutorial

### Files

- `src/pages/docs/index.mdx`
- `src/pages/index.astro`
- `src/components/HomepageVariationFieldManual.astro`
- `src/pages/how-to-run-google-cloud-locally.astro`
- `src/pages/local-cloud-development.astro`
- `src/pages/gcp-emulator.astro`
- `src/pages/404.astro`
- `public/install.sh`
- `scripts/verify-installer.mjs`
- `scripts/verify-cli-docs.mjs` (new)

### Steps

1. Rewrite getting started as a tutorial with prerequisites, install-script installation, PATH recovery, `doctor`, `start`, `env`, `console`, one deterministic Cloud Storage call, verification, and next steps.
2. Lead with:

   ```sh
   curl -fsSL https://local.cloud/install.sh | sh
   localcloud doctor
   localcloud start
   eval "$(localcloud env)"
   localcloud console
   ```

3. Explain interactive versus non-interactive installer behavior and advise users to follow the exact `source` command and URLs printed by the installer/CLI.
4. Document `doctor` and `start` success states, default instance/project/caller, persistent volume behavior, loopback binding, dynamic port remapping, and local-only endpoint rewriting.
5. Present Homebrew as the second native installation path and manual Docker as the unsupported-host/deliberate-no-CLI fallback.
6. Replace incompatible manual Docker mappings with loopback-bound approved ports and no default Docker socket mount. Add warned opt-in guidance only where runtime features require socket or transparent networking.
7. Correct installer integrity language to SHA-256 verification; distinguish separately published Sigstore bundles from installer verification.
8. Align installer fallback links and next-step copy with the rewritten tutorial.
9. Expand installer/CLI checks to assert all documented public commands, defaults, formats, and fallback anchors against the reviewed CLI contract.

### Proof

- The tutorial reaches a deterministic API result without `/_localcloud/*`, `local-project`, or legacy ports.
- No beginner command mounts `/var/run/docker.sock` or binds LocalCloud to all interfaces.
- CLI-returned URL/environment guidance handles occupied canonical ports.
- Installer fixture tests cover prompt and non-TTY next steps, PATH messaging, archive validation, and uninstall preservation notes.
- `node scripts/verify-installer.mjs` and `node scripts/verify-cli-docs.mjs` pass.

## Phase 3: Correct operator, configuration, SDK, console, and architecture docs

### Files

- `src/pages/docs/configuration.mdx`
- `src/pages/docs/sdk-examples.mdx`
- `src/pages/docs/console.mdx`
- `src/pages/docs/architecture.mdx`
- `src/pages/docs/faq.mdx`
- `src/pages/docs/services-overview.mdx`
- `src/pages/docs/what-is-gcp-emulator.mdx`
- `src/pages/gcp-integration-testing.astro`
- `src/pages/localstack-for-google-cloud.astro`
- `src/pages/local-cloud-development.astro`
- `src/pages/immersive-demo.astro`
- Relevant shared components and illustrations containing factual labels

### Steps

1. Replace every operator route with root paths such as `/health`, `/health/{service}`, `/readiness`, `/env`, `/services`, `/seed`, `/reseed`, `/import`, `/reset`, `/terraform/readiness`, `/graphql`, `/api-docs`, and `/docs` as appropriate.
2. Document environment precedence: `LOCALCLOUD_SERVICES` complete override, registry defaults, individual `LOCALCLOUD_ENABLE_<SERVICEID>` overrides, and persisted settings only where environment has not locked a value.
3. State that runtime configuration comes from environment/CLI and that `application.yaml` is documentation-only, not automatically loaded.
4. Correct all examples to default project `local-gcp-project`, while explaining explicit project selection.
5. Update SDK examples to use CLI-generated environment values and retain explicit real-Google-Cloud validation instructions rather than blanket zero-code-change claims.
6. Correct IAM strict and `gcp-live` behavior, exemptions, policy file requirements, and live token validation.
7. Describe the console as supporting bounded mutations, not read-only browsing; qualify cost estimates as indicative, dated, and not live Google Cloud rates.
8. Correct architecture descriptions for Bigtable, Memorystore/Valkey, BigQuery/DuckDB files, Spanner storage, service processes, persistence, and transparent networking.
9. Remove categorical offline, no-egress, secure-environment, full-parity, and exact-latency claims.

### Proof

- A repository scan finds no unallowlisted `/_localcloud/`, stale project default, legacy mappings, or obsolete architecture description.
- Every SDK example consumes CLI/runtime endpoint output or an explicitly documented local endpoint.
- Console and IAM claims match the verified implementation.
- All changed guides distinguish local emulation from production validation.

## Phase 4: Rebuild seed and Terraform documentation

### Files

- `src/pages/docs/seed-data.mdx`
- `src/pages/docs/terraform.mdx`
- `src/data/agenticContent.ts`
- Relevant workflow pages under `src/pages/workflows/**`
- Relevant skills under `agent-skills/skills/localcloud-seed-data/**`
- Relevant skills under `agent-skills/skills/localcloud-terraform/**`
- Relevant MCP docs/assets and facts
- `scripts/verify-doc-examples.mjs` (new)
- `test-fixtures/docs/**` (new, if needed)

### Steps

1. Replace invalid seed structures with tested flat, `services`, and multi-project envelopes.
2. Use correct keys including `gcs`, `secretmanager.secrets`, and top-level `bigquery.tables` with per-table dataset names.
3. Mark Firestore seed unsupported and document actual service seed registrations.
4. Explain `/seed`, `/reseed`, `/import`, `LOCALCLOUD_SEED_FILE`, `mode=volatile`, restart behavior, and `LOCALCLOUD_TERRAFORM_MODE=true` seed suppression.
5. Rewrite Terraform prerequisites for the maintained Google provider version, syntactically valid fake service-account file, endpoint-only versus transparent-networking modes, LocalCloud certificates, DNS/HTTPS routes, Terraform mode, and `/terraform/readiness`.
6. Render endpoint examples from contract data, including correct paths, gateway/direct ports, trailing slashes, and BigQuery's DNS-routing caveat.
7. Limit resource compatibility to maintained evidence and remove stale unsupported labels for exercised resources.
8. Add fixture checks that parse all YAML examples and assert documented endpoint values and readiness paths.

### Proof

- Every seed YAML block parses and matches one accepted envelope.
- Firestore is never advertised as seedable.
- Terraform examples use valid fake credentials and correctly separate endpoint-only and transparent-networking requirements.
- Published Terraform endpoint tables match contract-generated values.
- `node scripts/verify-doc-examples.mjs` passes.

## Phase 5: Expand and correct the 27-service catalog

### Files

- `src/data/docs-contract.snapshot.json`
- `src/data/serviceEditorial.ts`
- `src/data/services.ts`
- `src/pages/services/index.astro`
- `src/pages/services/[slug].astro`
- `src/pages/services/[slug]/ai-agent-local-testing.astro`
- `src/pages/compatibility.astro`
- Service-specific top-level emulator pages
- Service-related components and icons
- `src/data/agenticContent.ts`

### Steps

1. Add editorial entries and generated routes for Sheets, Cloud Scheduler, Cloud Functions, AlloyDB, Dataproc, Cloud IAM, Cloud Resource Manager, Service Usage, and Cloud Billing.
2. Correct every service's protocol, direct/gateway ports, runtime type, default status, minimum tier, persistence, environment variables, and aggregate compatibility status.
3. Replace `enabled`-based public availability inference with explicit default, tier, evidence, and qualification fields.
4. Present implemented partial Pro services as partial rather than planned, and prevent planned placeholders from appearing as generally available.
5. Correct Cloud Storage, Pub/Sub, Firestore, Cloud Tasks, Workflows, GKE, Compute Engine, Cloud Run, Vertex AI, KMS, Cloud SQL, and other audited overclaims.
6. Add agent-testing pages only where contract/editorial data exists and ensure every generated page uses bounded workflows and caveats.
7. Make the compatibility view contract-derived, with evidence states and limitations visible.

### Proof

- Static generation creates catalog/detail routes for all 27 services.
- No route's support list exceeds its contract evidence.
- The compatibility page shows partial and release-unverified states distinctly.
- Catalog, detail, agent-testing, and AI service counts agree.

## Phase 6: Correct BigQuery, Bigtable, and Spanner references

### Files

- `src/pages/docs/bigquery-emulator-features.mdx`
- `src/pages/docs/bigquery-feature-comparison.mdx`
- `src/pages/docs/bigquery-coverage-gaps.mdx`
- `src/pages/docs/bigtable-emulator-features.mdx`
- `src/pages/docs/spanner-emulator-features.mdx`
- `src/pages/bigquery-emulator.astro`
- `src/pages/bigtable-emulator.astro`
- `src/pages/spanner-emulator.astro`
- Matching service pages, agentic content, skills, MCP facts, and LLM output

### Steps

1. Remove exact BigQuery totals, percentages, fixed view/function counts, benchmark claims, and blanket language-SDK compatibility without pinned qualification evidence.
2. Describe BigQuery grouping, TABLESAMPLE, scripting, materialized views, external tables, Storage API, INFORMATION_SCHEMA, BIGNUMERIC, AEAD/NET, and search/vector behavior with feature-specific partial/release-unverified limits.
3. Replace public-data examples with deterministic locally created data or `SELECT 1`.
4. Describe Bigtable extended features as behavior observed in an inspected cached artifact pending immutable dependency resolution and assembled-image qualification.
5. Retain only bounded Bigtable claims for single-partition change streams, metadata-only or non-enforcing administration/IAM, schema-only backups, and materialized-view limits.
6. State Bigtable persistence accurately for LocalCloud Docker and distinguish standalone artifact storage modes.
7. Remove Spanner PostgreSQL-wire, psycopg2, SQLAlchemy, PGAdapter, 95% coverage, Backup API, and blanket IAM-unsupported claims.
8. Document Spanner gRPC `24085`, REST `24086`, google-cloud-spanner use, dialect-through-API support, partial permissive IAM stubs, TABLESAMPLE matrix, change-stream qualification boundary, LevelDB/JSON persistence, and recovery caveats.
9. Label stale analysis pages historical or regenerate them as current contract views; do not leave historical gaps presented as current truth.

### Proof

- No banned exact BigQuery totals/percentages remain outside historical audit evidence.
- Bigtable pages include artifact and assembled-image qualification boundaries.
- No Spanner page presents port `24086` as PostgreSQL wire or suggests psycopg2/SQLAlchemy.
- All three service families show limitations adjacent to positive claims.

## Phase 7: Correct privacy, security, and licensing claims

### Files

- `src/pages/docs/privacy.mdx`
- `src/pages/docs/licensing.mdx`
- `src/pages/docs/faq.mdx`
- `src/layouts/BaseLayout.astro`
- Analytics/search/feedback components and their adjacent disclosures
- `src/pages/index.astro`
- Cost, CI, onboarding, agent, and comparison pages with team-use claims
- `packages/localcloud-mcp-server/PRIVACY.md`
- `packages/localcloud-mcp-server/SECURITY.md`
- `packages/localcloud-mcp-server/LICENSE` and package metadata where public claims conflict
- Relevant agent skills and LLM files

### Steps

1. Document runtime telemetry activation conditions, default destination, event categories and fields, pseudonymous identifier, cadence, persistence/retry queue, and opt-out event behavior.
2. Separate runtime telemetry from update checks, CA probes, online licensing, `gcp-live` IAM, scheduler HTTP egress, and other outbound features.
3. Disclose website PostHog page/autocapture behavior and search, feedback, documentation comment, click, referrer, and time-on-page events.
4. Avoid unprovable “anonymous,” “no PII,” “offline,” “no phone home,” and “no outbound connections” claims.
5. Summarize the governing proprietary license accurately and state that the license text controls.
6. Remove or rewrite claims that employer, organization, commercial development, cost-saving, internal-tool, onboarding, or team-CI use is free or currently licensed.
7. Separate technical Pro/Team/Enterprise tier enforcement from legal permission and state that the governing license currently says no commercial license is available.
8. Correct distributed package license metadata or, when changing package metadata would create a release decision outside documentation scope, remove contradictory public assertions and add an explicit tracked residual finding.
9. Place warnings adjacent to Docker socket, destructive MCP, telemetry, and live-network features.

### Proof

- Privacy pages enumerate actual event categories, destinations, and opt-out caveat.
- Site and package text no longer promise no telemetry or zero egress.
- No unqualified “free for developers/teams/CI” copy conflicts with the governing license.
- Technical tier labels do not imply an available legal grant.

## Phase 8: Migrate generated, AI/LLM, skill, and MCP surfaces

### Files

- `src/data/agenticFacts.ts`
- `src/data/agenticContent.ts`
- `src/data/agenticMarkdown.ts`
- `src/pages/ai/**`
- `public/llms.txt`
- `public/llms-full.txt`
- `agent-skills/**`
- `packages/localcloud-mcp-server/src/data/localcloudFacts.ts`
- `packages/localcloud-mcp-server/src/tools.ts`
- MCP README/docs/assets/manifests
- `scripts/generate-distributed-docs.mjs` (new where generation is practical)
- `scripts/verify-distributed-docs.mjs` (new)

### Steps

1. Generate machine-oriented operator/service facts from the contract.
2. Remove duplicated canonical declarations such as image, project, root routes, ports, service count, and compatibility lists from `agenticFacts`, LLM files, skills, and MCP package snapshots.
3. Rewrite agent workflows to use CLI `doctor`, `start`, `env`, `status`, and local-only endpoint behavior.
4. Correct MCP operational defaults, reset/health/env paths, project IDs, service lists, and destructive-operation warnings.
5. Preserve task-specific skill procedures but verify their commands and service claims against the contract.
6. Remove the unused duplicate AI-agents blog data record or make its canonical ownership explicit.
7. Add generation-freshness checks and repository-wide forbidden-pattern scans with a narrow documented allowlist.

### Proof

- Pattern scans find no stale route/image/project/port occurrence outside explained audit/history allowlists.
- MCP tools use contract-correct endpoints and defaults.
- LLM text, agentic HTML, skill commands, and MCP facts report the same service count and operator contract.
- MCP build, typecheck, and tests pass.

## Phase 9: Remove unsupported marketing and comparison claims

### Files

- `src/pages/optimize-gcp-costs.astro`
- `src/pages/reduce-gcp-dev-costs.astro`
- `src/pages/localstack-for-google-cloud.astro`
- `src/pages/docs/localcloud-vs-google-emulators.mdx`
- Homepage and relevant blog/comparison/glossary/agentic records
- `src/data/productFacts.ts`
- `scripts/verify-content-facts.mjs`

### Steps

1. Remove or explicitly frame as hypothetical every unsupported savings, cloud-cost, CI-cost, latency, throughput, startup-time, emulator-count, and issue-detection statistic.
2. Remove externally sourced Google/AWS/Azure capability counts that were not authorized for validation.
3. Replace “zero code changes,” “full parity,” “all step types,” and similar absolutes with bounded compatibility language and production-validation requirements.
4. Replace stale service-count labels such as `20+` with the contract-derived count and a partial-emulation qualification.
5. Add content checks for banned unsubstantiated phrases and number patterns.

### Proof

- No unsupported quantitative claim remains without an evidence reference, date, methodology, and qualification.
- Comparison pages describe verified LocalCloud behavior and clearly label unverified external assertions or omit them.
- Homepage, metadata, JSON-LD, and generated marketing descriptions use the same contract facts.

## Phase 10: Record remediation status and perform exhaustive verification

### Files

- `reports/localcloud-documentation-accuracy-audit.md`
- All changed files

### Steps

1. Add a remediation-status table mapping every audit finding to resolved, partially resolved, release-unverified, or deferred product/runtime decision.
2. Record residual BigQuery, Bigtable, Spanner, Cloud SQL, licensing, telemetry, image, and CLI release-provenance gaps without weakening the corrected public wording.
3. Run proactive language-server and Markdown diagnostics on changed files.
4. Run:

   ```sh
   pnpm build
   pnpm --dir packages/localcloud-mcp-server build
   pnpm --dir packages/localcloud-mcp-server typecheck
   pnpm --dir packages/localcloud-mcp-server test
   ```

5. Verify all static route families and confirm all 27 service routes build.
6. Serve the built site and browser-test the tutorial, configuration, seed, Terraform, privacy, licensing, compatibility, all three dependency-sensitive guides, service catalog, AI endpoints, and representative agent/workflow/comparison pages.
7. Execute every copy-paste quick start possible against a qualified local image. Mark unavailable artifact-dependent checks explicitly rather than inferring success.
8. Run independent content-accuracy and reliability reviews against the approved specification and audit.
9. Fix review blockers and rerun the relevant validation gates.

### Proof

- Root and MCP validation commands pass.
- Diagnostics report no blocking issues.
- All 27 service routes and generated families are present.
- Every audit finding has a status and verification reference.
- Residual product/runtime decisions are visible, while public documentation contains no known unsafe instructions.
