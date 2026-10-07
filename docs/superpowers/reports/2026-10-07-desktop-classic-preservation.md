# Desktop and Classic preservation verification

Initial checkpoint verified locally on 2026-10-07 on `codex/desktop-classic-view`. Baseline: `c79afabff9bf3c65d2d1229ed63c90f8fe4486d2`. This records the pre-review candidate; current measurements, fixes and157-check verification are in2026-10-07-desktop-performance-seo-review.md. No commit, push, PR or deployment.

## Preservation and content authority

- All 84 existing HTML routes and canonical/noindex boundaries remain.
- All 83 Markdown twins remain; 404 is excluded. Existing Accept: text/markdown negotiation and curated agent resources remain.
- All 47 technical pages remain in llms-full.txt (246,379 bytes, under the unchanged ceiling).
- All Classic sections, original hero, footer and mobile navigation remain. Desktop Home ends at its three personas.
- 72 normalized main-content captures are identical to the original baseline. The 12 expected differences are recorded in navigation-speed/persistent-preservation.json: five service guides, service/compatibility/AI catalogs, and four review-date updates. No sections or routes were removed; baseline hashes were not overwritten.

The final documentation check detected newer committed runtime documentation. The snapshot now records runtime `8da58755226ded8d2185789c87ccf0f93bc0ec1f` and CLI `85b39cf4708ca1359bb45e5999de10f45e382439` (0.1.8). Strict upstream verification passes for 27 runtime services. Unrelated dirty sibling CLI changes were excluded by retaining the committed source digests; no sibling files were changed.

Compatibility summaries now cover locally issued push/task/scheduler tokens, IAM Credentials/OIDC federation, and GKE pod identity. Receivers must trust the local issuer/JWKS. The catalog retains 25 local services and two Unsupported entries; no Partial or redundant Supported badges were added. This is documentation synchronization, not new runtime or image qualification.

## Persistent navigation and SEO

Desktop replaces only the center pane. Toolbar, wallpaper, sidebar icons, window controls and search remain mounted. Real route/query/fragment URLs, copied links, reload and browser Back/Forward remain usable. Close/Back use the same router; one-page Close/minimize remains immediate.

The build extracts static payloads from existing rendered pages, not a second authored route tree. Content-addressed JSON/CSS/JS use the existing immutable asset cache and previous-deployment carry. Hover/focus warms at most three route payloads; the memory cache holds six. Save-Data/2G skips warming. Desktop removes full-document speculation rules; Classic retains them.

Complete HTML and crawlable links remain served directly without requiring JavaScript. Existing sitemap, robots/indexing boundaries, canonical URLs, social metadata, JSON-LD, Pagefind and Markdown negotiation pass. Content swaps update title, description/robots/social/article metadata, canonical, JSON-LD and machine-readable Markdown alternate. Internal routing assets have X-Robots-Tag: noindex. The search index contains 81 pages and 3,439 words.

Scripts load only from validated same-origin build URLs with SRI. No eval, Blob scripts, iframe, ClientRouter or CSP exception. Native navigation is the failure fallback and the Classic/mobile behavior. X-Frame-Options: DENY and frame-ancestors 'none' remain enforced.

## Verification

Full build, required installer suite, strict committed upstream verification, 122 regression/asset/SEO checks and seven local Worker checks pass (129 checks plus installer/build). Existing HTML/style/script/Markdown ceilings were not raised; dependencies were not added.

Real browser checks: Service → AI Agents → Docs retains shell/icon/control identities; search Enter opens BigQuery in Desktop; metadata and current Markdown/Open tab update; Docs tabs/copy/feedback work after revisiting; console animation initializes; Close/minimize/expand work; browser Back restores a hash page's actual reading position (1405 → 1405); Classic links retain their mode; mobile menu and 390px reading have no horizontal overflow. No console errors/warnings were observed.

Independent Chrome review reproduced and verified fixes for cancellation, interrupted widget initialization, stale Markdown/schema metadata and keyboard skip-link focus. Runnable tests cover delayed navigation, same-page anchor cancellation, initialization completion, stale script-loop isolation and all-route SEO payload parity. Ordinary anchors do not emit extra pageviews.

All personas remain visible without pane overflow at 1024×720, 1280×720, 1440×900, 1651×998 and 1920×1080. Evidence is under navigation-speed/persistent-resize-checks.json and persistent-home.png in the task visualization folder.

Measured HTML maxima are below the existing limits: raw 182,216 bytes, gzip 34,379 bytes (conservative default compression), inline styles 93,919 bytes, initial script assets 15,301 bytes. Deferred controller is approximately 13.4 KB, router 8,980 bytes, site interactions 4,047 bytes and Desktop refinements 7,877 bytes. Numeric production latency, Lighthouse/field Core Web Vitals and live deployment/indexing are not claimed.
