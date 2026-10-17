---
name: LocalCloud
# The LocalCloud visual system translates familiar Google-derived clarity into an independent local-development tool.
description: Google Cloud in-a-box for fast, credible local development.
colors:
  accent-blue: "#1a73e8"
  accent-blue-strong: "#185abc"
  brand-sky: "#8ab4f8"
  brand-green: "#188038"
  brand-yellow: "#fbbc04"
  brand-red: "#ea4335"
  ink: "#202124"
  secondary-ink: "#5f6368"
  tertiary-ink: "#5f6368"
  canvas: "#ffffff"
  page-canvas: "#f8f9fa"
  desktop-backdrop: "#dfe5ed"
  navigation-tint: "#e8f0fe"
  inset-surface: "#f1f3f4"
  border: "#dadce0"
typography:
  display:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 5vw + 1rem, 6rem)"
    fontWeight: 650
    lineHeight: 0.95
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.8rem)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Roboto Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.1em"
rounded:
  control: "0.375rem"
  panel: "0.5rem"
  feature: "0.5rem"
  pill: "999px"
spacing:
  compact: "0.5rem"
  control: "0.75rem"
  component: "1rem"
  section: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.canvas}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 1.15rem"
    height: "2.85rem"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 1.15rem"
    height: "2.85rem"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "1.25rem"
  chip:
    backgroundColor: "{colors.inset-surface}"
    textColor: "{colors.accent-blue-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.7rem"
---

# Design System: LocalCloud

## Overview

**Creative North Star: "The Developer Workbench"**

LocalCloud should feel like a meticulously arranged workbench beside a terminal: bright, quiet, credible, and immediately useful. Familiar Google-derived color and typography reduce learning cost, while actual commands, ports, service facts, and product-specific illustrations make the system unmistakably LocalCloud rather than a borrowed corporate page.

The hierarchy is progressive disclosure, not equal-weight feature inventory. A page begins with one promise and one next action; reference density appears only where active users need it. Responsive behavior is structural: mobile condenses inventories, exposes navigation through native disclosure, and contains wide technical artifacts locally rather than shrinking them into illegibility.

**Key Characteristics:**
- Light, technical, and generous rather than decorative.
- Real product evidence before marketing abstraction.
- Ruled sections and tonal insets for narrative content; bordered category and service cards for the catalog.
- Blue communicates action; green communicates verified success.
- Every technical surface remains readable and keyboard-operable on narrow screens.

## Colors

A neutral daylight canvas carries one functional blue voice, with Google-derived secondary hues reserved for service identity and true status.

### Primary
- **Workbench Blue:** Primary links, active navigation, controls, focus indicators, and compact information chips. It must remain uncommon enough to signal action.
- **Deep Action Blue:** Hover states and small text where the primary blue lacks sufficient contrast.

### Secondary
- **Service Sky:** Service illustrations and quiet informational markers.
- **Verified Green:** Successful state and supported capability only.
- **Signal Yellow:** Rare caution or multicolor brand detail only.
- **Error Red:** Failure and destructive state only.

### Neutral
- **Primary Ink:** Headlines, body copy that carries decisions, and high-value technical facts.
- **Secondary Ink:** Supporting prose and metadata that remains comfortably readable.
- **Tertiary Ink:** Large or nonessential labels only; never tiny body text.
- **Canvas:** White content panels on a light gray Page Canvas. Desktop uses a slightly darker blue-gray backdrop to separate the content window.
- **Navigation Tint:** Pale blue title bars and active tabs. Hero sections use a subtle blue-to-sage wash.
- **Inset Surface:** Code, environment values, and nested technical facts.
- **Border:** One-pixel dividers and quiet container outlines.

**The One Blue Voice Rule.** Use strong blue for action, focus, and links. Pale blue is reserved for navigation and the hero wash; content and code remain neutral.

**The Semantic Status Rule.** Green means verified success, yellow means caution, and red means failure. Never use them as arbitrary section accents.

## Typography

**Display Font:** Roboto (with system-ui fallback)  
**Body Font:** Roboto (with system-ui fallback)  
**Label/Mono Font:** Roboto Mono (with monospace fallback)

**Character:** Roboto provides the familiar clarity expected by Google Cloud developers. Roboto Mono identifies commands, ports, metadata, and compact labels without turning the entire interface into a terminal costume.

### Hierarchy
- **Display** (650, fluid 2.75–6rem, 0.95): Homepage promise only; short lines and deliberate wrapping.
- **Headline** (500, fluid 2–3.8rem): Page hero and major section titles; the homepage keeps its distinct display treatment.
- **Title** (600, approximately 1–1.25rem, 1.3): Cards, documentation rows, and compact content groups.
- **Body** (400, 1rem, 1.65): Explanations and instructions; keep long-form measure near 74ch.
- **Label** (600, 0.75rem, 0.1em, uppercase): Short kickers, metadata keys, and categories only.

**The Two-Family Rule.** Roboto speaks; Roboto Mono labels. Never set explanatory paragraphs or long headings in mono.

**The Legibility Floor Rule.** Supporting text must be at least 0.75rem with WCAG AA contrast; smaller decorative metadata is prohibited.

