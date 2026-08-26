# LocalCloud Documentation Remediation Design

**Date:** 2026-08-13  
**Status:** Approved  
**Primary repository:** `localcloud-site`  
**Evidence repositories:** `../localcloud`, `../localcloud-cli`, `../local_cloud_dependencies`  
**Audit:** `reports/localcloud-documentation-accuracy-audit.md`

## Purpose

Correct every documented LocalCloud fact identified by the accuracy audit, add an evidence-backed CLI-first quick start, and replace independent technical snapshots with a versioned site-local contract that can be validated against generated and distributed documentation.

The update uses verified current behavior even where product, legal, privacy, image, or dependency-release decisions remain unresolved. Unsafe claims are removed. Release-sensitive behavior is labeled as unverified until exact source and image provenance is available.

## Audience and User Goals

The primary audience is developers and operators installing, configuring, and using LocalCloud.

The documentation must help them:

1. Install the supported LocalCloud CLI safely.
2. Diagnose Docker and start a local instance.
3. configure SDKs and Terraform with returned local endpoints.
4. Seed deterministic local resources.
5. Understand each service's implemented workflows and known limitations.
6. Distinguish local emulation from production Google Cloud behavior.
7. Understand telemetry, outbound communication, licensing, and destructive local operations before enabling them.

## Diátaxis Structure

### Tutorial

The getting-started tutorial leads a first-time user from installation to one successful Cloud Storage request:

1. Verify supported host and Docker prerequisites.
2. Install with `curl -fsSL https://local.cloud/install.sh | sh`.
3. Run `localcloud doctor`.
4. Run `localcloud start`.
5. Run `eval "$(localcloud env)"`.
6. Open `localcloud console`.
7. Make and verify one deterministic API call.
8. Stop or retain the persistent instance deliberately.

The tutorial explains observable success at each step and uses CLI-returned URLs and endpoint values rather than assuming canonical port `24080` is available.

### How-to Guides

Task-oriented guides cover:

- Configure SDKs and application environments.
- Seed, reseed, reset, import, and isolate projects.
- Configure Terraform in endpoint-only and transparent-networking modes.
- Configure service enablement and licensed tiers.
- Run integration tests and CI safely.
- Use agents and the MCP server without public-cloud fallback.
- Opt into Docker socket access or transparent networking with explicit warnings.
- Use manual Docker when the host CLI is unavailable.

### Reference

Reference pages cover:

- CLI commands, flags, defaults, output states, and recovery behavior.
- Root operator endpoints.
- Environment variables and precedence.
- All 27 runtime services, ports, protocols, default enablement, tier, persistence, compatibility, and evidence.
- Seed envelopes and service-specific seed support.
- Terraform prerequisites and qualified resources.
- Telemetry events, fields, destinations, identifiers, retry behavior, and opt-out behavior.
- Governing license scope and technical enforcement separately.

### Explanation

Explanation pages cover:

- Local emulation versus production parity.
- Runtime architecture and persistence boundaries.
- External emulator, facade, and process boundaries.
- Dependency and assembled-image provenance.
- Why final real-Google-Cloud validation remains necessary.
- Privacy and security trade-offs of telemetry, online checks, scheduler egress, live IAM, licensing, and Docker socket access.

## Scope

### Included

- `src/pages/**`
- `src/data/**`
- Generated `/ai/**` and other agentic route families
- `public/llms.txt` and `public/llms-full.txt`
- Installer guidance in `public/install.sh`
- `agent-skills/**`
- Runtime MCP links and integration copy in public site pages
- Content validation scripts and tests
- Remediation status in `reports/localcloud-documentation-accuracy-audit.md`

### Excluded

- Source or documentation edits in `../localcloud`
- Source or documentation edits in `../localcloud-cli`
- Source or documentation edits in `../local_cloud_dependencies`
- Runtime, CLI, emulator, licensing, or telemetry behavior changes
- External-source validation
- Claims about unqualified future releases

Sibling repositories are read-only evidence sources. The site must not read them directly during production builds.

