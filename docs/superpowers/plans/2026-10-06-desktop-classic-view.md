# Desktop and Classic Site Implementation Plan

> Steps use checkbox (- [x]) syntax so an executor can track progress task by task.

**Goal:** Deliver the approved desktop presentation while retaining the complete current LocalCloud website as a switchable Classic view.

**Final checkpoint (2026-10-07):** Persistent Desktop navigation supersedes the native document-loading checkpoint below. Only the center content changes; sidebar icons, toolbar, wallpaper, search and controls remain mounted. All existing static routes and SEO remain. See design-qa.md and the preservation report for final evidence.

**Architecture:** Add a shared shell around the existing BaseLayout slot; do not fork the route tree or page content. Scope new styles to Desktop, keep Classic as the no-JavaScript fallback, and navigate between actual pages in one centered window. Read product facts from the existing contract synchronized with committed ../localcloud docs.

**Tech Stack:** Astro 7, MDX 8, Vite 8, Tailwind CSS 4, existing Roboto fonts/assets, native URLs/browser history, CSS history previews, node:test and existing build verifiers. Node >=24.21.0 and pnpm >=12.9.1.

**Spec:** ../specs/2026-10-06-desktop-classic-view-design.md

## Global Constraints

- Preserve every existing page, URL, anchor, content section, canonical, search entry, and Markdown twin.
- One content source and route tree; no copies of all pages or replacement of upstream facts with mockup copy.
- Classic is always selectable and remains the fallback without JavaScript.
- My cloud opens http://localhost:5380 in a new browser tab; never check or start the visitor's runtime.
- No README shortcut, no redundant Supported badges, no Partial support labels.
- Preserve Classic assets and the lightweight background. The 2026-10-07 correction explicitly requests the supplied desk hero for Desktop; use a separate asset and standard licensed desktop icons.
- Keep unrelated ../localcloud working-tree edits unchanged.
- Do not deploy, push, or open a PR. Use branch codex/desktop-classic-view.
- The required full build and installer checks must pass. Do not relax content, CSP, privacy, or route-preservation checks to make the new layout pass.

---

## Files and responsibilities

| File | Responsibility |
|---|---|
| src/components/DesktopShell.astro | Shared toolbar, shortcuts, main content window, taskbar and Classic switch; original page content stays in its slot. |
| src/styles/desktop.css | Scoped Desktop surfaces/layout and narrow-screen/embedded behavior, inlined within the existing stylesheet budget. |
| src/styles/desktop-pages.css | Additional Desktop-only page refinements, requested after Desktop is selected on a wide screen; Classic/mobile keep their existing immediate inline styles. |
| src/scripts/keyboard-shortcuts.mjs | Existing help/guide navigation, deferred until keyboard use to preserve initial script budgets. |
| src/components/Footer.astro | Refresh the analytics label when a same-origin window changes the choice. |
| src/scripts/desktop-view.mjs | Validated preference/URL helpers and small window controller; no framework or custom rendering engine. |
| src/layouts/BaseLayout.astro | Load the shell and initial preference without changing metadata, canonical generation, search or content slot. |
| src/components/HomepageVariationFieldManual.astro | Desktop-only approved headline/action presentation while preserving the original Classic markup and every later section. |
| scripts/verify-desktop-view.test.mjs | Preference/URL/bounds behavior and built-route preservation contracts. |
| scripts/fixtures/classic-site-routes.json | Pre-change built route inventory, captured before presentation edits. |
| docs/superpowers/reports/2026-10-07-desktop-classic-preservation.md | Full-site preservation comparison and check results. |
| design-qa.md | Browser comparison evidence, interaction results and final visual gate. |

### Task 1: Freeze current site and committed content inputs

**Files:** Existing synchronization/build scripts; create scripts/fixtures/classic-site-routes.json and the preservation report.

**Interfaces:** The baseline produces the sorted relative HTML route list and a temporary normalized main-content capture for every page. Later tasks may add view controls but must preserve these routes and Classic content.