## Elevation

The system is flat by default. Depth comes from canvas-to-inset tonal changes, one-pixel rules, and spacing. Ambient shadows are reserved for floating chrome and the desktop window; content panels use borders, with a restrained hover shadow for interactive cards.

### Shadow Vocabulary
- **Desktop window** (`0 4px 16px #253d631c`): Light separation from the desktop backdrop.
- **Hover** (`0 18px 36px -24px rgba(0, 0, 0, 0.09)`): Interactive cards only.
- **Floating chrome** (`0 24px 60px -34px rgba(0, 0, 0, 0.12)`): Search overlays and persistent floating controls.
- **Focus ring** (`0 0 0 2px rgba(26, 115, 232, 0.55)`): Keyboard focus only.

**The Flat-by-Default Rule.** Group adjacent narrative content with internal rules. The Service Catalog is the deliberate exception: category panels and individual services keep visible borders so their hierarchy remains scannable.

## Components

Components feel precise and immediately operable: quiet at rest, unmistakable on hover and focus, and never smaller than a comfortable touch target.

### Buttons
- **Shape:** Gently rounded controls (0.375rem) with a minimum 44px target.
- **Primary:** Workbench Blue with white text; reserved for the single highest-value action in a region.
- **Hover / Focus:** One-pixel lift on hover and a visible blue focus ring; reduced-motion users receive state changes without movement.
- **Secondary:** White canvas, Primary Ink, and a one-pixel Border outline.

### Chips
- **Style:** Pale blue or neutral inset, Deep Action Blue or Primary Ink text, pill shape, and mono label typography.
- **State:** Chips describe category or status. They are not default containers for body copy or navigation.

### Cards / Containers
- **Corner Style:** Standard panels and feature surfaces use 0.5rem; code blocks and controls use 0.375rem. Agent mode uses one plain, naturally scrolling document with the dark Matrix palette and green monospace text. It has text navigation and a direct Markdown link, with no OS window controls, icon rails, taskbar, puzzle, copy controls, or hidden client examples. CSS code rain stays behind the opaque document; it pauses in hidden tabs, respects reduced motion by default, and offers an explicit persisted Play/Pause choice. Privacy, license, and analytics opt-out remain available as plain footer controls. Human mode keeps its existing layout.
- **Background:** Canvas at the page level; Inset Surface for nested technical values.
- **Shadow Strategy:** Flat by default; floating chrome and desktop windows receive a light shadow, while interactive cards lift only on hover.
- **Border:** One-pixel Border; the Service Catalog boxes both categories and services, while documentation navigation uses grouped rules.
- **Internal Padding:** 1–1.5rem, reduced carefully on small phones without compromising targets.

### Inputs / Fields
- **Style:** White or inset surface, one-pixel border, 0.375rem radius, and an explicit visible label.
- **Focus:** Deep Action Blue border plus the shared focus ring.
- **Error / Disabled:** Error Red plus plain-language recovery; disabled state lowers emphasis but retains readable contrast.

### Navigation
- Desktop navigation is quiet text with a tonal active state. Mobile navigation uses a 44px disclosure control with `aria-expanded`, closes on Escape, returns focus to the trigger, and hides inactive content from assistive technology. Documentation navigation becomes an in-flow native disclosure below 980px; it never overlays the article.

### Technical Evidence
- Commands use soft gray inset code blocks with syntax colors that meet at least 4.5:1 contrast.
- Copy controls overlay the top-right corner with a 44px target and horizontal clearance; they reserve no header lines.
- Client tabs use body type, a pale blue selected state and a blue underline.
- Copy actions announce both success and failure. Failure text tells the user to select and copy manually.
- Comparison tables render as semantic tables inside labeled, focusable horizontal scroll regions. Never serialize a table into wrapped pipe characters.

## Do's and Don'ts

### Do:
- **Do** lead evaluator pages with one precise claim, one primary action, and real product evidence.
- **Do** keep active-user documentation dense but locally scannable through headings, rules, and semantic tables.
- **Do** preserve at least 44px targets for navigation and copy controls across small phone, large phone, tablet, and desktop contexts.
- **Do** contain wide code and tables inside their own scroll regions while keeping the page viewport fixed.
- **Do** keep every service category and bordered service card visible on mobile, stacked into one readable column.
- **Do** respect `prefers-reduced-motion` by removing entrance transitions and decorative animation.

### Don't:
- **Don't** turn every section into generic SaaS rounded cards, pills, and micro-labels; boxed categories and services are reserved for the catalog’s browsable inventory.
- **Don't** use purple gradients, neon accents, glassmorphism, or dark developer-tool cosplay; LocalCloud is a daylight workbench beside the terminal.
- **Don't** use equal-weight grids when one action, fact, or artifact deserves priority.
- **Don't** use low-contrast tiny metadata to manufacture hierarchy.
- **Don't** place connection instructions after vanity metrics on mobile service pages.
- **Don't** replace semantic tables with prose or pipe-delimited text.
- **Don't** hide navigation in non-semantic overlays or leave menu state unsynchronized with accessibility attributes.
