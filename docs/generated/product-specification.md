# Product specification

**Internal review draft · working tree of 2026-09-10.** See [coverage](coverage-and-evidence.md) for provenance and limits.

## Purpose and users

The site helps developers evaluate LocalCloud, understand supported local Google Cloud workflows, install the host CLI and find task-specific guidance. `PRODUCT.md` identifies two audiences: evaluators deciding whether to adopt, and active users looking for precise instructions mid-workflow. Its blanket compatibility/cost wording is stale and is not adopted by this specification. [OBS-001, GAP-007; `PRODUCT.md:9–20`]

A third supported journey serves coding agents and the developers configuring them: public Markdown guides, prompts, service-specific pages and portable skills. These are documentation/distribution surfaces; they do not turn this repository into an agent execution platform. [REQ-009, REQ-013, OBS-003]

## Supported journeys and requirements

| ID | Intended user outcome | Current observation and boundary |
| --- | --- | --- |
| REQ-001 | Find one primary website at `local.cloud` | Astro site origin, canonical links and product facts use that domain. The repository identity remains distinct. DNS and production redirects were not tested. |
| REQ-002 | Read accurate, usable product instructions | Schema-v3 facts and multiple validators exist, but upstream revision drift and conflicting reference documents remain. |
| REQ-003 | Install, start and open the console without a large command wall | Homepage has install-script/Homebrew tabs, then a two-line start/console command. Detailed SDK setup remains separate. |
| REQ-004 | Connect to the right local endpoint after port collisions | Homepage explains remapping and returned endpoints. Its exact-word test currently fails. |
| REQ-006 | Understand the free public preview | One Workbench offer, no payment method/license key, links to getting started and license. No price/date/commercial contact offer. |
| REQ-008 | Understand who grants rights and which preview terms persist | Public licensing reference names LocalCloud Inc. and retained preview terms. Root site license still disagrees. |
| REQ-010 | Scan service cards without ambiguous implementation badges | Cards/details use documented-workflow counts; detailed boundaries still render unsupported/unknown operations and persistence limits. |
| REQ-011, REQ-012 | Browse a coherent, readable catalog and docs UI | Boxed service/category hierarchy, Google-derived visual system, copy feedback and semantic tables exist in source. No new visual compliance claim. |
| REQ-013 | Find relevant local-cloud and agent workflows | Landing-page families, route-intent registry, structured data, raw Markdown and LLM files exist. Ranking or AI citation success is not guaranteed. |
| REQ-009 | Reach the canonical MCP integration | Public references point to runtime-owned integration; the deleted site package is not a supported product surface. |

Source anchors: homepage `src/components/InstallationMethods.astro:7–76`; service adaptation `src/data/services.ts:98–165`; detail boundaries `src/pages/services/[slug].astro:96–122`; pricing `src/components/PricingWorkbench.astro:31–85`; raw content [flows and contracts](flows-and-contracts.md). Historical sources: E-051 m110/m132; E-011 m4/m73; E-007 m226–244; E-005 m0; E-003 m411–436; E-014 m0/m164; E-025 m294/m762; E-013 m42/m68/m71.

## Product boundary

The current contract lists **27 published, available service guides**, and the structural verifier passed for 27 service routes and 27 agent-testing routes. “Available” is a catalog state. It does not mean enabled by default, complete Google Cloud compatibility, measured release behavior or permission for every use. Keep availability, tier, evidence and persistence separate. [OBS-002; `src/data/docs-contract.ts:55–75`]

The public preview is intended for non-production development, testing, ongoing internal CI, evaluation and internal pilots, including company use. This records the accepted product direction and current public summary; the root-license mismatch prevents treating all artifacts as reconciled. [REQ-006, REQ-008, GAP-003]

## Non-goals and constraints

- Do not provide emulator execution, production cloud guarantees, billing/payment checkout or a second MCP server from this site. The reviewed routes and workflow implement documentation and static delivery; runtime operations belong elsewhere. [OBS-001, REQ-009]
- Do not turn marketing claims, agent proposals, mock demos, registry defaults or passing string checks into compatibility certification. [PRIN-002, OBS-008]
- Do not silently fall back from a local workflow to real GCP credentials/endpoints. [PRIN-003]
- Keep public instructions brief and useful to product users; keep internal audits and private source archives separate. The historical gap-analysis route needs a deliberate disposition. [REQ-002, REQ-014]
- Keep installer integration tests separate from the site build. [REQ-005]

## Changes in direction

The two-category free/commercial pricing proposal was accepted first, then **explicitly superseded** by the public preview. Dates, numeric pricing and the future-licensing note were specifically rejected for the page. [REQ-006, REQ-007; E-003 m4/m23, m411–436]

Earlier service presentation removed Sheets and described Firestore as upcoming. A subsequent accuracy audit identified those classifications as wrong, and the user requested all findings fixed. The current site publishes both, while Firestore's description says to enable it explicitly. Preserve this history without restoring an obsolete count. [REQ-015; E-014 m208; E-011 m71/m73; `src/data/serviceEditorial.ts:22–26`]

Earlier LocalStack-comparison deferral and later broader SEO approval are not conclusively reconciled. Current comparison pages are observed behavior, not proof of a specifically recovered reversal. [REQ-016, GAP-005]
