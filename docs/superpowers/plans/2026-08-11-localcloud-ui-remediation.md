# LocalCloud UI Remediation Implementation Plan

**Specification:** `docs/superpowers/specs/2026-08-11-localcloud-ui-remediation-design.md`

## Phase 1: Restore documentation correctness

### Files

- `astro.config.mjs`
- `src/utils/rehype-table-regions.mjs` (new)
- `src/styles/global.css`
- `scripts/verify-rendered-docs.mjs` (new)
- `package.json`

### Steps

1. Add a dependency-free rehype transformer that walks HAST siblings, tracks the nearest heading ID, and replaces each table with a focusable `.docs-table-scroll` region containing the original table.
2. Configure `mdx({ gfm: true, rehypePlugins: [rehypeTableRegions] })` explicitly.
3. Add flat, locally scrollable table-region styles with visible focus and contained inline overscroll.
4. Add `verify-rendered-docs.mjs` to compare source Markdown table delimiters with rendered table and wrapper counts, assert header semantics, and reject raw pipe-table paragraphs.
5. Run the verifier through the existing `pnpm build` command.

### Proof

- `pnpm build` succeeds.
- `dist/docs/bigquery-feature-comparison/index.html` contains matching counts of `.docs-table-scroll`, `<table>`, `<thead>`, and `<th>`.
- No rendered paragraph contains a raw table header.

## Phase 2: Repair the documentation shell

### Files

- `src/layouts/DocsLayout.astro`
- `src/styles/global.css`

### Steps

1. Replace `.docs-mobile-nav` with a mobile-only native `<details>` navigation disclosure.
2. Render the existing `sidebarSections` grouping inside the disclosure; expose current page in the summary.
3. Keep the desktop sidebar unchanged, but replace category `<h4>` elements with styled labels.
4. Change the collapsed docs grid track to `minmax(0, 1fr)`.
5. Add shrink constraints to `.docs-article`, its frame, prose content, and relevant grid/flex descendants.
6. Keep overflow local to `pre`, `.docs-table-scroll`, tab bars, and the navigation disclosure.
7. Raise docs toolbar targets to at least 44px.

### Proof

At 320, 375, 768, and 1440px:

- `/docs/` has `documentElement.scrollWidth === clientWidth`.
- Code blocks may scroll internally but never widen the article.
- The mobile disclosure opens and all grouped links are keyboard reachable.
- Desktop remains a 272px navigation rail plus flexible article.
- The article `h1` is the first content heading.

## Phase 3: Harden navigation, copying, color, and type

### Files

- `src/components/Header.astro`
- `src/components/CopyButton.astro`
- `src/styles/global.css`

### Steps

1. Add `aria-controls` and a single header-menu state helper.
2. Close the menu on `Escape`, synchronize state, and return focus.
3. Give copy controls a 44×44px minimum hit area.
4. Catch clipboard success and failure, announce both through the existing live region, and clear stale reset timers.
5. Change `--text-3` to `#6a6f74` and success green to `#137333`.
6. Raise descriptor, kicker, chip, and metadata text to at least 12px.

### Proof

- Mobile menu state changes correctly after pointer activation and `Escape`.
- Focus returns to the toggle.
- Copy success says “Copied!”.
- Forced clipboard rejection says “Copy failed. Select the text and copy manually.” and the control remains usable.
- Copy and audited toolbar targets are at least 44×44px.
- Normal text/token combinations meet 4.5:1.

## Phase 4: Reorder service-detail information

### Files

- `src/pages/services/[slug].astro`

### Steps

1. Split the current hero into three direct grid children: intro, connection, metrics.
2. Put connection before metrics in DOM order.
3. Use valid explicit desktop grid placement and Tailwind v4 underscore syntax.
4. Convert metrics to a semantic `<dl>` with ruled divisions and no card treatment.

### Proof

- At 375×812, the connection panel appears before metrics and its copy control is in the first useful viewport sequence.
- At 1440×900, the hero computes to two columns and the connection panel occupies the right column.
- No global overflow is introduced.

## Phase 5: Reduce homepage mobile load and repeated-card styling

### Files

- `src/components/HomepageVariationFieldManual.astro`
- `src/components/Card.astro` only if markup semantics need adjustment
- `src/styles/global.css`

### Steps

1. Add service counts to category summaries and one mobile “View all services” link.
2. Hide individual atlas service rows on phone layouts while retaining full desktop detail.
3. Flatten homepage signals, proof ribbon, category containers, service rows, and guide links into ruled/flat structures.
4. Remove category gradients and unnecessary nested borders.
5. Restyle docs `CardGroup` links as compact navigation rows without lifted-card styling.
6. Preserve the hero headline, illustration, quick-start terminal, primary actions, icons, and copy.

### Proof

- Mobile homepage remains 375px wide and is materially shorter than the 9,318px baseline.
- The service atlas no longer contains twenty expanded mobile entries.
- “View all services” reaches `/services/`.
- Desktop retains every service link.
- The first homepage fold is visually unchanged except for accessible token/type corrections.

## Phase 6: Codify the corrected design system

### Files

- `DESIGN.md` (new)
- `.impeccable/design.json` (new)

### Steps

1. Extract corrected color, typography, radius, spacing, elevation, and component tokens.
2. Document the “bright developer workbench” direction using the required six-section Stitch-compatible structure.
3. Carry every `PRODUCT.md` anti-reference into explicit do/don’t rules.
4. Include canonical button, navigation, table, chip, card/row, and copy-control patterns in the sidecar.
5. Reload Impeccable context after generation.

### Proof

- The design context loader reports both PRODUCT and DESIGN context.
- Frontmatter contains only real extracted tokens.
- The sidecar contains no duplicate or generic placeholder primitives.

## Phase 7: End-to-end verification

1. Run `pnpm build`.
2. Launch the built preview with a supervised process.
3. Exercise `/`, `/docs/`, `/docs/bigquery-feature-comparison/`, and `/services/bigquery/` at 320×568, 375×812, 768×1024, and 1440×900.
4. Verify overflow, table semantics, keyboard scrolling, heading order, target rectangles, menu dismissal, focus restoration, copy success/failure, 200% zoom, and reduced motion.
5. Run a focused code review using the repository diff and the approved specification.
6. Re-run Impeccable critique and audit if the detector is available; otherwise record the same concrete detector failure and use browser/source evidence.
7. Perform final cleanup only after smoke testing succeeds.
