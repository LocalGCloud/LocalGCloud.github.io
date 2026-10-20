---
name: localcloud-site-development
description: Plan, implement, and qualify new features, pages, content, and UI additions in localcloud-site using its upstream facts, shared content pipeline, audience views, and release checks.
---

# LocalCloud site development

Turn a site request into a scoped, reviewable change with evidence that it works. Apply this skill to this repository; runtime, CLI, Console, and third-party integrations retain their own implementation ownership.

Start from the user's current request and the active repository instructions. Historical prompts explain preferences, not standing permission to publish, change sibling repositories, or restore superseded designs or pricing.

## 1. Establish the development brief

Use [the feature brief](assets/feature-brief.md) as a fill-in prompt or a lightweight working checklist. Fill it from the request and repository evidence; ask only for missing decisions that materially affect scope or correctness. Small changes need a compact brief, not a new planning document.

Record:

- The visitor, problem, desired action, and observable acceptance criteria.
- The mode: research, preview, proposal, implementation, or release. Record the authorized stopping point, including local merge, push, deployment, or monitoring where applicable.
- The affected routes, Desktop/mobile/Classic views, human/agent audiences, and HTML/Markdown/raw-document surfaces. Separate changed surfaces from regression checks.
- Facts and evidence required: upstream source/revision, SDK or CLI prerequisites, endpoints, fixtures, and expected results. Identify claims that require actual runtime or image qualification.
- The selected visual direction and elements to preserve. For a substantial visual change, show a representative preview when direction is unresolved or requested; do not reopen a direction the user already accepted.

Read [the history-derived patterns](references/development-patterns.md) when interpreting an ambiguous request or understanding why these checks exist. Do not load old transcripts for every feature.

## 2. Locate owners and plan the smallest complete change

Read the active `AGENTS.md`, `BUILD.md`, and `package.json`. Use the declared Node/pnpm versions; old reports contain obsolete toolchains and hosting details. Use the available graph tools as instructed by the repository, falling back when unavailable.

Trace the affected shared owner, its callers, generated outputs, tests, and configuration before editing. Use this routing map to begin discovery, then verify current ownership:

| Change | Starting owners |
| --- | --- |
| Runtime capabilities, defaults, ports, configuration | Committed sibling runtime/CLI docs → `src/data/docs-contract.snapshot.json` |
| Service status and capability workflows | `src/data/services.ts`, `src/data/serviceEditorial.ts` |
| Service usage and language examples | `src/data/serviceGuides.ts`, `src/data/serviceClientExamples.ts`, maintained SDK examples |
| Agent overview and instructions | `src/data/agenticFacts.ts`, `src/data/agenticContent.ts`, `src/data/agenticMarkdown.ts` |
| Page presentation and shared behavior | `src/pages/`, `src/components/`, `src/layouts/`, `src/scripts/`, `src/utils/` |
| Search, Markdown twins, Desktop payloads, production output | Existing generators and verifiers in `scripts/` |
| Delivery, headers, analytics proxy, redirects | `worker/`, `public/_headers`, `public/_redirects`, `wrangler.jsonc`, deployment workflow |

Keep detailed facts or workflows in one shared owner and project them into the required surfaces. Link to canonical guides rather than duplicating installer, MCP, or integration instructions. Do not hand-edit generated output instead of its source. Root `docs/` is internal documentation; public documentation routes live under `src/pages/docs/`.

For implementation, use a named `codex/` worktree branch. Inspect dirty files, active worktrees, and concurrent sessions; preserve work belonging to others. If a temporary checkout lacks sibling repositories, arrange explicit source locations using supported configuration or perform upstream parity in the primary checkout; a skip is not a parity pass.

## 3. Implement against product and behavior contracts

Follow [site marketing principles](../../../docs/site-marketing-principles.md) through the repository root, and use [the correctness matrix](references/correctness-matrix.md) for the affected change type. Resolve these repository-root paths from the active checkout; do not assume a machine-specific path.

