# Testing and acceptance

## What the repository tests

The primary strategy is executable documentation assertions: validate a versioned contract, compare selected upstream revisions/digests, reject stale prose, parse seed fixtures, check distributed surfaces, inspect built HTML/SEO and verify a shell installer with isolated fixtures. This does not amount to runtime API integration coverage or a general browser interaction suite. [OBS-002, OBS-006, OBS-009]

`verify-doc-examples.mjs` parses seven seed examples and checks reference content, endpoints and Terraform prerequisites. Its HCL-related checks inspect required blocks and balanced braces; they do **not** execute Terraform. `verify-rendered-docs.mjs` checks a representative BigQuery comparison article for semantic table output. `verify-static-seo.mjs` checks the priority-route registry, not every conceivable public route. [Source: `scripts/verify-doc-examples.mjs:106–142,342–372`; `scripts/verify-rendered-docs.mjs:3–22`; `scripts/verify-static-seo.mjs:4–22`]

## Checks executed in this run

All commands ran against the unchanged site working tree using Node 22.22.2. Outputs and exits are in `evidence/check-results.json` and per-check logs. Installer temporary output was confined to the private run and cleaned by the harness.

| Check | Result | Meaning |
| --- | --- | --- |
| `node scripts/verify-docs-contract.mjs` | **Pass** | Schema v3; 27 runtime surfaces, overlays, public service routes and agent-testing routes passed source assertions. |
| `node scripts/verify-upstream-docs.mjs` | **Fail, exit 1** | Snapshot is not synced to runtime HEAD. Later upstream assertions did not run. |
| `node scripts/verify-cli-docs.mjs` | **Fail, exit 1** | Homepage lacks the exact word `dynamic`; it does contain a remapping warning. Later assertions did not run. |
| `node scripts/verify-doc-examples.mjs` | **Pass** | Seven parsed seed examples and 25 selected source surfaces passed. No runtime calls. |
| `node scripts/verify-policy-docs.mjs` | **Pass** | Nineteen selected surfaces passed expected/prohibited-phrase checks. Root LICENSE is outside that list. |
| `node scripts/verify-distributed-docs.mjs` | **Pass** | 184 distributed files and 258 repository references scanned by the script. This is not a semantic review of every statement. |
| `node --experimental-strip-types scripts/verify-content-facts.mjs` | **Pass** | Product facts and public LLM content passed consistency assertions. |
| `sh -n public/install.sh` | **Pass** | Shell syntax only. |
| `node scripts/verify-installer.mjs` | **Pass** | Local fixtures covered installation/version pinning, aliases/collisions/repair, prompts, preservation, platform rejection and uninstall. Source/dist installer equality also passed. |

**Seven of nine project checks passed.** This denominator is exactly the nine commands above, not a code-coverage metric. Node version discovery is recorded separately. [GAP-001, GAP-002, OBS-006]

## Requirement-to-acceptance map

| Requirement | Recovered acceptance | Existing evidence | Remaining verification |
| --- | --- | --- | --- |
| REQ-001 | `local.cloud` is canonical; repository URL stays correct | Astro site config and product facts | Production DNS/redirect/header behavior not checked |
| REQ-002 / PRIN-001 | Shared facts are accurate and public prose is usable | Contract and distributed checks pass | Upstream revision gate fails; semantic review remains necessary |
| REQ-003 | Exactly two homepage workflow steps; start/console copied together | Component source matches E-007 m243–244 | Browser clipboard/tab/responsive behavior not executed |
| REQ-004 | Explain dynamic host-port remapping | Warning source exists | Exact-word test fails; source wording/assertion need reconciliation |
| REQ-005 | Installer tests separated from build | Manifest and CI wiring; fixture command passed | Remote CI not executed |
| REQ-006 / REQ-008 | Single preview offer, no price/date/key/payment requirement, company internal CI included | Pricing/policy check passes | Root-license scope conflict unresolved |
| REQ-009 | Runtime-owned MCP; no site-package references in supported surfaces | Distributed check passes | Runtime MCP was not invoked |
| REQ-010 | Positive catalog signals without deleting useful boundaries | Services adapter and detail template | Visual presentation not tested |
| REQ-011 / REQ-012 / PRIN-005 | Boxed catalog, readable commands, keyboard controls and semantic tables | Current design/source and build-time table plugin | Browser/screen-reader/zoom/reduced-motion checks not run |
| REQ-013 | Distinct linked intent pages and readable agent artifacts | Route/data sources and distributed checks | Full build, live SEO and ranking outcomes unverified |
| REQ-014 | Private reference material is not accidentally published | Explicit user correction | Current archived public gap-analysis route still needs owner disposition |
| PRIN-003 | Local validation never silently uses production credentials | Skill/agent instructions | No real SDK or runtime workflow was executed |

## Checks deliberately not run

- `pnpm build`, the generators and upstream sync: they write into the repository, contrary to this task's output boundary.
- Rendered-doc/SEO/Pagefind checks against old `dist`: no new build establishes that output as this snapshot.
- Live SEO, deployed-site requests, Search Console, analytics and external model queries: would contact external/production services.
- Real CLI downloads, Homebrew, Docker startup, SDK clients and Terraform: outside the static-site documentation task; fixture checks are not substitutes for those guarantees.
- Dependency installs, CASS index repair/refresh, CM reflection/import: expressly outside the authorized task.

[GAP-008; task boundary]

## Recommended additional acceptance work

These are **new recommendations**, not recovered historical requirements: validate root/public license consistency with explicit artifact ownership; replace brittle wording-only guards with focused checks that still require the port warning; add browser checks for modal focus restoration, asynchronous search ordering, no-results analytics semantics and copy failures; validate all public MDX JSON-LD values containing quotes rather than only selected priority routes. Keep each check bounded to the behavior it proves. [PRIN-004; `src/layouts/DocsLayout.astro:78–97`, `src/components/SearchModal.astro:53–156`]

Passing source assertions is necessary evidence for content integrity. It does not cure the documented contradictions, prove release behavior or authorize publication.
