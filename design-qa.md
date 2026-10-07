# Desktop homepage and center navigation QA

**Final result: passed**

Current scope: a persistent Desktop shell with center-only content navigation, full-height Home ending at its three personas, and parity with the static site's SEO/indexing. Earlier native-navigation evidence below is historical and superseded by the final persistent-navigation checkpoint. This is local verification; no deployment, push or PR occurred.

## Design and browser evidence

Reference images remain the supplied homepage `exec-426d00d7-e0e9-4bf2-88dc-838900ea5821.png` and catalog `exec-6f53bc6f-85cc-43a5-aa26-94e2cf521889.png`.
Previous matching source/implementation comparisons remain in `desktop-home-revision/`.
Current screenshots and check records are saved in:
`/Users/jsenjaliya/.codex/visualizations/2026/10/07/01a1145d-1f7a-7f50-9aae-ae81303cb7d2/desktop-centered-navigation/`.

Desktop screenshots use 1487×1058, matching the supplied references. `home.jpg`, `services.jpg` and `docs.jpg` show the fixed main window, shallow previous-page titles, bottom Classic control, .md action and updated icons. `classic-services.jpg` retains Classic appearance; `mobile.jpg` uses 390×844. Temporary viewport overrides were reset after verification.

## Requested changes

| Request | Result |
|---|---|
| Classic control only at bottom | Removed from top navigation; bottom switch preserves the current page and fragment |
| Content always centered | One real page at a stable center position; two prior-page previews remain visibly stacked behind it |
| Search stays Desktop | Result links use clean Desktop routes; both click and Enter use normal Desktop navigation |
| Markdown for all content | All 83 content pages have .md versions and window actions; the 404 error page is excluded |
| Copyable page URLs | Actual route/query/fragment in the address bar; reload and browser Back/Forward retain Desktop |
| Consistent desktop icons | Folder, robot, notebook and tag; retained Console demo, My cloud and Changelog assets |

History stores six validated URL/title/summary records per browser tab. The two visible background panels are title/summary previews, not running copies of old pages. Clicking a preview or bottom recent-page link loads that actual page.

Measured center bounds on Home, Services, Pricing and Docs at the reference viewport: x=163.56, y=83.20, width=1159.86, height=934.80 CSS pixels. The large center remains approximately 78% wide. Content scrolls inside this window; the bottom bar remains visible. Expanded reading mode restores to these same bounds.

## Findings resolved

- Removed independent iframes, dragging, resizing, embedded-page styling and obsolete framing bootstrap.
- Search previously lost Desktop mode. Shared URL formatting now also covers dynamically generated results and existing keyboard shortcuts.
- Minimized Docs failed to restore when Quickstart targeted a section on the same page. Fragment navigation and pageshow now restore it.
- Enter could open an old search result during debounce; older asynchronous results could also replace newer ones. Input changes immediately invalidate old links, and request versions guard rendering. A runnable regression covers both cases.
- Open tab now reflects the actual current URL, including section changes.
- Corrected conflicting icon tint rules that produced purple folders/tags; Services and Pricing now share blue tones.
- Preserved noindex on Markdown representations of the private/demo and brand utility pages.

## Browser qualification

Passed: top/bottom control placement; Home→Services→search navigation; identical main position; visible history stack and clickable previous title; recent-page Back; native browser Back/Forward; direct Docs/Quickstart fragment reload; minimize/restore; expand/restore; current Open tab fragment; Markdown action destination; search click and Enter; immediate Enter after query replacement staying on the current page; zero iframes; Classic switching and catalog filtering; mobile menu, normal reading and widening back into Desktop; no horizontal mobile overflow; no console errors in inspected states.

My cloud retains localhost:5380 and a native new-tab target. This verifies its destination; the visitor's local installation is not probed or started. The existing reduced-motion and no-JavaScript Classic fallback checks remain passing.

## Content and build qualification

- All 84 original HTML routes and normalized Classic main-content hashes match the frozen baseline; all canonical boundaries match.
- Strict verification against committed ../localcloud sources passed: 27 runtime services, CLI 0.1.8. Unrelated upstream working-tree changes were left untouched.
- Full build passed; Pagefind retains 81 indexed pages and 3,430 words.
- 99 presentation, routing, performance, structure, security/response and analytics checks passed.
- Seven local Worker runtime checks and 17 sitemap/asset-manifest checks passed.
- Required installer verification passed.
- Independent source/VM review confirmed both navigation/search fixes and found no remaining blockers.
- Initial HTML/style/script ceilings are unchanged. Maximum initial scripts: 16,752 bytes under the existing 17,000-byte ceiling.
- Deferred page CSS is 7,877 bytes, under the existing 9 KB ceiling. Shared view controller: 13,979 bytes. The existing hero remains 63,014 bytes.

