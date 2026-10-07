# Production readiness: Desktop and Classic release

User authorized production review, fixes, push to main, Cloudflare deployment and live verification on 2026-10-07. Candidate base and latest deployed origin/main: c79afabff9bf3c65d2d1229ed63c90f8fe4486d2. Publication is now authorized; earlier local-only checkpoints remain historical.

## Review and fixes

A fresh reviewer found no Critical, Important or warranted Minor issue. Chromium navigated all 83 content routes with persistent shell identity, destination headings, zero console warnings/errors and zero failed requests. The review covered CI without sibling repositories, pinned manifests, legacy fallback, one-generation carry, security/MIME/cache headers and static/Markdown/AI discovery parity.

Release hygiene now excludes local BMad runtime/review workspace, original artwork PNGs and unused icon alternatives from Git; public upload exclusions prevent accidental publication of local tooling/icon sources. Files remain locally available. Active artwork/icons and their licenses remain in the release. BUILD.md now describes the complete Markdown and build-pinned Desktop pipeline.

## Pre-publication qualification

- Frozen dependency install with pnpm 12.9.1 passed; production dependency audit reports no known vulnerabilities. An initial audit attempt used older local pnpm through PATH; rerunning with the pinned toolchain passed. CI already pins pnpm 12.9.1 and Node 24.21.0.
- Full build:cloudflare passed, including content/contract/policy/SEO, Pagefind, CSP, Markdown, pinned manifests and compression.
- Required installer verification passed.
- Automated checks: performance 105, workerd 9, analytics 26, live-verifier tests 7, sitemap 11 and asset carry 6: 164 passed with no skips/failures.
- Strict upstream verification passed for recorded committed runtime 8da58755226ded8d2185789c87ccf0f93bc0ec1f and CLI 0.1.8. No sibling worktree edits were imported or modified.
- Graft refresh and git diff --check passed. Static initial-page budgets remain unchanged; aggregate app startup remains within 45KB.
- All 84 HTML routes and 83 Markdown page twins remain, with curated AI resources, robots/sitemap/IndexNow, schema/canonicals and HTML/Markdown negotiation. Images stay indexable; routing JSON/code remain noindex.

## Publication and live gates

Push the reviewed candidate to main without force. The configured Deploy to Cloudflare Workers workflow repeats frozen-install/audit/build/tests, preserves previous assets, deploys and verifies its deployment URL and custom domain. Complete only when the exact candidate SHA has a successful workflow and live HTTP/browser checks confirm the new Desktop plus Classic, metadata/discovery, pinned assets, headers, redirects and 404s. Record the final SHA/run/HTTP/browser evidence in the task artifact and final response; a deployment receipt is not a search-engine indexing guarantee.
