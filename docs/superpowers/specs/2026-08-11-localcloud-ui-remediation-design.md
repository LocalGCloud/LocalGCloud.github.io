# LocalCloud UI Remediation Design

**Date:** 2026-08-11  
**Status:** Approved  
**Primary target:** `src/pages/index.astro`  
**Representative routes:** `/`, `/docs/`, `/docs/bigquery-feature-comparison/`, `/services/bigquery/`

## Purpose

Correct the two major documentation failures, then address the remaining accessibility, information-order, and visual-distillation findings from the 2026-08-11 critique. Preserve LocalCloud’s restrained, light, Google-derived tone and its strongest authored elements: real commands, exact service facts, direct actions, and product-specific imagery.

## Goals

1. Render the BigQuery comparison as semantic, accessible tables.
2. Eliminate global horizontal overflow from documentation pages at narrow widths.
3. Make navigation and copy interactions meet keyboard, feedback, contrast, and touch-target baselines.
4. Put connection information before secondary metrics and reduce the homepage’s mobile inventory burden.
5. Remove repeated-card and micro-label excess without redesigning the brand.
6. Codify the corrected visual system in `DESIGN.md` and `.impeccable/design.json`.
7. Add a permanent rendered-output guard for the table contract.

## Non-goals

- Dark mode or a new color strategy.
- New product features, routes, service facts, pricing, or marketing claims.
- Replacing Roboto, the LocalCloud mark, the hero illustration, terminal examples, or service icons.
- Rebuilding the entire documentation framework or adopting a component library.
- Repairing the externally installed Impeccable detector bundle.

## Design Direction

Use a bright developer workbench rather than a marketing template. The interface remains factual, restrained, and high-readability. Hierarchy comes from order, whitespace, rules, and typographic weight before cards, shadows, gradients, or pills.

Preserve:

- `#f8f9fa` page background and the blue Google-derived accent family.
- Real terminal and SDK artifacts.
- Clear homepage headline and primary actions.
- Existing desktop documentation rail and reading measure.
- Existing focus-visible and reduced-motion foundations.

Reduce:

- Repeated rounded containers.
- Decorative gradients.
- Status-like pills used for ordinary metadata.
- Uppercase mono labels below 12px.
- Mobile disclosure of information that is already available on dedicated catalog pages.

## Architecture

### Markdown and table rendering

Configure `@astrojs/mdx` explicitly with `gfm: true`. The current resolved Astro 6 processor does not pass a `gfm` option into MDX, despite the package-level default; a probe build with `mdx({ gfm: true })` produced native `<table>`, `<thead>`, and `<th>` output.

Add one local rehype plugin for rendered Markdown tables. For each table, the plugin will:

1. Preserve the native table node unchanged.
2. Wrap it in a `.docs-table-scroll` element.
3. Make the wrapper keyboard focusable with `tabindex="0"`.
4. Give the wrapper `role="region"`.
5. Label the region with the nearest preceding heading through `aria-labelledby`; use a concise fallback label only when no heading exists.

This is build-time structure, not client-side DOM mutation. Tables remain useful without JavaScript.

### Documentation shell

Keep the desktop sidebar. At widths below the existing docs breakpoint:

- Collapse the page grid to `minmax(0, 1fr)`.
- Set `.docs-article`, `.docs-article__frame`, prose content, and grid/flex children to `min-width: 0` where required.
- Keep overflow local to code blocks and table regions.
- Replace the 3,200px horizontal page-link strip with a native `<details>` disclosure that shows the current page and grouped navigation sections.

The disclosure requires no JavaScript, remains keyboard operable, and exposes the same information architecture as the desktop sidebar.

### Service detail hero

Use three direct grid children:

1. Introduction
2. Connection panel
3. Metrics

Mobile DOM order is introduction, connection, metrics. At the desktop breakpoint, explicit grid placement puts the introduction and metrics in the left column and the connection panel in the right column. Use valid Tailwind v4 arbitrary-track syntax with underscores, or component-scoped CSS if it is clearer; never use the invalid comma-separated track value.

### Homepage service atlas

Desktop retains detailed service links. Mobile shows only category title, description, and service count, followed by one “View all services” link to `/services/`. Individual service details remain available on the dedicated catalog route.

No accordion state or new client JavaScript is required.

## Components and Interaction

### Mobile header navigation

- Add `aria-controls="site-nav-mobile"`.
- Centralize open/close behavior in a small helper.
- Synchronize `aria-expanded`, visibility class, and accessible label.
- Close on `Escape` only when open.
- Return focus to the toggle after keyboard dismissal.

