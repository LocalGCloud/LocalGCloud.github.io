# LocalCloud Pricing Page Prototypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-index Astro prototype that lets the user compare three complete, responsive LocalCloud pricing-page directions without changing production navigation or publishing pricing claims.

**Architecture:** The prototype route renders the current visual context, three Astro variant components inside inert templates, and the fixed prototype picker. Client-side code clones exactly one template into the preview stage so switching or replaying remounts the selected variant; selection persists through `?v=1`, `?v=2`, or `?v=3`.

**Tech Stack:** Astro 6, scoped CSS, vanilla browser JavaScript, existing LocalCloud global tokens and `BaseLayout`/`BrandMark` components.

**Spec:** `docs/superpowers/specs/2026-09-03-localcloud-pricing-page-design.md`

## Global Constraints

- Keep all implementation under the isolated prototype surface; do not modify production `Header.astro`, `Footer.astro`, product facts, license documents, or validators.
- The route is `/prototypes/pricing/` and must render `<meta name="robots" content="noindex, nofollow">` through `BaseLayout`.
- Use exactly two licensing categories: **Community — Free** and **Commercial — Contact us**.
- Community covers individual developers, students, and nonprofit organizations.
- Commercial covers any for-profit company and links to `mailto:data.oculus.llc@gmail.com?subject=LocalCloud%20commercial%20licensing%20inquiry`.
- Both categories describe the same LocalCloud product and capabilities; do not add feature tiers, dollar prices, billing periods, seats, or discounts.
- Mark the policy as proposed and state that the current governing license controls until revised.
- Keep the prototype picker markup, class names, styling values, and behavior contract identical to `prototype/PICKER.md`.
- Use production LocalCloud tokens and typography inside the page variants; keep picker chrome neutral.
- Meet visible focus, reduced-motion, mobile reading-order, and page-level overflow requirements at 320, 375, 768, and 1440 CSS pixels.

---

### Task 1: Build the three pricing directions

**Files:**

- Create: `src/components/prototypes/pricing/OpenWorkbench.astro`
- Create: `src/components/prototypes/pricing/TwoClearPaths.astro`
- Create: `src/components/prototypes/pricing/LicenseLedger.astro`

**Interfaces:**

- Consumes: existing global CSS variables such as `--text`, `--text-2`, `--text-3`, `--surface`, `--surface-2`, `--line`, `--accent`, `--accent-strong`, `--accent-soft`, `--font-body`, and `--font-mono`.
- Produces: three zero-prop Astro components. Each renders one `<main>`-content direction with a top-level class and functional `/docs/`, `/docs/licensing/`, and `mailto:` links.

- [ ] **Step 1: Create the Open Workbench component**

Create an asymmetric Community-first page with this content contract:

```astro
<section class="open-workbench" aria-labelledby="open-workbench-title">
  <header class="open-workbench__hero">
    <span class="pricing-kicker">Simple licensing</span>
    <h1 id="open-workbench-title">Build freely. Bring business use to the table.</h1>
    <p>LocalCloud is free for individual developers, students, and nonprofit organizations. For-profit companies can contact us for a commercial license.</p>
  </header>
  <div class="open-workbench__board">
    <article class="open-workbench__community"><!-- Free category and links --></article>
    <aside class="open-workbench__commercial"><!-- Contact us category and links --></aside>
    <p class="open-workbench__shared">One LocalCloud. The same product and capabilities in both categories.</p>
  </div>
</section>
```

Use a two-thirds/one-third desktop grid, Community-first DOM order, a ruled workbench surface, one large `Free` label, and three eligibility rows. Collapse to one column below 800px. Animate only the hero and board entrance with opacity and a small fixed `translateY` over 240ms `cubic-bezier(0.2, 0, 0, 1)`; disable it under `prefers-reduced-motion`.

- [ ] **Step 2: Create the Two Clear Paths component**

Create an equal comparison with parallel semantic articles:

```astro
<section class="clear-paths" aria-labelledby="clear-paths-title">
  <header class="clear-paths__hero">
    <span class="pricing-kicker">Two paths. One product.</span>
    <h1 id="clear-paths-title">Choose by who you build for.</h1>
  </header>
  <div class="clear-paths__grid">
    <article><!-- Community / Free / eligibility / actions --></article>
    <article><!-- Commercial / Contact us / eligibility / actions --></article>
  </div>
  <p class="clear-paths__shared">Every LocalCloud capability is included. Your category is determined by who benefits from the work.</p>
</section>
```