All 83 Markdown twins use canonical content, excluding Desktop decoration. Curated agent files remain intact, and llms-full.txt still includes the existing 47 technical pages (245,564 bytes), under its unchanged budget.

## Security and publication boundary

The earlier iframe header proposal is superseded. This implementation does not frame pages and needs no framing exception. Production headers retain X-Frame-Options: DENY and frame-ancestors 'none'; local Worker checks enforce them. No security-header change or publication occurred.

## Better-ui polish follow-up (2026-10-07)

All five approved review findings are addressed in the existing deferred Desktop stylesheet. Classic and mobile presentation rules are unchanged.

| Finding | Implementation | Verification |
|---|---|---|
| Optical icon balance | Robot scales to 1.12; notebook to .96; both have a 2px optical vertical adjustment. The 56px layout slots and the Console, My cloud and Changelog assets are unchanged. | Rendered icon scale/alignment inspected at 1280×720. |
| Concentric command corners | Command surface 12px; inset Copy button 7px; existing 5px inset retained. | Computed radii match; Classic/mobile remain 12px/12px. |
| Selection distinct from hover | Selected shortcut uses soft blue, blue border/ink and semibold text; hover remains a neutral wash. | Services remains visibly selected while Pricing is hovered. |
| Primary hover/focus cue | Primary color changes from #005fff to #0054d8 on hover or focus-visible, with a 150ms transition outside reduced motion. | Browser hover and keyboard-focus state resolves to rgb(0,84,216). |
| Exact Copy icon easing | Desktop opacity, scale and filter use .3s cubic-bezier(0.2,0,0,1); reduced motion explicitly disables these transitions. | Emitted browser CSS rules contain the exact curve; reduced-motion computed transition is none and Copied! remains visible. |

Evidence: task visualization folder under better-ui-polish, including home.png, command.png, selection-hover.png and checks.json. Pointer hover was verified with a native context-menu dismissal that leaves the pointer over the target; focus was also visible in this state.

Full build, installer, strict upstream checks, all 95 regression checks, seven local Worker checks, and all 84 normalized Classic main hashes passed after this stylesheet change. No test budget was raised; the deferred stylesheet remains below 9 KB. No new runtime dependencies, content changes or publication.

**Not verified:** normal-motion playback and 10% Animations-panel replay. The controlled browser prefers reduced motion; the emitted normal-motion CSS was inspected instead. No HIGH UI-polish findings remain in the inspected states.

## Approved first homepage option (2026-10-07)

Source visual truth: `/Users/jsenjaliya/.codex/generated_images/01a1145d-1f7a-7f50-9aae-ae81303cb7d2/exec-0110cc78-62c4-480c-8a52-ec8d27d9c61e.png` (first displayed option, explicitly approved). The user explicitly replaces the generated persona icons with the current website icons.

Implementation: `approved-home/home-1280.png` under the task visualization folder. Source pixels are 1672×941, normalized to 1280×720 for comparison; implementation pixels and CSS viewport are 1280×720 (no further density scaling). Full comparison: `approved-home/full-comparison.png`, source left and implementation right. Focused comparisons: install-comparison.png and personas-comparison.png. Both inputs were opened together in each comparison.

State: Home, collapsed center window, no search dialog, no copied feedback, reduced motion. Actual browsing history shows two background titles; the generated concept omits those previews. Frame geometry intentionally retains the existing fixed center position to keep every route aligned. The current real desk asset keeps its complete 3:1 composition and scales down at short viewport heights rather than stretching/cropping to the generated concept's wider composition.

### Comparison history

- **First pass blocked, P2:** persona descriptions fell below the 1280×720 pane. first-pass.png showed the summary heading at the bottom and the articles outside the visible area (article bottoms 739.46; pane bottom 678.99).
- **Fix:** removed the count sentence and standalone Desktop Start free action; tightened heading/subheading/install/summary spacing; restored readable left alignment and 16px install text; scaled the unchanged illustration with viewport height; kept the three existing icons and all Classic markup/copy.
- **Final comparison:** home-1280.png and the full/focused comparison images show all persona copy. Hero bottom is 676.63, pane bottom 678.99; each persona article bottom is 666.23. At 1024×720 all article bottoms are 674.84 within pane bottom 678.99 (bottom padding continues below the fold). At 1024×768 the full section fits. No horizontal pane overflow.

### Required fidelity surfaces