- [x] Inspect shared layouts, existing route families, SEO/CSP/search/analytics behavior, installed assets and package versions.
- [x] Check ../localcloud status without editing it.
- [x] Run synchronization and strict committed-source verification:
~~~sh
node scripts/sync-upstream-docs.mjs
UPSTREAM_DOCS_STRICT=1 node scripts/verify-upstream-docs.mjs
~~~
Expected: 27 runtime services, CLI 0.1.8, no uncommitted source warnings.
- [x] Run the unmodified full build using pnpm 12.9.1:
~~~sh
pnpm run build
~~~
Expected: all existing stages pass and emit the current route tree.
- [x] Capture every dist HTML route and normalized main content before code changes. The baseline has 84 HTML pages; full normalized content is captured at /private/tmp/localcloud-classic-baseline.json.
- [x] Capture pre-change Classic screenshots for home, catalog, BigQuery, docs, compatibility, pricing and blog. Verify original mobile navigation afterward; a pre-change mobile screenshot was not captured.
- [x] Keep the original main, head and body semantics as the preservation boundary.

### Task 2: View preference and URL trust boundary

**Files:** Create src/scripts/desktop-view.mjs and scripts/verify-desktop-view.test.mjs.

**Interfaces:**
~~~js
pickView({ override }) // => 'classic' only for an explicit Classic URL; otherwise 'desktop'
pageWindowURL(href, origin, basePath = '/') // => same-origin HTML URL or null
desktopPageURL(href, origin, basePath = '/') // => validated HTML URL without the view parameter
readPageHistory(raw, current, origin, basePath = '/') // => validated, bounded previous-page metadata
initDesktop() // => Promise<void>; loads Desktop-only refinements and binds the rendered shell once
~~~

- [x] Write behavior checks before the controller:
~~~js
assert.equal(pickView({ override: 'classic', saved: 'desktop' }), 'classic');
assert.equal(pickView({ saved: 'classic' }), 'desktop');
assert.equal(pageWindowURL('javascript:alert(1)', 'https://local.cloud'), null);
assert.equal(pageWindowURL('http://localhost:5380', 'https://local.cloud'), null);
assert.equal(pageWindowURL('/llms.txt', 'https://local.cloud'), null);
assert.equal(new URL(pageWindowURL('/docs/#install-the-cli', 'https://local.cloud')).hash, '#install-the-cli');
assert.equal(new URL(desktopPageURL('/docs/#install-the-cli', 'https://local.cloud')).searchParams.get('view'), null);
~~~
- [x] Run node --test scripts/verify-desktop-view.test.mjs. Final behavior/startup tests pass; an initial missing-helper red run was not retained.
- [x] Implement validation with URL, exact view values, bounded history and try/catch around storage access.
- [x] Only an explicit Classic parameter selects Classic. Clean URLs always select Desktop; malformed query values never become CSS attributes or navigation targets. Classic links carry their explicit mode, including dynamic search results.
- [x] Keep modifier-clicks, downloads, external targets and raw agent/document routes native.
- [x] Rerun the focused tests; all branches above must pass.

### Task 3: Shared shell without replacing Classic

**Files:** Create DesktopShell.astro and desktop.css; modify BaseLayout.astro only at imports, initial preference and body slot wrapper.

**Interfaces:** Render data-desktop-shell, data-desktop-window, data-desktop-content, data-desktop-shortcut, data-window-action and data-view-choice hooks. Put data-pagefind-ignore only on chrome, not the original content.

- [x] Preserve the full existing slot, Header/Footer rendering, SearchModal and script placement.
- [x] Add a validated pre-paint preference bootstrap; default static HTML remains Classic.
- [x] Expose Classic and Desktop choices as real links using the current route. Enhance them to retain fragments and other query values.
- [x] Render Home/Explore/Help/search/Get started and all approved shortcuts with real destinations.
- [x] Use public/brand/localcloud-app-icon.svg for the solid My cloud icon and existing icons for the other shortcuts.
- [x] Set My cloud to href=http://localhost:5380, target=_blank and rel=noopener noreferrer.
- [x] Implement Classic display:contents wrappers and hidden chrome so existing CSS and page geometry stay intact.
- [x] Inline the scoped stylesheet within the existing 94,600-byte style ceiling; keep small bootstrap code and separately check the controller asset budget. The baseline maximum is 89,860 inline style bytes. Existing checks explicitly forbid linked stylesheets, so no blocking external CSS is introduced.
- [x] On narrow screens retain the original responsive header, full page scrolling, documentation menu and footer.
- [x] Build and check one H1/canonical and unchanged current-route destinations.

### Task 4: Desktop page surfaces and approved homepage

**Files:** desktop.css; HomepageVariationFieldManual.astro.

**Interfaces:** New presentation is selected by html[data-site-view=desktop]. Desktop-only additions carry data-desktop-copy so preservation comparisons can exclude them.

