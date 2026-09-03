# Free Public Preview Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one free public-preview offer and make the runtime license, release image, public copy, and validation checks agree with it.

**Architecture:** The runtime root `LICENSE` remains the governing authority. An explicit `PUBLIC_PREVIEW` build marker allows release-quality images to bypass license-key enforcement, while the site projects the same permitted-use boundary through its pricing component and documentation contract.

**Tech Stack:** Astro, TypeScript, MDX, Node.js validation scripts, Docker, GitHub Actions, Java runtime licensing

**Spec:** `docs/superpowers/specs/2026-09-03-free-public-preview-pricing-design.md`

## Global Constraints

- Keep `LocalCloud Inc.` as copyright holder and licensor.
- Allow individuals and organizations, including for-profit companies, to use LocalCloud for internal development, testing, CI, evaluation, and internal pilots.
- Preview releases retain their granted rights if future releases use different terms.
- Do not advertise production use, redistribution, a commercial tier, a date, a numeric price, or a contact-to-buy action.
- Preserve unrelated worktree changes.

---

### Task 1: Governing license and preview release mode

**Files:**
- Modify: `../localcloud/LICENSE`
- Modify: `../localcloud/Dockerfile`
- Modify: `../localcloud/build.sh`
- Modify: `../localcloud/.github/workflows/docker-publish.yml`
- Modify: `../localcloud/docker/docker-entrypoint.sh`
- Modify: `../localcloud/docs/licensing-security.md`
- Modify: `../localcloud/docs/ENVIRONMENT_VARIABLES.md`
- Test: `../localcloud/ci/test_build_image_identity_output.py`

**Interfaces:**
- Consumes: existing `BUILD_MODE` and `ENFORCE_LICENSE` image metadata
- Produces: `/opt/localcloud/PUBLIC_PREVIEW` and a production/public-preview release configuration

- [x] Replace the Community/commercial grant with the approved Public Preview grant.
- [x] Add an explicit `PUBLIC_PREVIEW=true` release marker and require it when production images disable enforcement.
- [x] Remove license-key setup from exact-candidate smoke startup and assert all three build markers.
- [x] Update build-contract tests and operator documentation.
- [x] Run the focused production-marker Python test and `ProductionModeTest`; record the unrelated macOS `mapfile` limitation in the broad Python module.

### Task 2: Pricing Workbench and public policy copy

**Files:**
- Modify: `src/components/PricingWorkbench.astro`
- Modify: `src/pages/pricing.astro`
- Modify: `src/pages/docs/licensing.mdx`
- Modify: `src/data/docs-contract.snapshot.json`
- Modify: public FAQ, agent, marketing, footer, and distributed-document sources containing the superseded commercial restriction

**Interfaces:**
- Consumes: `docsContract.licensing` and the governing runtime license URL
- Produces: one free-preview pricing surface and consistent public summaries

- [x] Replace the two-plan board with the approved single preview card.
- [x] Update public copy to include company development and CI while retaining the non-production boundary.
- [x] Remove commercial-contact product facts and obsolete paid-license warnings.
- [x] Regenerate `public/llms.txt` and `public/llms-full.txt` from the revised documentation contract.

### Task 3: Verification

**Files:**
- Modify: `scripts/verify-policy-docs.mjs`
- Modify: `scripts/verify-content-facts.mjs`
- Modify: `scripts/verify-docs-contract.mjs`
- Modify: `scripts/verify-distributed-docs.mjs`
- Modify: `scripts/search-routes.mjs`

**Interfaces:**
- Consumes: rendered pricing HTML and public source copy
- Produces: failures for reintroduced commercial-tier claims, missing preview terms, or a numeric price

- [x] Update assertions for the free-preview contract.
- [x] Run the focused policy and contract validators.
- [x] Build the Astro site and run rendered pricing checks.
- [x] Inspect the desktop and mobile page rendering.