## Source Authority

When evidence conflicts, use this order:

1. Runtime implementation, `services.yaml`, and generated API contracts
2. Tests and CI qualification evidence
3. Container and runtime scripts
4. Maintained examples and Terraform fixtures
5. Narrative documentation
6. Marketing copy

For BigQuery, Bigtable, and Spanner, dependency checkout behavior is not automatically shipped LocalCloud behavior. Public claims require reconciliation with the exact dependency source, dependency image or module identity, assembled LocalCloud image, and qualification result.

For the CLI, command behavior comes from `../localcloud-cli/src/localcloud_cli/**`, installer behavior from `public/install.sh`, and released-platform guarantees from the CLI release workflow. Release-sensitive claims must identify the release boundary.

## Documentation Architecture

### Versioned technical contract

Add a site-local immutable evidence snapshot under a dedicated data directory. The contract records:

- Schema version and review date
- Product and CLI source revisions used during review
- Image repository, tag, and digest when known
- Qualification state and residual release uncertainty
- Operator defaults and root endpoints
- CLI install paths, commands, defaults, outputs, and safety properties
- All 27 services and their registry facts
- Operation-level support, limitations, and evidence references
- Seed support and accepted envelopes
- Terraform prerequisites and tested resources
- Runtime telemetry and outbound behavior
- Governing licensing facts and technical enforcement boundaries

The initial snapshot may contain explicit `releaseUnverified` states where a digest or assembled-image qualification is unavailable. Unknown provenance must not be represented as supported parity.

### Editorial overlay

Keep presentation-only fields separate:

- Public slug
- Category
- Icon
- Short description
- Navigation placement
- Introductory copy
- Related guides

The overlay must have exactly one entry per contract service. Builds fail for missing, duplicate, or unknown service IDs.

### Derived adapters

Typed adapters expose stable view models to current pages. Existing consumers should migrate from independent facts to adapters rather than parsing raw JSON throughout the UI.

The derived data powers:

- Service catalog and detail pages
- Compatibility views
- Agentic facts and Markdown
- Public LLM files
- Agent skills

Hand-authored prose can import concise facts or link to canonical reference pages but must not restate large endpoint, port, or capability matrices independently.

### Distributed artifact strategy

Not every distributed file needs runtime generation. The implementation may use either generation or strict verification:

- Generate machine-oriented LLM and agent metadata where templates are maintainable.
- Keep task-specific skills hand-authored where necessary.
- Enforce contract alignment with structured checks and forbidden-stale-string scans.

Runtime MCP implementation details remain in the runtime repository. This site links to the canonical integration guide rather than copying operational defaults or tool catalogs.

## CLI-First Quick Start Contract

### Prerequisites

- Docker Desktop, Colima, or Docker Engine is installed and running.
- Native CLI support is macOS 13+ or Linux with glibc 2.35+ on ARM64 or AMD64.
- Windows uses the separately documented manual-Docker path.
- The install script requires standard shell utilities and either `sha256sum` or `shasum`.
- The frozen CLI does not require Python.

### Primary flow

```sh
curl -fsSL https://local.cloud/install.sh | sh
localcloud doctor
localcloud start
eval "$(localcloud env)"
localcloud console
```

The installer may offer to run `doctor` and `start` interactively. Non-interactive installation prints absolute-path next steps. If the installer changes `PATH`, the guide tells users to run the exact `source` command printed by the installer.

### Expected behavior

- `doctor` returns JSON with `status: "ok"` when Docker is usable.
- `start` may return `started`, `already_running`, or `reconfigured`.
- The default instance is `default`.
- The default project is `local-gcp-project`.
- The default caller is `local-developer`.
- Persistence is enabled by default.
- Docker socket and transparent networking are disabled by default.
- The CLI binds exposed ports to loopback and may dynamically remap occupied canonical ports.
- Users rely on `container.url`, `sdk_env`, `localcloud env`, and `localcloud console` output rather than hard-coded URLs.
- Generated endpoint values are local-only; the CLI rejects real Google or non-loopback HTTP endpoint fallbacks.