### Copy button

- Set a minimum interactive size of 44×44px while retaining the compact visual treatment.
- Preserve the existing `aria-live="polite"` status label.
- Report success as “Copied!”.
- Catch missing/denied clipboard access and report “Copy failed. Select the text and copy manually.”
- Restore the idle state after enough time to read the message.
- Prevent stale timers from overwriting a newer result.

### Documentation hierarchy

Sidebar category names are labels, not document subsections. Replace their `<h4>` elements with styled non-heading text. The article’s `h1` becomes the first heading in the main documentation content order.

### Metrics and navigation cards

- Convert service hero metrics from three cards to a semantic definition list with ruled divisions.
- Restyle docs landing `CardGroup` links as compact navigation rows. Keep icons, titles, descriptions, keyboard focus, and two-column desktop behavior, but remove lifted-card styling.
- Convert homepage hero signals, proof ribbon, category groups, and guide links toward ruled rows and flat surfaces.
- Keep cards only where an independently actionable, bounded object still benefits from containment.

## Color and Type Corrections

- Change tertiary text from `#9aa0a6` to approximately `#6a6f74`, which exceeds 4.5:1 on both white and `#f1f3f4`.
- Change the success foreground from `#188038` to approximately `#137333`, which exceeds 4.5:1 on the current success-soft surface.
- Set metadata, chip, kicker, and descriptor text to at least 12px.
- Keep `#202124`, `#5f6368`, the current blue accent family, Roboto, and Roboto Mono.
- Do not add dark mode, new gradients, or additional accent hues.

## Responsive Behavior

Test at 320×568, 375×812, 768×1024, and 1440×900.

Required behavior:

- `document.documentElement.scrollWidth === clientWidth` on all four representative routes, except that local table/code/nav regions may have larger internal `scrollWidth`.
- Table regions fit their article and scroll horizontally when needed.
- The docs disclosure replaces the mobile horizontal navigation strip.
- Homepage service summaries avoid rendering the twenty detailed entries on phone layouts.
- BigQuery connection details appear before metrics at phone widths and beside the introduction at desktop widths.
- Layout remains usable at 200% browser zoom.

## Error Handling

The only asynchronous UI behavior in scope is clipboard access. Clipboard rejection is an expected runtime state, not a console-only error. The control must remain operable after both success and failure.

The Markdown build must fail when the comparison’s rendered contract regresses. A new static verifier will compare the number of Markdown table delimiter rows in the comparison source with rendered `<table>` elements and assert:

- At least one comparison table exists.
- Source and rendered table counts match.
- `<thead>` and `<th>` are present.
- `.docs-table-scroll` wrappers are present for every table.
- Raw `| Feature |` or equivalent pipe headers do not appear in rendered paragraphs.

Add this verifier to the existing `pnpm build` pipeline after `astro build`.

## Verification

### Build

- `pnpm build`
- Rendered-doc verifier passes.
- Existing static SEO and product-fact checks continue to pass.

### Browser smoke tests

Run the built site and inspect all representative routes at desktop and mobile widths.

1. `/docs/`: no global horizontal overflow; disclosure is keyboard operable; code scroll remains local.
2. `/docs/bigquery-feature-comparison/`: semantic tables and headers exist; every table region is keyboard focusable and locally scrollable.
3. `/services/bigquery/`: connection appears before metrics on mobile and in the right column on desktop; copy control is at least 44×44px.
4. `/`: mobile atlas is materially shorter, CTA remains visible, and desktop service detail remains available.
5. Header: open menu, press `Escape`, verify closed state and returned focus.
6. Copy: verify success, force clipboard failure, verify visible and announced recovery text.
7. Contrast, heading order, focus visibility, reduced motion, and 200% zoom remain correct.

### Post-change review

Re-run the Impeccable critique and technical audit. The expected outcome is removal of both P1 findings and measurable improvement in user control, consistency, error recovery, and minimalism.

## Design-System Documentation

After the UI is verified, generate `DESIGN.md` and `.impeccable/design.json` from the corrected implementation. The specification must document:

- The restrained light palette and accessible semantic tokens.
- Roboto/Roboto Mono roles and 12px minimum metadata rule.
- Flat-by-default elevation and card restraint.
- Table, navigation, button, chip, and service-summary patterns.
- Mobile disclosure and touch-target rules.
- Every anti-reference in `PRODUCT.md`: SaaS-cream, enterprise navigation, startup urgency, and over-designed developer tools.