- [x] Set Desktop window #e7e5dd and foreground surfaces #ffffff; retain current font families and brand blue.
- [x] Keep the center near 78% at the reference viewport, with readable icon columns and an expanded reading state.
- [x] Scope all padding, header visibility, panel color, grids, tables and sticky-sidebar changes to Desktop pages.
- [x] Restyle the existing catalog groups and cards; keep every guide and current filtering behavior.
- [x] Restyle existing connection/example panels and compatibility table; do not replace their data or sections.
- [x] Restyle docs and blogs for comfortable reading without losing their navigation, feedback, examples or footer.
- [x] Add approved Desktop headline 'Your cloud. On your computer.' in the existing single H1, retaining the original Classic spans. Keep the upstream-derived definition, counts, install command and all lower content.
- [x] Retain Classic action links; add Desktop-only Start free and Explore the services presentation without removing existing destinations.
- [x] Keep the original hero in Classic; use the supplied desk/laptop direction as a separate Desktop asset, as requested in the 2026-10-07 correction.
- [x] Use the selected ready-made background or the predefined CSS Gradient Animator fallback; stop decoration for reduced motion and do not animate content boxes.
- [x] Compare Classic main-content captures across all built pages; investigate every difference instead of updating away the preservation boundary.

### Task 5: Fixed center and native page navigation (revised 2026-10-07)

**Files:** desktop-view.mjs; DesktopShell.astro; desktop.css.

**Interfaces:** `data-desktop-history` holds two shallow page previews; `data-desktop-tasks` holds recent links. `lc:navigate` routes keyboard shortcuts through the same validated navigation path. Session storage contains only six URL/title/summary records.

- [x] Remove independent iframes, drag/resize handling and obsolete embedded-page styles/bootstrap.
- [x] Keep one main window at the same coordinates on Home, catalog, guides and docs; navigate with real `location.assign` URLs.
- [x] Retain actual route metadata, native Back/Forward and directly copyable/reloadable clean Desktop URLs including fragments; Classic alone uses ?view=classic.
- [x] Validate and bound prior-page metadata; use textContent for previews and real links for restore.
- [x] Keep two prior title bars visible behind the center window, with six recent links and Back in the bottom bar.
- [x] Move Classic exclusively to the bottom bar; retain view switching on the current route/fragment.
- [x] Route search clicks, Enter and keyboard guide shortcuts through Desktop links. Clear stale results immediately and reject outdated async responses.
- [x] Restore minimized pages on same-route section links and browser history restoration. Keep expand/restore and Open tab actions accessible.
- [x] Keep the existing site-wide DENY/none framing protections unchanged.
- [x] Generate 83 Markdown twins from canonical content; expose `.md` in each content window and extend Worker Accept negotiation without changing the 47-page technical bundle or curated agent resources.
- [x] Match Services/AI/Docs/Pricing desktop icon style; keep Console demo, My cloud and Changelog icons.

### Task 6: Route, content and product verification

**Files:** verify-desktop-view.test.mjs; preservation report; existing build scripts.

- [x] Assert every baseline HTML route is emitted, has its current canonical and a usable main content region.
- [x] Record full-site normalized Classic content equality; Desktop-only presentation text is the only intentional extra.
- [x] Run strict upstream verification again:
~~~sh
UPSTREAM_DOCS_STRICT=1 node scripts/verify-upstream-docs.mjs
~~~
- [x] Regenerate and check distributed docs through the existing workflow:
~~~sh
node scripts/generate-distributed-docs.mjs
node scripts/verify-distributed-docs.mjs
~~~
- [x] Run required automated checks:
~~~sh
node --test scripts/verify-desktop-view.test.mjs
pnpm run test:dependencies
pnpm run build
pnpm run test:installer
pnpm run test:performance
pnpm run test:analytics
git diff --check
~~~
- [x] Measure any added controller/style assets explicitly; keep Classic/mobile initialization lightweight and do not weaken existing product or CSP checks.

### Task 7: Browser and visual qualification

**Files:** design-qa.md; local browser screenshot evidence.

