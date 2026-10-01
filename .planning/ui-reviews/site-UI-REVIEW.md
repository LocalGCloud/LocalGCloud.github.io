# Site — UI Review

**Audited:** 2026-09-30
**Baseline:** DESIGN.md (design contract) + abstract 6-pillar standards where DESIGN.md is silent
**Screenshots:** captured with puppeteer-core and Chrome, 16 routes at 1440x900, 375x812, and desktop full page. Saved to `.planning/ui-reviews/site-20260930-235643/`
**Dark mode:** none. `global.css:41` sets `color-scheme: light` and there are no `prefers-color-scheme` or `[data-theme]` rules, so there is no theme parity to test. This matches DESIGN.md ("daylight workbench").
**Note:** the dark pill at the bottom center of every screenshot is the Astro dev toolbar. It is not a site defect.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | "partial" and "Coming soon" (a third status) appear in UI. A typo shows in the homepage quick start |
| 2. Visuals | 2/4 | Homepage hero stat labels collide on mobile. The 404 paragraph is off axis. Four stacked CTAs on /gcp-emulator mobile |
| 3. Color | 2/4 | Primary buttons and the header CTA use gradients, which the flat spec does not allow. Display blue is used as decoration on /pricing. Green signals a 404. The green token differs from the contract |
| 4. Typography | 2/4 | 61 distinct font-size values, 5 weights, and 6 places below the 0.75rem legibility floor |
| 5. Spacing / Layout | 2/4 | 4 routes scroll horizontally at 375px. 24 border-radius values are off the contract scale |
| 6. Experience Design | 3/4 | Global focus-visible and reduced-motion support exist. About 37 to 93 interactive targets per page are under 24px tall |

**Overall: 13/24**

---

## Top 3 Priority Fixes

1. **BLOCKER: page-level horizontal scroll on mobile.** At 375px, `scrollWidth` is 620 on /gcp-emulator, 556 on /docs/configuration/, 514 on /agents/, and 386 on /docs/. This breaks the DESIGN.md rule "keep the page viewport fixed". Sources: `src/pages/gcp-emulator.astro:306` (a `<pre>` with no overflow container), Shiki `span.line` code blocks in the docs, and `src/components/AgenticContentPage.astro:125/197/212` (`site-panel p-6` articles with unbreakable content). Fix: add `pre { max-width:100%; overflow-x:auto }` globally, and add `min-width:0` to grid and flex children of `.site-panel`.
2. **BLOCKER: copy violates the two-category rule.** `src/pages/local-cloud-development.astro:175` says "Terraform support is partial". `src/pages/ai/index.astro:241-242` renders a raw `service.status` inside a chip, so "partial" or "release-unverified" can reach the page, and it adds a success "supported" chip to every supported row, which is a redundant badge. "Coming soon" appears at `compatibility.astro:49`, `HomepageVariationFieldManual.astro:141`, and `agenticMarkdown.ts:18`. Fix: map status to Supported/Unsupported only, drop the chip for supported rows, and reword the Terraform line positively ("Terraform works for the documented resources").
3. **WARNING: the homepage hero stat labels collide on mobile.** At 375px, "DOCUMENTED INTEGRATIONS" runs into the "1" of the second stat, and "DATA-VOLUME RUNTIME" spills past its column (screenshot home-m.png). Cause: `HomepageVariationFieldManual.astro:403-404` uses `letter-spacing` together with `white-space: nowrap` inside a 2-column grid (line 375). Fix: remove `nowrap` below 40rem, or stack the stats into one column (`grid-template-columns: 1fr`) under 30rem.

