# Desktop performance and SEO review

Scope: current uncommitted Desktop implementation on codex/desktop-classic-view, baseline c79afabff9bf3c65d2d1229ed63c90f8fe4486d2. User authorized review and fixes with bmad-code-review and bmad-agent-dev. Four independent lenses ran on the implementation and again on its fixes.29 raw findings normalize to26 distinct fixes, all completed. No unresolved or deferred issue remains.

## Individual triage before grouping

| Raw ID | Lens | Finding | Verdict and verified evidence | Group |
|---|---|---|---|---|
| B1 | Blind | Scroll writes exhaust history quota | Medium: replaceState runs on every scroll; quota harness reproduces errors and native fallback | P1 |
| B2 | Blind | Classic keyboard shortcuts switch mode | Medium: G H/D/S fallback omits the explicit view parameter; VM reproduces | P2 |
| B3 | Blind | Early authorized pageviews disappear | Medium: isReady guard prevents queueing before SDK load | P3 |
| B4 | Blind | Home anchors address invisible content | Medium: manual-quickstart and FAQ targets have a display:none ancestor; scrolling cannot reveal them | P4 |
| B5 | Blind | Startup script budget misses injected modules | Medium: static-tag sum excludes automatically requested modules; measured Docs total exceeds the named static measure | P5 |
| B6 | Blind | Wholly redundant route CSS loads | Medium: Docs70,701-byte CSS is an exact prefix of retained Home inline CSS, but full-hash comparison requests it again | P6 |
| B7 | Blind | Warming stops before required assets | Medium: JSON warming leaves sequential CSS/script downloads after click | P7 |
| B8 | Blind | Hidden Classic hero is eager/high priority | Medium: Desktop selects template artwork after the Classic eager image can fetch | P8 |
| B9 | Blind | Hidden shortcuts and source swaps fetch unused images | Medium: eager fallback icons are replaced with final sources; Classic/mobile chrome is hidden | P9 |
| B10 | Blind | Filter mounts retain old catalogs | Medium: per-catalog media listener has no swap cleanup | P10 |
| E1 | Edge | Classic keyboard parameter loss | Medium: independent VM confirmation of B2 | P2 |
| E2 | Edge | Hung fetch never reaches fallback | Medium: a never-settling request leaves navigation busy indefinitely | P11 |
| E3 | Edge | Mounted feedback loses dismissal behavior | Medium: shared module binds only its first FAB, not subsequent mounts | P12 |
| V1 | Verification | Release commands omit Desktop suites | Medium: both test files absent from package/deploy test chains | P13 |
| V2 | Verification | Head replacement is untested | Medium: removing metadata(page) in memory still passes all8 navigation tests | P14 |
| V3 | Verification | Production JSON responses are untested | Medium: workerd checks omit manifest/page JSON status, MIME, cache and noindex | P15 |
| V4 | Verification | Classic keyboard regression | Medium: independently reproduced mode loss, grouped with B2/E1 | P2 |

No raw actionable finding was discarded. The intent lens was descriptive: it identified differences between static parity, user-visible reachability, local performance evidence and real indexing outcomes. These are accounted for by the patches and qualification limits below, rather than treated as extra defects.

## Scope and invariants

The default Home still ends at its three personas. Existing Home fragments must expose their requested content inside Desktop. Classic/mobile retain complete content. Existing robots allowlists, sitemap/IndexNow publication workflow, static HTML, canonicals, metadata/schema, Markdown negotiation, llms.txt/llms-full.txt and curated AI resources stay shared. No new route tree, dependency, security exception, commit, push or deployment.

The existing17KB static-script ceiling stays unchanged. Add a separate aggregate startup-module guard so the measure is honest. Any narrow deferred router-budget adjustment must state its verified reason and preserve the aggregate ceiling.

## Primary sources and interpretation

History throttling follows the [WebKit history implementation](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/page/History.cpp), which bounds repeated push/replace writes. SEO follows [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): real hrefs and complete static/correctly rendered metadata are retained.