| Surface | Result |
|---|---|
| Fonts/typography | Existing local Roboto variable family retained; two-line heavy headline, blue second line, muted intro, mono install text, and smaller persona text match the approved hierarchy. All copy remains readable and untruncated. |
| Spacing/layout | Centered copy and install shelf, left label/right Explore link, proof beneath, desk art, divided three-column personas. Existing frame position reserves space for history. Illustration scale adapts to fit the explicit first-screen requirement. |
| Colors/tokens | Warm ivory hero/greige chrome, white Copy surface, blue links and headline, soft muted background remain consistent. Existing persona icon colors are intentionally retained. |
| Assets/image quality | Same original WebP hero, folder/robot/book/tag shortcuts, terminal/My cloud/document assets. Persona assets are real-sdks.svg, ci-pipeline.svg and instant-iteration.svg exactly as requested. No new generated assets, dependencies, stretched imagery or custom drawings. Browser evidence has capture softness affecting all UI; original asset files are unchanged. |
| Copy/content | Exact requested OSS proof, with OSS terms linking to the ongoing policy; accurate existing install command. Removed the Desktop count sentence and primary Start free button only. Canonical Classic content remains identical for all 84 routes. |

### Current browser and automated qualification

Passed in the browser: Copy feedback and exact clipboard command (previous clipboard restored); minimize/restore; expand/restore; close-only-page without reload; close to previous route; service link; search click and Enter to clean BigQuery URL; reload of that route; Classic search and navigation retaining view=classic; switch back to clean Desktop; native Back/Forward across modes; OSS policy fragment and current Open tab URL; mobile menu; narrow/wide presentation; existing mobile hero and no 390px overflow. No console errors/warnings in inspected states. History remains two bounded previews and there are zero iframes.

Build, installer, strict committed ../localcloud verification, all 97 regressions and seven local Worker runtime checks passed. Preservation hashes/canonicals/maxima are in approved-home/preservation.json; browser geometry and icon paths are in approved-home/browser-checks.json. HTML/script/style budgets were not raised.

The stylesheet starts downloading alongside the controller, and controls bind before its load resolves. A runnable pending-stylesheet check covers that branch, closing without a prior page and safe style-failure fallback. Cross-page navigation remains native; no numeric interaction-latency benchmark is claimed.

**Findings:** no actionable P0/P1/P2 findings remain. Intentional constraints are the retained center frame/history space, uncropped existing art scaled for short screens, and the user-requested existing persona icons.

**Open questions:** none required for this approved scope.

**Implementation checklist:** approved layout, persona visibility, icons, URL behavior, OSS copy, control binding, preservation and required checks complete.

**Follow-up polish:** normal-motion playback remains unverified in this reduced-motion browser, as recorded above.

**final result: passed**

## Full-height layout and speed follow-up (2026-10-07)

Source feedback: `/Users/jsenjaliya/Desktop/screenshots/Screenshot 2026-10-07 at 11.32.10 AM.png`, showing the large unused grey area beneath the personas. The user wants the page to end there and distribute content through the window as it resizes.

Current browser evidence is in the task visualization folder under `navigation-speed/`. `home-1651x998.png` approximates the supplied Chrome screenshot's page viewport after excluding browser chrome; `home-1280x720.png` is the compact laptop view. The screenshot was supplied at 3302×2098 including Chrome UI; the controlled browser captures CSS pixels without browser chrome. The source is a before-state, so comparison evaluates the requested removal of blank space and retention of alignment, rather than exact positional cloning.

Full comparison opened together: `space-before-after.png`, source left and implementation right. The source crop excludes the first 106px of browser chrome and normalizes to the 1651×998 comparison viewport; the small crop/density uncertainty does not affect the observed blank-area correction. History titles differ because the captures represent different browsing sequences.

**Earlier P2 finding:** the compact hero had fixed artwork caps and ended above the bottom of taller content panes. At 1280×720 it also still had 8,185px of older content reachable below the personas.

**Fix:** Desktop Home now hides its older lower sections and footer, while Classic/mobile retain them. Main, shell and hero fill the pane height; the uncropped image fills remaining flex space with object-fit:contain; the summary cannot shrink and stays last at the bottom. Larger views receive larger imagery and bounded persona typography/padding. Removed the now-unneeded Home service-filter bootstrap and obsolete Desktop Home catalog rules. The existing three persona icon files are unchanged.

| Real browser CSS viewport | Pane/hero/summary bottom | Persona article bottoms | Pane scrollHeight/clientHeight |
|---|---:|---:|---:|
| 1024×720 | 678.99 | 664.59 | 555 / 555 |
| 1280×720 | 678.99 | 664.59 | 555 / 555 |
| 1440×900 | 858.99 | 840.99 | 735 / 735 |
| 1651×998 | 956.99 | 937.04 | 833 / 833 |
| 1920×1080 | 1038.99 | 1017.40 | 915 / 915 |