Additional priority fixes:
4. **WARNING: gradient primary buttons.** `global.css:532` (`.site-button--primary`), `:357` (header CTA), and `:1839` (feedback FAB) use `linear-gradient(135deg, …)` plus a blue glow shadow (`:534`). DESIGN.md says "Workbench Blue with white text" and "flat by default". Fix: `background: var(--accent)`, hover `var(--accent-strong)`, and remove the colored shadow.
5. **WARNING: header CTA radius.** The header "Docs" CTA is `border-radius: 999px` (`global.css:355`), while every other button uses 0.75rem (`:517`). Fix: use 0.75rem so the button shape stays consistent.
6. **WARNING: 404 copy misaligned.** On the 404 page the lede paragraph renders off center, starting left of the headline (nf-d.png). It is `src/pages/404.astro:23`. Fix: add `text-center` to the `<p>` (or `text-wrap: balance`) and check for any inherited `margin-left` from `.site-section--hero p`.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)
- **BLOCKER** `src/pages/local-cloud-development.astro:175`: "Terraform support is partial and resource-specific". Rewrite with positive framing.
- **BLOCKER** `src/pages/ai/index.astro:241-242`: the status chip prints the raw status enum and colors every supported row green. Remove the chip for supported rows and map everything else to "Unsupported".
- **WARNING** "Coming soon" creates a third category: `src/pages/compatibility.astro:49`, `src/components/HomepageVariationFieldManual.astro:141`, `src/data/agenticMarkdown.ts:18`. Also `compatibility.astro:70` has a "Supported" kicker panel, which is a redundant badge.
- **WARNING** Docs prose uses "partial": `docs/seed-data.mdx:9`, `docs/spanner-emulator-features.mdx:17`, `docs/localcloud-vs-google-emulators.mdx:31`, and `docs/bigquery-coverage-gaps.mdx:28,38,40` (a "Partial" table column and heading). If the coverage matrix must keep its own vocabulary, label it as an evidence classification rather than a product support state.
- **WARNING** `src/components/InstallationMethods.astro:19`: "Requires docker ." has a stray space and lowercase "docker". Fix: "Requires Docker."
- **WARNING** `src/components/Footer.astro:12`: "runs most Google cloud services" uses hedging plus lowercase "cloud". Fix: "One container runs 25 Google Cloud services locally."
- **WARNING** /gcp-emulator shows "25 documented local integrations" in the hero and "View all 27 service guides" (`gcp-emulator.astro:93`) right next to each other. These conflicting counts hurt credibility.
- **NIT** `src/data/blogPresentation.ts:7`: the Dataproc post is dated `2026-10-01`, which is tomorrow, so the page shows "Published Oct 1, 2026". That is a future date.
- Good: CTAs are specific ("Open the Quick Start", "Back to Home", "View on Docker Hub"). No "Submit" or "Click here".

### Pillar 2: Visuals (2/4)
- **WARNING** Hero stat collision on mobile (see Fix 3).
- **WARNING** The 404 lede is off axis (Fix 6). The "NOT FOUND" eyebrow uses the green pulse dot, which signals success on an error page.
- **WARNING** /gcp-emulator on mobile stacks 1 primary and 3 secondary full-width-ish buttons with mixed widths (gcp-m.png). This breaks "one promise, one next action". Fix: keep the primary button plus one text link and move the comparisons below the fold.
- **WARNING** On /pricing desktop, the hero gives about 45% of the viewport to a three-line display headline with the supporting copy pushed to the far right column at x≈1000. This leaves a large empty center (pricing-d.png).
- **NIT** In the desktop homepage hero, the CTAs (`Open the Quick Start`) are indented relative to the headline's left edge, and "In-a-Box." is deliberately staggered. This makes the left alignment edges inconsistent.
- Good: the header, docs sidebar, and docs article have a clear hierarchy, and the header search shows a visible ⌘K hint.