Home-fragment fixes address inaccessible existing content. They do not promise FAQ rich results: [Google's June2026 update](https://developers.google.com/search/updates#june-2026) reports that feature retired and clarifies that llms.txt is optional for Google while other systems can use it. Existing AI resources remain available as requested.

## Fix and verification record

### Post-fix review triage

All four lenses completed again. Each finding was graded before grouping; F1/E1 share the Home-filter root cause. The parent also reproduced reading-position loss with a mounted widget pending (777 restored as0), and verified off→on analytics has no current-page capture after automatic pageviews were disabled. All are patches within the original authorized goal; no rollback of working or pre-existing edits is needed.

| Raw ID | Source | Finding | Verdict/evidence | Action |
|---|---|---|---|---|
| F1 | Blind | Revealed Home filter has no initializer | Medium: Home payload has visible fragment filter without bootstrap; only visiting Services first makes it work | Lazy mount initialization |
| F2 | Blind | Hero image receives noindex | Medium: all Astro assets inherit noindex, including WebP | Scope artifact headers |
| F3 | Blind | Blog outline captures old article | Medium: deduplicated module controls detached first details; VM confirms second remains closed | Mount-safe outline hook |
| F4 | Blind | Home Markdown concatenates cards | Low:17 adjacent link joins merge service boundaries in AI-readable output | Separate card items |
| F5 | Blind | No-hash swaps lack content focus | Medium: removed keyboard target leaves focus at document instead of destination | Focus destination content |
| F6 | Blind | Old measured sizes remain in report | Low: emitted assets differ from recorded older candidate | Parent refreshes final measurements |
| E1 | Edge | Home filter lacks initializer | Medium: independent direct-fragment reproduction; same cause as F1 | Grouped with F1 |
| E2 | Edge | Deployment mixes shared script generations | Medium: commit-stamped module URLs bypass dedup in old tabs; two Header delegates cancel menu opening | Pin immutable build manifest |
| V1 | Verification | Named head metadata is not asserted | Medium: mutation dropping description/robots still passes18 router tests | Add exact head assertions |
| V2 | Verification | Hover/focus limits are not tested | Medium: removing SaveData/2g/cap guards still passes18 tests | Exercise speculative handlers |
| R1 | Parent | Reading during widget initialization is lost | Medium: save/positions changing guards leave state0 after user scroll777 and navigation | Correct boundary flush |
| R2 | Parent | Opt-in omits current pageview | Medium: automatic capture disabled and setOn(true) has no explicit capture for initially-off analytics | Capture permitted current visit once |

No actionable finding rejected or deferred. The intent audit reiterates that local proof does not establish live indexing or field performance. No deployment is requested.

Implementation is tracked in _bmad-output/implementation-artifacts/spec-desktop-performance-seo.md. Both review passes and parent findings are fixed and covered by the executed release checks. IndexNow receipt, production Core Web Vitals, and actual Google/AI-engine indexing remain separate from local build/browser/HTTP proof.

### Final verification

- Full build and installer pass. Performance105/105, workerd9/9, analytics26/26 and sitemap/asset17/17 pass:157 automated checks, zero failures/skips. Both Desktop suites now run in test:performance and both release paths.
- Strict upstream check passes against recorded committed runtime8da58755226ded8d2185789c87ccf0f93bc0ec1f and CLI0.1.8. No sibling files changed.
- All84 HTML routes,83 page Markdown twins,6 curated AI Markdown resources and47-page technical corpus remain. Canonicals, descriptions/robots, OG/Twitter/article metadata, JSON-LD, robots allowlists, sitemap/IndexNow workflow, Markdown negotiation and llms resources remain shared.
- Workerd proves JSON MIME/cache/noindex, image indexability, Classic/clean discovery responses and module MIME. Old documents pin their immutable manifest; a legacy unpinned document uses native fallback. Previous-generation carry includes its manifest, payloads and bundles. A two-generation fixture verifies no second Header delegate installs.
- Browser proves direct Home catalog filtering/empty state before Services, visible manual/FAQ anchors, return to plain Home/personas, persistent Service→AI→Docs chrome, destination focus, current canonical/Markdown/schema, Classic G H/S destinations and correct hero preload selection. Two successive blog outlines open at wide widths and respond to1024px/1651px resizing. No console errors/warnings observed.
- Home ends at three visible personas with no pane overflow at1024×720,1280×720 and1651×998 in the final candidate. Original five-size proof remains in the earlier checkpoint.
- Home→Docs reuses the already-installed70,701-byte stylesheet instead of fetching it again. Asset warming never executes scripts early and respects SaveData/2g/three-route guards. Hidden alternatives no longer get eager requests; images remain indexable.
- Final graft refresh and git diff --check pass. Existing dirty work remains; no commit, push, PR or deployment.

| Final maximum | Bytes | Ceiling |
|---|---:|---:|
| Raw HTML |182,896|184,700|
| Gzip HTML, level9 |34,357|37,400|
| Inline styles |94,167|94,600|
| Static script assets |15,478|17,000|
| Aggregate app startup scripts |44,881|45,000|

Deferred assets: controller13,330 bytes, router11,890, interactions4,183, Desktop refinements8,157, keyboard4,528 and filter1,946. Only the deferred router ceiling changed from10KB to12KB to cover the verified timeout/history/focus/manifest fixes; it is now constrained by the45KB aggregate guard. Static initial-page ceilings were not raised. These are raw app-script measurements, not production transfer/latency or field CWV scores.

Evidence: task visualization folder navigation-speed/performance-seo-review contains metrics.json, resize.json, home.png and desktop-faq.png. Final logs are /private/tmp/localcloud-bmad-final-*.log. The original-content hash comparison remains72 identical and12 documented upstream-content/review-date differences; no route or section was removed.