- Present capabilities and useful local workflows with concise, distinct boundaries. Never invent prices, customers, benchmarks, compatibility, release dates, or unsupported SDK behavior.
- Service status has two categories: supported and unsupported. Do not display “Partial” or redundant supported badges. Firestore is supported and opt-in; Dataproc supports local container execution. Preserve meaningful operational guidance without copying an internal audit ledger into marketing copy.
- An example explains its purpose, prerequisites/environment exports, action, and observable result; keep cleanup where it creates resources. Distinguish list/discovery examples from write/read-back verification. Do not silently fall back to real GCP or require real credentials for a local example.
- Preserve the intended theme and behavior of other audiences and views. Human/agent presentation changes must not accidentally restyle the other audience. Keep navigation, search results, query parameters, fragments, and Back/Forward working.
- Reuse shared components and handlers. Verify behavior after content remounts, not only at first load; avoid duplicate listeners and full shell reloads in existing in-place navigation.
- Keep essential copy, links, and metadata in rendered HTML for crawlers. Preserve accessibility, analytics functionality and privacy choices, security headers, and existing performance budgets.

For a capability/documentation refresh, follow `BUILD.md`: sync committed upstream work, run strict parity, review snapshot/editorial changes, regenerate distributed docs, and verify them. Do not run a broad refresh just to hide an unrelated failure. Source parity does not qualify a published Docker image.

## 4. Qualify the change

Run focused checks for the changed behavior, including a meaningful regression case for new nontrivial logic. Fix valid findings at their shared cause. Do not weaken assertions, raise budgets, remove analytics, or remove product behavior to silence a report.

The required baseline is defined in `AGENTS.md` and `BUILD.md`. At this skill's creation it includes:

```sh
pnpm run test:dependencies
pnpm run build
pnpm run test:installer
# Refresh when files, symbols, or signatures change:
graft build
git diff --check
```

Run build before suites that consume `dist/`. Review generated tracked diffs. Use the correctness matrix to select the additional suites and browser checks; use the full release set from `docs/cloudflare-deployment.md` when preparing a release.

For user-visible changes, verify representative affected pages in a real browser at desktop and mobile sizes and check the other views/audience where shared code can affect them. Test direct entry and navigation/remount paths. Verify copy buttons, language tabs, search, keyboard focus, links/anchors, and relevant empty/error states. Use a working local server and fresh built search/Markdown assets where required. Visual mocks, DOM assertions, and unit mocks each cover different evidence.

Classify third-party findings against current evidence before changing code. Keep lab measurements, field/RUM samples, analytics events, crawl eligibility, and actual search indexing separate. Record device, route, build/release, sample window, and limitations for measurements. Report blocked checks accurately and finish unaffected work; do not declare an unpassed gate complete.

## 5. Integrate and close at the authorized boundary

Follow the active worktree policy: commit the complete task-owned diff, rebase onto current `main`, fast-forward `main`, and test on `main`. If another agent is working on `main`, qualify the rebased commit in the worktree and advance `main` safely to that tested commit. Recheck state before integration; never overwrite concurrent changes or force-update a diverged branch. Remove only this task's worktree after it is clean and every commit is on `main`.

A push to `main` currently triggers Cloudflare deployment. If deployment is held, do not push `main` under that trigger. Local merge is a separate boundary. Honor later scope changes immediately; previous chat approvals do not authorize this task's external actions.

When release is authorized, use the documented pipeline, retaining sitemap protection and previous-generation assets. Inspect CI and the deployed source/version, then verify the public routes, Worker/custom-domain behavior, and affected browser flows. An HTTP 200 alone does not prove the feature works. For analytics changes, verify marked test records reach the correct project/page without treating them as organic traffic. Start recurring monitoring only when requested.

Finish with the changed behavior and useful review link, tests actually run, local commit/merge state, deployment state if applicable, and material gaps or risks. State whether evidence covers source, built output, browser behavior, live deployment, or runtime/image execution. Never report these as interchangeable.