### Pillar 3: Color (2/4)
Token parity with DESIGN.md (`global.css:3-41`):
| Token | DESIGN.md | global.css | Status |
|---|---|---|---|
| accent-blue / strong | #1a73e8 / #1557b0 | same | OK |
| brand-green | **#188038** | **#137333** (`:19`) | Mismatch. `--success-soft` (`:27`) still uses rgba(24,128,56) = #188038 |
| canvas | **#ffffff** | `--bg: #f8f9fa` (`:4`) | Page canvas is the inset gray, not white. The contract's 60% neutral is off |
| ink / secondary / tertiary / border / inset | match | match | OK |
| warn | (yellow #fbbc04 for caution) | `#866439` brown (`:28`) | Undeclared in contract |
- **WARNING** Gradients on the primary button, header CTA, and FAB (`:357, :532, :1839`) plus a blue glow (`:534`). Fix as in item 4.
- **WARNING** /pricing sets "during public preview." in display-size accent blue. That is blue used as ambient decoration, which violates the One Blue Voice rule. Fix: use `color: var(--text)`.
- **WARNING** Green as a decorative marker: the eyebrow pulse dots on /404, /gcp-emulator, and blog posts (`site-eyebrow__pulse`). Per the Semantic Status rule, use `--brand-sky` or remove them.
- **WARNING** Hard-coded colors outside the tokens: `ImmersiveIDE.astro` (76), `HomepageVariationFieldManual.astro` (19), `brand/icons.astro` (9), `gcp-emulator.astro` (6), `InstallationMethods.astro` (6), and 1–3 each in `404.astro`, `BaseLayout.astro`, `PricingWorkbench.astro`, `Header.astro`, and three SEO pages. The `#ffffff` at `global.css:533` should be `var(--surface)`.
- 60/30/10: the neutral canvas dominates and blue stays limited to links, the header CTA, primary buttons, kickers, and inline code. In the docs, blue appears on every inline `code` chip as well as the kickers and active nav. That is heavy but tolerable.

### Pillar 4: Typography (2/4)
- **WARNING** 61 distinct `font-size` declarations. Near-duplicates include 0.8rem / 0.8125rem / 0.82rem / 0.84rem / 0.86rem / 0.875rem / 0.88rem / 0.9rem / 0.92rem / 0.93rem / 0.95rem / 0.98rem / 1.02rem, and 11px/12px/13px/15px/16px mixed with rem. There are also 16 different `clamp()` heading sizes against the 2 the contract defines (display and headline). Fix: define `--fs-label .75rem`, `--fs-small .875rem`, `--fs-body 1rem`, `--fs-title 1.25rem`, plus the two contract clamps, and collapse everything onto them.
- **WARNING** Weights in use: 600 (24), 500 (11), 700 (4), 750 (1), 650 (1). The contract allows 400/600/650. Remove 500, 700, and 750.
- **BLOCKER (Legibility Floor rule)** Text below 0.75rem: `global.css:1524` `.site-nav__search-kbd` 0.65rem, `:1608` `.search-modal__kbd` 0.68rem, `:1864` FAB tooltip 0.72rem, `PricingWorkbench.astro:161` 0.69rem and `:281` 0.72rem, `InstallationMethods.astro:118` 0.72rem, `ImmersiveIDE.astro:376` 11px, and `HomepageVariationFieldManual.astro:401` `clamp(0.65rem, …)`. Raise each to 0.75rem.
- **NIT** Tertiary ink at small sizes: `BlogLayout.astro:44,53,56` uses `--text-3` at 0.8125rem for meta and TOC. DESIGN.md says "Tertiary Ink: never tiny body text". Use `--text-2`.

### Pillar 5: Spacing / Layout (2/4)
- **BLOCKER** Horizontal page scroll at 375px on 4 routes (Fix 1). Wide tables on /docs/architecture/, /ai/, /local-cloud-for-ai-agents, and the Dataproc blog post do overflow their own boxes, but the document `scrollWidth` stays at 375, so they are correctly contained. Confirm that each scroll wrapper has `tabindex="0"` and a label, as the spec requires.
- **WARNING** Off-scale radii (contract: 0.75 / 1 / 1.25rem / pill): `global.css:157, 892, 985, 1603, 1643, 1668, 1861, 1895, 2075, 2336`; `HomepageVariationFieldManual.astro:506 (2rem), 548, 598, 702 (1.5rem), 838`; `PricingWorkbench.astro:146, 228`; `ImmersiveIDE.astro:198, 210, 256, 353, 369, 526, 566` (px values); `BlogLayout.astro:61` (0.25rem focus outline). There are 24 in total. Snap them to 0.75rem for controls and code, 1rem for panels, and 1.25rem for features.
- **WARNING** Content widths: `BlogLayout.astro:35` sets `width: min(100% - 2.5rem, 64rem)`, while `.container` is `min(100% - 2rem, 78rem)`. So the blog column and gutters do not line up with the header or footer edges (blog-d.png: content starts at x=208 vs logo at x=96).
- Arbitrary Tailwind values (`max-w-[34rem]`, `min-w-[46rem]`, `text-[0.8rem]`, `leading-[1.7]`) are used throughout the pages instead of tokens.

### Pillar 6: Experience Design (3/4)
- Good: there is a global `:focus-visible` ring (`global.css:185`) matching the focus token, a `prefers-reduced-motion` block (`:1393`), a 44px mobile menu trigger, copy buttons, tabbed install methods, a native `<details>` TOC on the blog, and a 404 with two recovery paths.
- **WARNING** On every route, 37 to 93 links or buttons render less than 24px tall (footer links, inline nav links, kbd hints). The most is 93 on /agents mobile. DESIGN.md asks for 44px targets on navigation and copy controls. Fix: `.site-footer a { display:inline-block; padding-block: .625rem }` and a `min-height: 44px` hit area on sidebar and TOC links.
- **WARNING** Inconsistent focus styling: `BlogLayout.astro:61` overrides it with a solid `var(--brand-blue)` outline at offset 4px. Everywhere else uses 55% alpha at offset 2px. Pick one.
- **NIT** `BlogLayout.astro:73` forces `.reveal` to stay visible on blog pages. That works, but it signals that the global reveal-on-scroll can hide content when JS fails. Consider the same no-JS fallback site-wide.
- Contrast: ink, secondary, and tertiary text on #fff and #f8f9fa all pass AA (tertiary #6a6f74 ≈ 5.0:1). The pale-blue "404" numeral is decorative.

---

## Blog Redesign (uncommitted), fit with the visual system
**Fit: moderate.** It reuses Header, Footer, the site-chip, the site-button, and the eyebrow, and it adds a sensible 70ch measure, a sticky TOC at ≥1100px, and contained code panels. Divergences:
- It creates its own type scale inline (`BlogLayout.astro:36-45`: 1.0625rem body, 0.8125rem meta, three new h1/h2/h3 clamps). Move these into global tokens or reuse the headline token.
- A different page width from `.container` (`:35`) breaks edge alignment with the header and footer.
- Cards draw borders with `box-shadow: 0 0 0 1px` plus an ambient shadow (`:76`). DESIGN.md reserves ambient shadows for major panels, and other cards use a 1px border. Hover turns the ring blue, which is acceptable.
- The featured card (`:81`) sits on `--surface-2` inside a bordered panel, so it reads as disabled or gray next to the white cards (blog-d.png).
- Uses a hard-coded easing `cubic-bezier(0.2,0,0,1)` (`:58, :76`) instead of `--ease`, a 0.25rem focus radius, and a solid focus color (see Pillar 6).
- The post is dated in the future (Pillar 1).

Registry audit: no `components.json`, so shadcn was not initialized and the audit was skipped.

---

## Files Audited
DESIGN.md, PRODUCT.md, CLAUDE.md, AGENTS.md, src/styles/global.css, src/layouts/BlogLayout.astro, src/data/blogPresentation.ts, src/data/agenticMarkdown.ts, src/data/services.ts, src/components/{Header, Footer, InstallationMethods, HomepageVariationFieldManual, PricingWorkbench, ImmersiveIDE, AgenticContentPage, ServiceOverviewLanding}.astro, src/pages/{404, gcp-emulator, compatibility, local-cloud-development, ai/index}.astro, src/pages/docs/*.mdx (copy grep). Screenshots of /, /pricing, /docs/, /docs/architecture/, /docs/configuration/, /services/pubsub/, /compare/, /glossary/, /blog/, /blog/run-dataproc-locally-docker/, /blog/localcloud-for-ai-agents/, /gcp-emulator, /local-cloud-for-ai-agents, /ai/, /agents/, /does-not-exist.