### Alternative install paths

- Homebrew is documented as the second supported native path.
- Manual Docker is a fallback for unsupported hosts or deliberate CLI avoidance.
- Manual Docker examples use the approved image identity and loopback-bound required ports only.
- Docker socket mounting appears only in a warned opt-in workflow for features that require it.

### Installer integrity wording

The installer verifies release archives with SHA-256 and validates exact archive members and executable version. Release automation also publishes Sigstore bundles, but the installer itself does not verify those bundles. Documentation must say “checksum verification,” not “signature verification.”

## Remediation Clusters

Implementation proceeds by fact cluster rather than page order so all fan-outs move together.

### 1. Operator and CLI contract

Correct:

- Image identity
- Root endpoints such as `/health`, `/env`, `/seed`, `/reset`, and `/terraform/readiness`
- Default project
- Loopback port behavior and dynamic CLI mapping
- CLI commands and recovery states
- Console and environment setup
- Docker socket and transparent-networking defaults

Update all HTML, MDX, AI/LLM, skill, MCP, and installer surfaces in the same cluster.

### 2. Privacy, security, and licensing

Replace categorical no-telemetry, no-egress, offline, and secure-environment promises with current behavior:

- Runtime telemetry activation conditions
- Default PostHog destination and event categories
- Pseudonymous identifier and retry queue
- `LOCALCLOUD_TELEMETRY=false` opt-out event caveat
- Other outbound checks and configurable live behavior
- Website PostHog collection and user-input events

Licensing copy follows the governing root license. It must not imply that team, employer, commercial-development, cost-saving, internal-tool, or team-CI use is currently granted. Tier implementation is documented separately from legal permission. Summaries state that the license text governs.

### 3. Seed and Terraform workflows

- Replace invalid seed keys and Firestore seed instructions.
- Document accepted flat, single-project, and multi-project envelopes.
- Distinguish volatile from persisted seed behavior.
- Use `/reseed`, `/import`, and `LOCALCLOUD_SEED_FILE` accurately.
- Document provider version, valid fake credentials, endpoint-only versus transparent-networking modes, trusted certificate requirements, Terraform mode, and `/terraform/readiness`.
- Limit resource compatibility to maintained evidence.

### 4. Service catalog and architecture

- Expand from 18 to all 27 runtime services.
- Preserve runtime IDs separately from public slugs.
- Correct port, protocol, default status, minimum tier, type, persistence, and health metadata.
- Add missing Sheets, Cloud Scheduler, Cloud Functions, AlloyDB, Dataproc, Cloud IAM, Cloud Resource Manager, Service Usage, and Cloud Billing pages.
- Correct Cloud SQL's assembled-image default uncertainty rather than presenting registry defaults as qualified runtime behavior.
- Replace obsolete Bigtable, Memorystore, BigQuery, and Spanner architecture descriptions.

### 5. Dependency-sensitive compatibility

BigQuery, Bigtable, and Spanner pages expose feature-level caveats and provenance. They do not publish exact totals, percentages, or blanket SDK parity without a pinned evidence bundle.

- BigQuery distinguishes partial interpreter/emulation profiles from production semantics.
- Bigtable extended features are described only as inspected cached-artifact behavior until immutable dependency and assembled-image qualification exists.
- Spanner documents gRPC on `24085`, REST on `24086`, no packaged PGAdapter, partial permissive IAM stubs, API-dialect support, and storage/recovery limitations.

### 6. Marketing and comparison claims

Remove or qualify unsupported cost, savings, speed, latency, startup, emulator-count, and issue-detection figures. External vendor comparisons that cannot be locally validated are marked unverified or removed. The site favors reproducible product facts over quantitative persuasion.

## Error and Uncertainty Handling

Documentation must represent uncertainty explicitly:

- `verified`: backed by an identified source and qualification evidence
- `partial`: implemented for bounded workflows with documented limits
- `release-unverified`: observed in source or a mutable dependency but not proven in the assembled release
- `unsupported`: not implemented for the documented workflow
- `unknown`: evidence is insufficient; do not render as a positive capability

A build must fail rather than silently drop unknown service IDs or unsupported status values. Editorial pages may omit internal evidence detail, but they may not strengthen the status.

Broken or unsafe instructions are removed immediately rather than retained with a distant caveat. Destructive commands state their scope and persistence impact adjacent to the command.

## Validation Design

### Contract checks

Add checks for:

- Exactly 27 unique runtime service IDs
- One editorial overlay per service
- Expected ports, protocols, defaults, and tiers in the pinned contract
- Evidence and limitations for every positive compatibility claim
- No planned placeholder rendered as supported
- No legacy `/_localcloud/` paths
- No stale `local-project` default
- No legacy image or port-mapping examples
- No unqualified telemetry, offline, free-for-team, or production-parity claims
- Generated-output freshness

Intentional historical references, migration warnings, or audit quotations require narrow allowlist entries with explanations.

### Executable documentation checks

Validate, where local evidence and environment permit:

- Installer fixture behavior
- CLI command syntax against the reviewed CLI source contract
- Root endpoint examples
- Seed fixtures
- Terraform endpoint generation and readiness flow
- Service route generation
- Runtime MCP integration links and safety boundaries

The site repository cannot establish released-binary behavior alone. CLI release claims therefore retain source revision and artifact-boundary metadata.

### Build and package checks

Run:

```sh
pnpm build
```

Also run language-server diagnostics on changed TypeScript, Astro, and MDX files, and Markdown diagnostics on reports and specifications.

### Content review

Review representative routes and every generated family:

- `/docs/`
- `/docs/configuration/`
- `/docs/seed-data/`
- `/docs/terraform/`
- `/docs/privacy/`
- `/docs/licensing/`
- `/docs/bigquery-emulator-features/`
- `/docs/bigtable-emulator-features/`
- `/docs/spanner-emulator-features/`
- `/services/` and all 27 service pages
- `/ai/**`
- Agent, workflow, comparison, glossary, and blog families
- `public/llms*.txt`
- Representative agent skills
- Public links to the runtime repository’s canonical MCP integration guide

## Audit Report Disposition

Keep `reports/localcloud-documentation-accuracy-audit.md` as an evidence record. Add a remediation-status section that maps each finding to:

- Resolved
- Partially resolved
- Release-unverified
- Deferred product/runtime decision

Do not rewrite historical findings as if they were never true. Residual risks and blocked runtime decisions remain visible.

## Delivery Strategy

The remediation is one coordinated project but should be implemented in reviewable phases:

1. Add contract types, evidence snapshot, editorial overlay, and validation harness.
2. Correct operator facts and publish the CLI-first tutorial.
3. Correct privacy, licensing, seed, and Terraform documentation.
4. Rebuild the 27-service catalog and architecture content.
5. Correct dependency-sensitive feature pages.
6. Migrate AI/LLM, Agent Skills, and runtime MCP integration links.
7. Remove unsupported marketing claims and reconcile comparisons.
8. Run exhaustive validation and update the audit status.

Each phase must leave generated and distributed facts internally consistent. A phase is not complete while known stale copies remain in its fact cluster.

## Success Criteria

- A new user can install and start LocalCloud using the CLI-first tutorial without copying a nonexistent route or incompatible Docker command.
- All public operator examples use root endpoints and the correct default project.
- Every runtime service has one accurate site entry with bounded compatibility claims.
- Privacy and licensing pages reflect current behavior and governing terms without categorical contradictions.
- Seed and Terraform guides use exercised shapes and prerequisites.
- BigQuery, Bigtable, and Spanner claims include the required qualification boundary.
- AI/LLM files and Agent Skills agree with the same contract, while MCP links point to the runtime-owned guide.
- CI rejects the known stale patterns and contract drift.
- The site build and documentation checks pass.
- The audit report records resolved and residual findings.