Use equal columns above 760px, identical information order, quiet 1px structural borders, and no elevated SaaS-card shadows. Keep Community first on mobile. Apply the same 240ms entrance and reduced-motion rule as Open Workbench.

- [ ] **Step 3: Create the License Ledger component**

Create a decision-oriented ruled ledger:

```astro
<section class="license-ledger" aria-labelledby="license-ledger-title">
  <header class="license-ledger__hero">
    <span class="pricing-kicker">Use determines the license</span>
    <h1 id="license-ledger-title">A clear license for the way you work.</h1>
  </header>
  <div class="license-ledger__table" role="table" aria-label="LocalCloud licensing categories">
    <!-- Column headings plus Audience, Price, Product access, and Next step rows -->
  </div>
  <div class="license-ledger__decision"><!-- Community and Commercial actions --></div>
</section>
```

Represent the comparison with accessible row/column roles, ruled rows, mono labels, and one blue Commercial action cell. At widths below 720px, replace the grid-like visual arrangement with stacked category records while preserving an understandable accessibility tree. Apply the same entrance and reduced-motion rule.

- [ ] **Step 4: Check variant source contracts**

Run:

```bash
rg -n "Community|Commercial|Free|Contact us|data\.oculus\.llc@gmail\.com|same product|same LocalCloud|governing license" src/components/prototypes/pricing
```

Expected: all three components contain both categories, approved actions, a shared-product statement, license links, and a proposed-policy/current-license notice. No component contains a dollar amount.

- [ ] **Step 5: Commit the three directions**

```bash
git add src/components/prototypes/pricing
git diff --cached --check
git commit -m "feat: add LocalCloud pricing prototype directions"
```

### Task 2: Build the isolated context and picker

**Files:**

- Create: `src/pages/prototypes/pricing/index.astro`

**Interfaces:**

- Consumes: `BaseLayout`, `BrandMark`, `OpenWorkbench`, `TwoClearPaths`, and `LicenseLedger`.
- Produces: static route `/prototypes/pricing/index.html`, preview stage `#stage`, templates `#variant-1` through `#variant-3`, and a picker controlling the `v` URL parameter.

- [ ] **Step 1: Add the no-index route and realistic header context**

Use `BaseLayout` directly so the prototype can supply its own realistic header without changing production `Header.astro`:

```astro
<BaseLayout
  title="LocalCloud Pricing Directions"
  description="Local-only visual prototypes for a proposed LocalCloud licensing model."
  noindex
>
  <header class="pricing-proto-header">
    <!-- Existing brand treatment and navigation order: Home, Services, AI, Pricing, GCP Emulator, Guides -->
  </header>
  <div id="stage" aria-live="polite"></div>
  <footer class="pricing-proto-footer">
    <a href="/docs/licensing/">Current governing license</a>
  </footer>
</BaseLayout>
```

Give the prototype header its own unique mobile-menu IDs. Make the Pricing item active and place it immediately after AI in both desktop and mobile navigation. The mobile toggle must synchronize `hidden`, `aria-expanded`, and its accessible label and must close on Escape while restoring focus.

- [ ] **Step 2: Render inert variant templates and the picker**

Place each Astro component in an inert template and copy the picker markup exactly:

```astro
<template id="variant-1"><OpenWorkbench /></template>
<template id="variant-2"><TwoClearPaths /></template>
<template id="variant-3"><LicenseLedger /></template>

<nav class="proto-picker" aria-label="Prototype variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item" data-active aria-current="true">Open Workbench</button>
  <button class="proto-picker-item">Two Clear Paths</button>
  <button class="proto-picker-item">License Ledger</button>
  <span class="proto-picker-divider" aria-hidden="true"></span>
  <button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>
</nav>
```

Copy the picker CSS values verbatim from `/Users/jsenjaliya/.agents/skills/prototype/PICKER.md`. Do not replace the picker font, color, radius, shadows, duration, easing, or z-index with product tokens.

- [ ] **Step 3: Implement fixed picker behavior**

Use template cloning so every switch remounts the variant:

```js
const templates = ['variant-1', 'variant-2', 'variant-3'].map((id) => document.getElementById(id));

function mount(i) {
  stage.replaceChildren();
  requestAnimationFrame(() => {
    const template = templates[i];
    if (template instanceof HTMLTemplateElement) {
      stage.append(template.content.cloneNode(true));
    }
  });
}
```

Implement the remaining reference contract from `PICKER.md`: one active item, `aria-current`, measured sliding highlight, click selection, keys `1`–`3`, arrow cycling, `R` replay, input/editable-key exclusions, modifier exclusions, resize measurement, `?v=N` persistence, bounds fallback to variant 1, and delayed `data-ready`.

- [ ] **Step 4: Add isolated responsive shell styles**

Style only prototype-owned classes. Reuse the existing global variables for header, page, footer, and button context. Ensure the picker moves to the top on narrow screens if it would overlap page actions, and reserve enough lower page space for the bottom picker at wider sizes.

- [ ] **Step 5: Build the site**

Run:

```bash
pnpm build
```

Expected: exit 0; Astro emits `/prototypes/pricing/index.html`; existing documentation, policy, SEO, and product-fact validators remain green because production pricing is still absent.

- [ ] **Step 6: Verify rendered static contracts**

Run:

```bash
test -f dist/prototypes/pricing/index.html
rg -n "noindex, nofollow|Open Workbench|Two Clear Paths|License Ledger|data\.oculus\.llc@gmail\.com" dist/prototypes/pricing/index.html
```

Expected: the route exists and contains the robots directive, all three variant labels, and the approved contact destination.

- [ ] **Step 7: Commit the harness**

```bash
git add src/pages/prototypes/pricing/index.astro
git diff --cached --check
git commit -m "feat: add LocalCloud pricing prototype picker"
```

### Task 3: Verify the live comparison and capture evidence

**Files:**

- Create: `screenshots/pricing-prototype-open-workbench.png`
- Create: `screenshots/pricing-prototype-two-clear-paths.png`
- Create: `screenshots/pricing-prototype-license-ledger.png`

**Interfaces:**

- Consumes: the built prototype route and its browser behavior.
- Produces: three review screenshots and a verified local URL for the user.

- [ ] **Step 1: Start the Astro development server**

Run `pnpm dev --host 127.0.0.1` in a persistent PTY session. Record the printed port and open `http://127.0.0.1:<port>/prototypes/pricing/`.

- [ ] **Step 2: Verify picker behavior**

In the browser:

1. Click each named picker item and confirm exactly one variant is visible.
2. Press `1`, `2`, and `3`; confirm the matching direction appears.
3. Press left and right arrows; confirm selection wraps.
4. Press `R`; confirm the current direction remounts.
5. Reload on `?v=2`; confirm Two Clear Paths remains selected.
6. Confirm the browser console reports no errors.

- [ ] **Step 3: Verify actions and responsive behavior**

For every direction, inspect 1440×900 and 375×812. Also spot-check 320, 768, and 200% zoom.

Expected:

- Community appears before Commercial.
- No page-level horizontal overflow occurs.
- The picker does not cover primary actions.
- Header mobile navigation opens, closes, and returns focus after Escape.
- Get started targets `/docs/`.
- Read the license targets `/docs/licensing/`.
- Contact us targets the approved encoded `mailto:` URL.
- Focus indicators are visible and motion is not required to understand state.

- [ ] **Step 4: Capture review screenshots**

At 1440×900, capture one screenshot per direction using the filenames above. Keep the picker visible so the selected direction is reviewable from the artifact.

- [ ] **Step 5: Commit screenshot evidence**

```bash
git add screenshots/pricing-prototype-*.png
git commit -m "docs: capture LocalCloud pricing prototype directions"
```

- [ ] **Step 6: Present the picker and stop for selection**

Provide the live local URL, picker keys, screenshot links, and this comparison:

| Variant | Axis | When it is the right choice | Its cost |
| --- | --- | --- | --- |
| Open Workbench | Asymmetric and community-first | The pricing philosophy should lead the page | Commercial has less visual weight |
| Two Clear Paths | Balanced and familiar | Immediate comparison matters most | Least distinctive direction |
| License Ledger | Dense and decision-oriented | Legal eligibility must be unmistakable | More formal and less warm |

Do not modify production navigation or promote a direction until the user selects one.
