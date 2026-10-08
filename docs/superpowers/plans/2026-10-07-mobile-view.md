# LocalCloud Mobile View Implementation Plan

> Steps use checkbox (`- [ ]`) syntax so an executor can track progress task by task.

**Goal:** Implement the approved mobile home-screen presentation across the existing LocalCloud website, with explanatory content first, service icons below, and accessible navigation.

**Architecture:** Keep the existing route tree and one authored page body. Extend the shared view selector and shell with a Mobile presentation, reuse the current Header, service registry, icons, guides and search, and use native page navigation on mobile. Desktop retains its window navigation and Classic remains the complete fallback.

**Tech Stack:** Astro, TypeScript/JavaScript modules, existing CSS, existing SVG/WebP assets, Node's built-in test runner and existing browser tooling. No new dependencies.

**Spec:** The [approved design](#approved-design) in this document is the self-contained specification. Visual reference: `/Users/jsenjaliya/.codex/generated_images/01a119c8-c269-79c3-b3b1-88d9abe46785/exec-e5ca4aca-c48d-4d23-88af-020c48e4026e.png`. Subsequent design refinement: replace its two-row service grid with one horizontally scrollable service strip; selecting a service opens its content at the top. Existing preservation constraints: `docs/superpowers/specs/2026-10-06-desktop-classic-view-design.md`; this plan supersedes its narrow-screen Classic fallback only when Mobile is selected.

## Global Constraints

- Node.js `>=24.21.0`; package manager `pnpm@12.9.1`.
- Planning is complete before source implementation begins; do not deploy, push, or create a PR as part of this plan's implementation.
- Reconcile the current dirty worktree before editing. Existing asset/performance changes in shared components belong to other work; preserve them and stage only owned hunks.
- One route tree, existing canonical URLs, one H1 and one main landmark per page. Preserve section IDs, complete technical content, search, Markdown twins, legal links and analytics choices.
- Public service labels are Supported/Unsupported only. Do not add redundant Supported badges. Firestore remains supported and opt-in; Dataproc remains supported.
- Service names, slugs, icon IDs, availability, capabilities, boundaries and counts come from the current `services.ts`, editorial/guide data and documentation contract. The mockup is visual guidance, not a capability registry.
- No PWA install prompt, service worker, app download flow, account gate, simulated runtime controls, localhost probing or new animation library.
- Ordinary anchors provide mobile navigation and browser Back/Forward. Avoid loading the desktop router, route payloads and deferred desktop page styles on an initial Mobile visit.
- Preserve the current privacy-safe analytics behavior, including replay/heatmaps being disabled below `64rem`.
- Without JavaScript, the existing complete Classic site remains readable and navigable.

---

## Approved Design

### Main home page

The left reference screen is the actual proposed home page, not a separate launcher page. It is one naturally scrolling document; the mockup shows its top portion.

1. Compact header: existing LocalCloud brand, menu and search. Reuse the current navigation menu to retain AI Agents, Pricing, Compare, Blog and help destinations.
2. Ivory hero card on powder-blue wallpaper:
   - Eyebrow: `Google Cloud in-a-box`.
   - One H1 displaying `Your cloud. On your computer.` with the second phrase in blue.
   - Introduction: `Build, test and give your AI agents a local Google Cloud.`
   - Primary action: `Explore services`, linking to the existing `/services/` route.
   - Compact audience line: `Development · CI · AI agents`.
   - Existing laptop illustration, adapted for a small card. The headline and action remain readable if the image fails.
3. `Explore services` launcher: one horizontal row of labeled app-like service icons below the hero. The strip scrolls sideways to every available supported service; show roughly three or four complete tiles and part of the next tile on a phone to reveal that more exist. Lead with Cloud Storage, BigQuery, Pub/Sub, Spanner, Firestore and Cloud Run, then append the remaining supported services in shared catalog order. `View all` opens `/services/`, where Unsupported entries remain discoverable. `Storage` may be the short visible label for Cloud Storage; its accessible name identifies Cloud Storage. The selected service has a clear outline/text state. The strip stays in the document below the introduction, rather than becoming another fixed bar above the dock.
4. Three compact benefit cards: developers, CI and AI agents, using the existing persona copy and links to the relevant guides. This section explains what visitors can achieve, without runtime controls.
5. Existing lower home content remains available: installation guidance, workflow ribbon, complete categorized service inventory, articles, FAQs, trust evidence and footer. Keep computer setup guidance below the introduction/launcher/benefits, clearly identified as setup on a computer. Mobile's initial screen has no shell command or install CTA. Existing setup anchors and instructions remain reachable.
6. A four-item dock: Home, Services, Docs, About. It leaves space for content and the device safe area. The dock provides navigation, not an app-install metaphor.

Do not require everything to fit one screen. On short screens, large text or landscape, the document scrolls vertically instead of shrinking labels. Only the service strip scrolls horizontally; keep the page itself within the viewport.

### Service page and other pages

- Opening a service icon loads its existing `/services/<slug>/#main-content` page and brings the service introduction to the top, including when reselecting the current service. Use the existing native anchor target and a header-aware scroll margin; do not scroll the old page before navigating or intercept browser history. Keep normal Back/Forward scroll restoration. Do not impose a long animated scroll on cross-page navigation.
- The service introduction becomes an ivory information card: canonical service icon/name, existing introduction and documented capability summaries, `Read guide` linking to the existing `#usage` section, and a compatibility link.
- Reuse the existing breadcrumb as the Services return link. Place `Explore another service` below the introductory card, with the current service selected by its canonical pathname. On initial service-page load, reveal that selected icon by changing only the strip's horizontal scroll position. Do not call `scrollIntoView` on that icon: it can scroll the whole page down to the strip and hide the introduction the visitor just opened.
- Keep connection information, opt-in instructions, workflows, boundaries, examples, agent guidance and FAQ in the document below. Unsupported services retain their current callout and do not gain a nonexistent usage action.
- Docs, compatibility, catalog, blog, pricing and policy pages share the compact header/dock and reading surfaces. Tables and code can scroll horizontally within their own containers; the page itself must not overflow.
- The catalog retains all published entries and its existing filters, including Unsupported labels where applicable.
- No handset frame, status bar, browser address bar or fake OS controls are implemented inside the website; those are presentation context in the mockup.

### View selection contract

| URL choice | Below `64rem` | At/above `64rem` |
| --- | --- | --- |
| No `view`, or unrecognized value | Mobile | Desktop |
| `?view=classic` | Classic | Classic |
| `?view=mobile` | Mobile | Mobile, with a readable centered content width |
| Legacy `?view=desktop` | Mobile | Desktop |

- `Automatic` clears only the `view` parameter. `Mobile` and `Classic` set their respective values. Keep the route, unrelated query parameters and fragment.
- Do not introduce a stored preference that overrides clean URLs.
- Explicit Mobile/Classic choices survive ordinary internal links and dynamic search results. Automatic links remain clean.
- With a clean URL, resizing across `64rem` changes the presentation without discarding the page or browser history. Explicit overrides remain stable.

## Source Map and File Responsibilities

| File | Responsibility in this implementation |
| --- | --- |
| `src/layouts/BaseLayout.astro` | Critical pre-paint view selection, mobile CSS import, correct homepage image preload and controller loading. |
| `src/scripts/desktop-view.mjs` | Extend `pickView`/`switchView`, share explicit-view link formatting, initialize the appropriate presentation. |
| `src/scripts/desktop-navigation.mjs` | Keep click interception, history handling and warming restricted to active Desktop mode, including after resizing. |
| `src/scripts/keyboard-shortcuts.mjs` | Preserve explicit Mobile as well as Classic in synthesized navigation URLs. |
| `src/components/DesktopShell.astro` | Add the mobile dock and view choices around the existing single content slot; retain desktop chrome. |
| `src/components/Header.astro` | Adapt the existing header/menu and expose mobile search with the existing search trigger. |
| `src/styles/mobile.css` (new) | Scoped Mobile tokens, content surfaces, horizontal service strip/dock, header, safe-area and readable overflow rules. |
| `src/components/MobileServiceLauncher.astro` (new) | Small reusable horizontally scrollable service link strip, consuming the existing catalog order and ServiceIcon. |
| `src/components/HomepageVariationFieldManual.astro` | Mobile hero presentation, launcher and persona hierarchy; preserve Classic content and Desktop's compact home. |
| `src/utils/home-images.ts` | Reuse the current laptop source for a right-sized Mobile image and matching preload. |
| `src/pages/services/[slug].astro` | Mobile guide actions/launcher around the current service content and anchors. |
| `scripts/verify-desktop-view.test.mjs` | View/URL/bootstrap and cross-mode regressions using its existing VM harness. |
| `scripts/verify-desktop-navigation.test.mjs` | Desktop-router exclusion in Mobile and behavior after viewport changes. |
| `scripts/verify-page-performance.test.mjs` | Mobile preload, startup and unchanged analytics behavior. |
| `scripts/verify-page-budgets.test.mjs` | Existing budget verification; do not automatically raise limits. |

Read current source at execution time: several files above already contain uncommitted asset and performance work. No registry, route, dependency or deployment configuration changes are planned.

## Task 1: Extend View Selection and Native Navigation

**Files:** Modify BaseLayout, desktop-view, desktop-navigation and keyboard-shortcuts; test the existing desktop suites.

**Interfaces:** `pickView({ override, wide = true } = {})` returns `classic | mobile | desktop`; `switchView(event)` preserves the current URL components. A private `initViewLinks(view)` handles explicit `classic`/`mobile`; keep the existing exported `initClassic()` wrapper for callers/tests.

- [x] Add failing selection tests to `scripts/verify-desktop-view.test.mjs`:

```js
test('Mobile and Classic overrides beat the automatic breakpoint', () => {
  for (const [override, wide, expected] of [
    [undefined, false, 'mobile'], [undefined, true, 'desktop'],
    ['mobile', false, 'mobile'], ['mobile', true, 'mobile'],
    ['classic', false, 'classic'], ['classic', true, 'classic'],
    ['desktop', false, 'mobile'], ['desktop', true, 'desktop'],
    ['unknown', false, 'mobile'],
  ]) assert.equal(pickView({ override, wide }), expected);
});
```

- [x] Run `node --test scripts/verify-desktop-view.test.mjs`; confirm the new narrow-screen cases fail.
- [x] Implement the selection rule and mirror it in the existing critical bootstrap:

```js
export function pickView({ override, wide = true } = {}) {
  if (override === 'classic' || override === 'mobile') return override;
  return wide ? 'desktop' : 'mobile';
}
```

Set both `data-site-view` and the mutually exclusive `desktop-view`/`mobile-view` classes before body paint. Load the existing shared view module once for URL handlers; call `initDesktop()` only for active Desktop on a wide viewport. Mobile does not request `desktop-navigation` or `desktop-pages.css`.

- [x] Extend view-choice URL handling, using this body inside `switchView` after its existing modifier-click guard:

```js
const url = new URL(location.href);
const choice = link.dataset.viewChoice;
if (choice === 'classic' || choice === 'mobile') url.searchParams.set('view', choice);
else url.searchParams.delete('view');
location.href = url.href;
```

Use the existing `pageWindowURL` validation in shared link formatting; preserve download/external/raw-document behavior. Observe current search results exactly as `initClassic` already does. Keyboard-generated URLs copy `view` only when it is `classic` or `mobile`.

- [x] On automatic breakpoint changes, update the active classes, show the main content if a Desktop window had been closed, and initialize the selected presentation once. Do not focus a hidden Desktop titlebar on narrowing. Guard asynchronous Desktop initialization/failure so it cannot replace a subsequently selected Mobile view.
- [x] Add `document.documentElement.dataset.siteView === 'desktop'` to the existing router's eligibility checks for clicks, keyboard navigation, prewarming and popstate. This matters for explicit Mobile on a wide browser and for a router already loaded before narrowing.
- [x] Extend the VM tests to prove: query/fragment preservation; explicit choice retention in search/keyboard links; no router/style requests on initial Mobile; Desktop-to-Mobile-to-Desktop resizing; only one initialization; normal navigation after narrowing; script failure leaves readable content. Update the old narrow-screen bootstrap expectation deliberately, retaining all Classic/desktop security/history assertions.
- [x] Run `node --test scripts/verify-desktop-view.test.mjs scripts/verify-desktop-navigation.test.mjs`; review and commit only this task's owned hunks when all pass.

## Task 2: Add the Mobile Header, Dock and Shared Surfaces

**Files:** Modify DesktopShell/Header/BaseLayout; create `src/styles/mobile.css`.

**Interfaces:** Existing Header/menu/search handlers remain authoritative. New dock anchors use existing routes and `aria-current="page"` only for their corresponding route family. `[data-mobile-only]` is hidden by default and shown only in Mobile; presentation chrome uses `data-pagefind-ignore`.

- [x] Add the four native anchors after the shared content slot, rather than another content wrapper:

```astro
<nav class="mobile-dock" data-mobile-only data-pagefind-ignore aria-label="Mobile navigation">
  <a href={base} aria-current={path === base ? 'page' : undefined}>Home</a>
  <a href={base + 'services/'} aria-current={section === 'Services' ? 'page' : undefined}>Services</a>
  <a href={base + 'docs/'} aria-current={path.startsWith(base + 'docs/') || path.startsWith(base + 'glossary/') ? 'page' : undefined}>Docs</a>
  <a href={base + 'about/'} aria-current={path === base + 'about/' ? 'page' : undefined}>About</a>
</nav>
```

Add consistent inline SVG glyphs with `aria-hidden="true"` beside these visible labels. Reuse existing glyph shapes; no icon dependency. Keep menu/header/dock focus order aligned with the reading order.

- [x] Reuse `#site-nav-toggle`, `#site-nav-mobile` and `data-search-trigger`. Add a mobile search button only where the existing desktop search is hidden. Put Automatic/Mobile/Classic view links in the existing menu, with real hrefs and `data-view-choice` values. Keep every current navigation destination reachable.
- [x] Import the new stylesheet in BaseLayout and start with:

```css
[data-mobile-only]{display:none}
.mobile-view{--bg:#cedbef;--surface:#faf8f1;--accent:#2f58ed;--accent-strong:#2448ce;--text:#202020;--mobile-dock-space:calc(5.5rem + env(safe-area-inset-bottom,0px))}
.mobile-view [data-mobile-only]{display:block}
.mobile-view body{overflow:auto;padding-bottom:var(--mobile-dock-space)}
.mobile-view .mobile-dock{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));position:fixed;inset:auto 1rem max(.5rem,env(safe-area-inset-bottom,0px));z-index:60;background:var(--surface);border-radius:1.25rem;padding:.5rem}
.mobile-view .mobile-dock a{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:3rem;color:var(--text)}
.mobile-view .mobile-dock [aria-current=page]{color:var(--accent-strong);font-weight:700}
.mobile-view .feedback-fab{bottom:calc(var(--mobile-dock-space) + .75rem)}
.mobile-view :where(a,button,summary):focus-visible{outline:2px solid var(--accent-strong);outline-offset:3px}
```

Complete the scoped header/content rules with 16px phone gutters, opaque ivory surfaces, modest borders/shadows, 48px control hit areas and a readable maximum width for explicitly selected Mobile on wide displays. No `100vh` content trap, nested full-page scrolling or animated wallpaper on phones. Use a flexible dock height for enlarged labels, with matching reserved space.

- [x] Verify 320/375/390/430px portraits, phone landscape and tablet: menu open/close/Escape, search focus, dock targets, enlarged text, visible focus, footer analytics control and feedback overlay clearance. Check fixed/sticky UI against the software keyboard and safe areas.
- [x] Run the existing desktop suites and `pnpm run build`; review and commit only owned changes.

## Task 3: Build the Shared Horizontal Service Strip

**Files:** Create `src/components/MobileServiceLauncher.astro`; extend mobile.css and the Mobile initialization branch in desktop-view.mjs.

**Interfaces:** Props `{ title?: string }`, default `Explore services`. Consume `servicesInCatalogOrder: Service[]`, `ServiceIcon`, Astro's base URL/path. No new service registry, carousel library, page-selection store or custom swipe handler.

- [x] Build the row from available supported services, promoting the six reference services once:

```astro
---
import ServiceIcon from './ServiceIcon.astro';
import { servicesInCatalogOrder } from '../data/services';
interface Props { title?: string; }
const { title = 'Explore services' } = Astro.props;
const rawBase = import.meta.env.BASE_URL;
const base = rawBase.endsWith('/') ? rawBase : rawBase + '/';
const eligible = servicesInCatalogOrder.filter(service => service.catalogState === 'available' && service.marketingStatus === 'supported');
const promotedIds = ['gcs', 'bigquery', 'pubsub', 'spanner', 'firestore', 'cloudrun'];
const byId = new Map(eligible.map(service => [service.id, service]));
const promoted = promotedIds.flatMap(id => { const service = byId.get(id); return service ? [service] : []; });
const launcherServices = [...promoted, ...eligible.filter(service => !promotedIds.includes(service.id))];
---
<section class="mobile-launcher" data-mobile-only data-pagefind-ignore>
  <div class="mobile-launcher__heading"><h2>{title}</h2><a href={base + 'services/'}>View all</a></div>
  <nav class="mobile-service-strip" tabindex="0" aria-label={title}>
    {launcherServices.map(service => (
      <a href={base + 'services/' + service.slug + '/#main-content'} aria-label={service.name} aria-current={Astro.url.pathname === base + 'services/' + service.slug + '/' ? 'page' : undefined}>
        <span class="mobile-service-tile"><ServiceIcon iconId={service.iconId} name={service.name} size={40} /></span>
        <span>{service.id === 'gcs' ? 'Storage' : service.name}</span>
      </a>
    ))}
  </nav>
</section>
```

- [x] Use a native horizontal scroller, a partial next tile and gentle proximity snapping. Keep vertical page gestures natural; do not restrict touch-action to pan-x, auto-advance the row or hide focus indicators.

```css
.mobile-view .mobile-service-strip{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:5rem;gap:.75rem;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;padding:.25rem}
.mobile-view .mobile-service-strip a{display:flex;flex-direction:column;align-items:center;gap:.5rem;min-width:0;text-align:center;color:var(--text);scroll-snap-align:start}
.mobile-view .mobile-service-tile{display:grid;place-items:center;width:4rem;aspect-ratio:1;background:#e7f0ff;border:1px solid #c1d1e8;border-radius:1rem;box-shadow:0 2px 3px #253d6314}
.mobile-view .mobile-service-strip [aria-current=page] .mobile-service-tile{outline:2px solid var(--accent-strong);outline-offset:2px}
.mobile-view .mobile-service-strip a:active .mobile-service-tile{background:#d4e4fb}
.mobile-view #main-content{scroll-margin-block-start:4.5rem}
```

Use the actual compact header height for the final scroll margin. Retain canonical icon shapes; the generated reference's 3D symbols are illustrative. Let long labels wrap and row height grow at larger text sizes. The focusable scroll container and native anchors support keyboard navigation; `View all` provides a non-swipe route to the complete catalog. The local UX lookup did not provide a specific verified service-strip pattern; these details use general keyboard guidance and native CSS behavior.

- [x] Reveal the selected icon once when a new Mobile service page initializes, adjusting only the horizontal offset:

```js
for (const strip of document.querySelectorAll('.mobile-service-strip')) {
  const selected = strip.querySelector('[aria-current="page"]');
  if (selected) strip.scrollLeft = Math.max(0, selected.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2);
}
```

Do not run that adjustment on browser-history restoration or every resize; preserve restored horizontal position and the visitor's manual swipe. No document-level `scrollTo` or icon `scrollIntoView`. Service link `#main-content` handles new selections and reselection natively, while ordinary Back/Forward retain their restoration behavior. Respect reduced motion and avoid global smooth-scroll changes.

- [x] Verify every eligible service appears exactly once, promoted order is correct, Firestore is present, unsupported entries are absent from this strip, all hrefs resolve to existing service pages and `#main-content` exists. Assert selection uses the canonical pathname.
- [x] In a browser, swipe from the first to the last service, then select one beyond the first six. Verify its introduction is at the top and the active icon is visible when the strip is reached; horizontal centering must not move the document down. Reselect the current service from lower in its page and verify the introduction is shown. Use Back/Forward and check native reading/strip restoration, keyboard access to off-screen icons, visible focus, partial-next-tile affordance, 320px width and enlarged labels.
- [x] Commit the component/styles/initialization hunks only after those route and browser checks pass.

## Task 4: Implement the Main Home Page

**Files:** Modify HomepageVariationFieldManual, home-images and mobile.css; consume MobileServiceLauncher.

**Interfaces:** Reuse the existing H1, hero introduction, persona copy and source image. Keep `#main-content`, `#manual-quickstart` and all service/FAQ/trust anchors.

- [x] Add Mobile presentation spans to the current H1, without introducing a second heading:

```astro
<span data-mobile-only data-pagefind-ignore>Your cloud. <span class="field-hero__mobile-accent">On your computer.</span></span>
```

Hide the Classic H1 spans only under `.mobile-view`; do not change their content. Add the exact Mobile introduction, audience line and `Explore services` action from the approved design. Hide the hero's CLI command, install CTA and duplicate Classic illustration only in Mobile. Desktop's existing template-based hero remains untouched.

- [x] Insert `<MobileServiceLauncher />` directly after the hero. Add the three Mobile persona cards directly after it, consuming the current developers/CI/AI-agents text and existing persona assets. Their guide links target `/docs/sdk-examples/`, `/gcp-integration-testing/` and `/local-cloud-for-ai-agents/` respectively. Retain all existing lower sections in their current DOM order after these additions; do not remove the full inventory or footer.
- [x] Reuse the existing laptop asset through Astro image optimization with candidates no larger than 800px for Mobile. Store matching image options in home-images and matching `homeImages.mobile` preload metadata in BaseLayout. Render optional mobile art from a template when Mobile initializes so hidden Desktop/Classic images do not introduce extra initial requests. Text and navigation must work if this enhancement fails.
- [x] Extend the existing preload VM test for automatic Mobile and explicit Mobile, retaining its one-preload assertion. In a browser verify the displayed mobile art downloads the matching srcset candidate once and does not fetch the full Desktop image unnecessarily.
- [x] Confirm the actual Home hierarchy against the approved image, applying the subsequent one-row service-strip refinement, then scroll through all original lower content. Preserve one H1 and verify `/?view=classic#manual-quickstart`, `/`, and explicit Mobile with the same hash. Check desktop Home still ends at the persona row.
- [x] Run `pnpm run build` and the existing view/performance tests; commit only owned home/image/style hunks.

## Task 5: Adapt Service Pages and Qualify Other Page Families

**Files:** Modify `src/pages/services/[slug].astro` and mobile.css; consume MobileServiceLauncher. Modify desktop-navigation eligibility from Task 1 if a browser check exposes a remaining path.

**Interfaces:** Existing `guide`, `compatibility`, `service`, `isPlanned`, section IDs and all authored examples remain authoritative.

- [x] Add Mobile-only guide actions inside the existing service introduction:

```astro
{!isPlanned && <nav data-mobile-only data-pagefind-ignore aria-label="Service guide actions">
  <a class="site-button site-button--primary" href="#usage">Read guide</a>
  <a href={base + 'compatibility/'}>View compatibility</a>
</nav>}
```

Insert `<MobileServiceLauncher title="Explore another service" />` after the intro card and before the technical connection/details portion. The existing `service-hero-grid` combines introduction and connection; refactor that small markup boundary without duplicating its data or reordering Classic/Desktop reading. Keep the connection aside after the launcher in Mobile and in its existing two-column position in other views.

- [x] Use `.mobile-view` selectors for small service icons, readable card heading/body, scroll margin, and constrained code/table overflow. Reuse existing capability summaries; do not create custom claims such as mockup-only BigQuery feature lists.
- [x] Visit Cloud Storage, BigQuery, Pub/Sub, Spanner, Firestore, Cloud Run and an Unsupported service. Verify breadcrumb return, selected launcher icon, usage jump, opt-in guidance, Unsupported state, full boundaries and browser Back/Forward/reload.
- [x] Check `/services/`, `/compatibility/`, `/docs/`, a long SDK doc, a blog article, `/pricing/`, `/about/`, privacy and a missing route. Preserve filtering, copy feedback, menu/search, all footer links and raw Markdown behavior. No off-screen focus or horizontal page overflow.
- [x] Run the full build and relevant existing view/navigation suites; commit only owned service/style hunks.

## Task 6: Final Verification and Reviewable Handoff

**Files:** Test changes above; create `docs/superpowers/reports/2026-10-07-mobile-view-verification.md` during implementation with actual results/screenshots.

- [x] Capture Home, BigQuery detail, catalog and a long docs page at 375×812 and 390×844, plus landscape and a tablet. Compare top-of-page screenshots with the approved visual reference, replacing its two-row launcher with the refined single horizontal strip. Capture a service selected from beyond the initially visible icons and verify new selection/reselection shows the introduction at the top; browser history still restores reading position. Record checks at 320px, 200% text zoom, reduced motion, JavaScript disabled, blocked script loading, no storage and explicit Classic.
- [x] Capture a wide Desktop and a wide Classic screenshot after all changes. Confirm source/data integrity, native mobile navigation, Desktop route swaps, resize transitions, menu/search/dialog focus and fixed-control clearance.
- [x] Run the required pipeline with the repository's pinned toolchain:

```bash
pnpm run build
pnpm run test:installer
pnpm run test:performance
pnpm run test:analytics
git diff --check
graft build
```

If the shell resolves pnpm 8, use the already available Corepack entry point rather than install globally:

```bash
node /Users/jsenjaliya/.volta/tools/image/node/24.21.0/lib/node_modules/corepack/dist/pnpm.js run build
node /Users/jsenjaliya/.volta/tools/image/node/24.21.0/lib/node_modules/corepack/dist/pnpm.js run test:installer
```

Use that same prefix for the other pnpm commands. If any technical upstream/contract input is intentionally changed, also run `node scripts/sync-upstream-docs.mjs`, `UPSTREAM_DOCS_STRICT=1 node scripts/verify-upstream-docs.mjs`, and distributed-doc generation/verification before rebuilding. Pure layout work does not require updating committed upstream revisions.

- [x] Compare initial Mobile network requests and byte budgets with the current baseline. Keep existing ceilings unless a measured, documented change justifies a reviewed adjustment. Do not weaken tests to hide regressions; do not alter replay/heatmap scope.
- [x] Save verification evidence, exact commands/results and any material limitations. Distinguish local build/browser proof from deployment proof. Commit only the completed feature's owned changes after review; leave unrelated dirty work intact.

## Completion Criteria

- [x] The Home opening matches the approved information-first hierarchy with one horizontally scrollable row of supported services, a partial next tile and visible labels; all original lower content remains reachable.
- [x] Selecting or reselecting a service brings its introduction to the top. The selected icon can be revealed horizontally without scrolling the document down; Back/Forward preserve native reading restoration.
- [x] Mobile adapts the entire existing website with native navigation and usable header/dock, not just Home and BigQuery.
- [x] Clean URLs choose Mobile below `64rem` and Desktop above it; explicit Mobile and Classic persist with route/query/hash intact.
- [x] Initial Mobile avoids Desktop navigation payloads and optional page styles; resizing cannot leave hidden content or a Desktop router intercepting Mobile links.
- [x] Existing supported/unsupported rules, technical boundaries, SEO/search/Markdown, legal/privacy controls and Classic/Desktop behavior remain intact.
- [x] Required build, installer and relevant regression checks pass; browser evidence is saved. No publication occurs as part of implementation.

## Plan Self-Review

The homepage, service-detail transition, full route families, view selection, native navigation, content preservation, accessibility, performance and verification each map to a task above. Interfaces are defined where introduced; file paths and service/usage anchors were checked against current source. Implementation and local qualification are complete. See docs/superpowers/reports/2026-10-07-mobile-view-verification.md for evidence and test boundaries.

## Execution Notes

- Completed all six tasks in this chat. Consolidated the interdependent changes into one atomic mobile feature commit, with review at controller/layout checkpoints.
- Split existing Desktop controls and Mobile presentation into lazy modules and reused the mapped-script build helper to preserve the 45KB Desktop startup ceiling.
- Used native service disclosures to keep the information card and service strip within a useful phone screen; retained existing fragment targets.
- Added a numeric per-path session scroll cache because native Back did not consistently retain a nested horizontal scroll offset. This is scroll state only; no service/content selection store or telemetry was added.
- Preserved separately owned My Cloud/brand/quickstart work. Verification covered the combined checkout; that work is excluded from the mobile commit.
- Physical device/OS text-size testing and deployment are explicitly outside the verification evidence, rather than claimed as passed.