- [x] Start the existing Astro preview and open it through Codex in-app Browser.
- [x] Compare source targets and rendered screenshots at matching viewport/state in combined comparison images.
- [x] Verify Classic on every representative page family and narrow screens against the pre-change captures.
- [x] Verify Desktop home, catalog, service guide, docs, compatibility, pricing, blog and 404; check all content remains reachable.
- [x] Exercise saved mode, explicit override, reload, route/fragment preservation, search, successful/failed copy, catalog filtering, mobile menu and reduced motion.
- [x] Navigate through three pages; verify identical center bounds, two history previews, recent links, native Back/Forward, minimize/restore and expand/restore.
- [x] Inspect browser console errors and failed local assets; correct broken UI or CSP behavior.
- [x] Record font, spacing, color, asset and content comparisons. Fix actionable P0/P1/P2 findings and recapture.
- [x] Verify real local Worker responses, including Markdown negotiation and unchanged framing protections. The superseded iframe design no longer requires a header exception.
- [x] Set design-qa.md final result: passed for local implementation and verification.

### Task 8: Close the implementation checkpoint

- [x] Refresh the graph:
~~~sh
graft build
~~~
- [x] Review the full diff and plan checklist; record test counts, route/content preservation and any remaining bounded polish.
- [x] Provide the local preview and plan/report links for review.
- [x] Keep the branch local; no deployment, push or PR.

## Plan self-review

## 2026-10-07 homepage reference correction

- [x] Add Desktop-only desk art; preserve the old Classic hero and all 84 content captures.
- [x] Match eyebrow, headline, actions, command, preview copy and three audience columns.
- [x] Reuse the atlas as searchable compact cards/category links; derive counts/ports from committed docs.
- [x] Share one native filter/bootstrap; verify empty/reset, Classic and mobile narrowing behavior.
- [x] Use small licensed icons; retain lightweight wallpaper and My cloud target.
- [x] Compare source/implementation at 1487×1058; pass the scoped visual gate.
- [x] Pass full build, strict docs, 90 regression checks, installer and seven Worker checks; refresh graft.
- [x] Supersede the earlier iframe proposal with normal page navigation; no security-header changes or publication.

The tasks cover Classic preservation, selected visual targets, all route families, committed upstream truth, both layouts, fixed-center history navigation, Markdown access, mobile/accessibility and build/visual gates. There is no page-copy migration or custom background engine. Execution remains local; deployment is outside this checkpoint.

## 2026-10-07 full-height Home and navigation follow-up

The native-navigation optimization below is historical; final center-only navigation follows it.

- [x] Make Desktop Home end at its three personas; keep the full canonical homepage in Classic/mobile.
- [x] Fill the pane height with a flex layout, uncropped adaptive illustration, and bottom-aligned persona row. Retain the existing icons and alignments.
- [x] Test real browser UI at 1024×720, 1280×720, 1440×900, 1651×998 and 1920×1080; no blank region, cropped persona text, extra scrollbar or horizontal overflow.
- [x] Remove the unused Home filter bootstrap and obsolete Desktop Home catalog CSS.
- [x] Preserve early control binding; use native history for unambiguous referring-document returns, with safe fragment/Classic fallbacks.
- [x] Add bounded hover/focus resource warming without HTML/script execution or analytics; skip constrained connections and validate all URLs.
- [x] Change wallpaper motion to transform, retaining palette, overscan and reduced motion.
- [x] Pass required build/installer, 116 regressions/asset guards, seven Worker checks and strict upstream verification; recheck 84 original hashes/canonicals.
- [x] Keep performance evidence local and bounded: tool-driven samples include automation overhead; no throttled CWV or cached-document restoration claim. Ordinary links retain native page navigation and CSP.

## Final persistent shell and SEO checkpoint

- [x] Generate center content from all 84 retained static pages after CSP finalization.
- [x] Replace only the center pane; preserve chrome/icons/search/control identities.
- [x] Retain real URLs, Back/Forward reading positions, hash focus and copied links.
- [x] Initialize content widgets after swaps; cover cancellation and rapid anchors with runnable checks and independent Chrome review.
- [x] Preserve static SEO and update canonical, social/article metadata, JSON-LD and Markdown discovery during navigation.
- [x] Reuse immutable asset caching/carry, bound warming/cache, and retain CSP/SRI/framing protections.
- [x] Sync committed runtime docs; exclude unrelated dirty CLI sources and update five identity service summaries.
- [x] Pass full build, installer, strict upstream check, 129 regression/Worker checks and graft refresh.
- [x] Verify five Desktop sizes, Classic/mobile, search, Docs controls and window actions in the browser; save persistent-home.png.

Final evidence: design-qa.md and docs/superpowers/reports/2026-10-07-desktop-classic-preservation.md. No commit, push, PR or deployment.