No horizontal overflow, cropped illustration, hidden persona descriptions, extra scrollbar or blank region below the row remains at these sizes. Native UI viewport changes, clicks and screenshots were used, not mock images. `resize-checks.json` contains geometry. Reduced-motion captures show the same foreground layout.

### Startup and navigation

- Controls still bind before the optional stylesheet resolves, and closing the only document hides its window immediately.
- Close/Back uses native history only for a matching referring Desktop page without a current fragment, avoiding Classic or ambiguous history entries. Native Forward after Close returned to Services, confirming traversal. The controlled in-app browser did not preserve the prior expanded flag, so restoration of a cached document is not claimed as verified here.
- Pointer/keyboard-focus warming is capped at three documents and eight same-origin immutable build assets each; fragments are deduplicated. Redirects, external/credentialed/encoded/raw/API paths are rejected, offline failures are swallowed, and prefetched scripts are never inserted or executed. Save-Data and 2G skip warming.
- Wallpaper motion uses transform with overscan; the background-position paint loop is removed. Reduced motion remains disabled by CSS. No extra animation engine or new dependency.
- Native page routing and existing CSP remain. Astro's official configuration reference states ClientRouter is unsupported with security.csp: https://docs.astro.build/en/reference/configuration-reference/#securitycsp . No security exception was introduced.

Warm local tool-driven samples (click/reload until visible heading/ready plus AX confirmation): Home→Services 394ms before / 393ms after; Close 448ms before / 248ms after; current reload sample 652ms. These include automation overhead, are single samples and do not establish a general speedup or LCP/INP/CLS. Forward navigation still performs page loads. Throttled Lighthouse/field CWV and normal-motion compositor profiling were not available in this browser surface and are not claimed as passed.

Current checks: full build, installer, strict committed upstream verification, 116 regressions/SEO asset guards plus seven Worker checks (123 total), and all 84 canonical/Classic content hashes passed. Search click/Enter, mode switching and native return/Forward passed in the real UI with no console errors. Current maxima/assets are in `navigation-speed/preservation.json`; initial budgets were not raised.

## Final persistent-navigation and SEO checkpoint

This supersedes the native-routing checkpoint above. Desktop now replaces only the center markup, retaining toolbar, wallpaper, icons, search and window controls. Content is generated from the existing static page tree. Classic/mobile keep normal document navigation and the complete original presentation.

- Real Service → AI Agents → Docs navigation retains shell/control AX identities. Search Enter opens BigQuery in Desktop, closes the modal, and updates canonical, Markdown alternate, title and JSON-LD.
- Docs tabs, copy (exact install command; clipboard restored), code enhancement, feedback panel and console animation work after revisiting. Minimize/restore, expand/restore and Close pass.
- Browser Back restores the actual reading position of a hash page (1405 → 1405). Independent Chrome review passes rapid navigation, current-page initialization completion and keyboard Skip to content. Ordinary anchors do not emit another pageview.
- All 84 static routes/canonicals and 83 Markdown twins remain, along with sitemap, Pagefind, robots boundaries, social metadata, JSON-LD, Markdown content negotiation and 47-page technical corpus. Internal routing assets are noindex.
- Content-addressed payloads/styles/scripts reuse immutable caching and previous-release asset carry. Six-entry content cache; three hover/focus warm-ups; Save-Data/2G skip warming. Desktop removes unused full-document speculation rules; Classic retains them. CSP/SRI/framing protections remain.
- Final build, installer, strict upstream verification, 122 regression/asset/SEO checks and seven local Worker checks pass (129 checks). Existing initial-page ceilings and dependencies remain unchanged.
- New committed runtime docs required the snapshot refresh to 8da58755226d and five identity-related service summaries. Unrelated dirty CLI sources were excluded. Of the original normalized main captures, 72 remain identical; 12 differences are the documented workflows, related catalog counts and review dates. No route or section was removed.
- The five Desktop sizes from 1024×720 through 1920×1080 retain all three personas, fill the pane, and have no overflow. Mobile menu and 390px reading also pass. Console errors/warnings: none observed.

Evidence: navigation-speed/persistent-home.png, persistent-resize-checks.json and persistent-preservation.json. The preservation report records final architecture and validation. No numerical production latency, field CWV, deployment or indexing result is claimed.

**Required surfaces:** original Roboto hierarchy retained; full-pane flex rhythm and bottom alignment checked; original warm/blue palette retained; same uncropped WebP and persona assets; approved install/OSS wording and all original Classic content preserved.

**Findings:** no actionable P0/P1/P2 layout or functional findings remain in tested states. The performance qualification limits above remain explicit.

**final result: passed**
