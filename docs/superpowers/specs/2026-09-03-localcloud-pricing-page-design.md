# LocalCloud Pricing Page Prototype Design

**Date:** 2026-09-03

**Status:** Completed and promoted to production

**Outcome (2026-09-03):** The user selected Open Workbench. The governing runtime license was revised to support the advertised Community and Commercial paths, the selected direction was promoted to `/pricing/`, and the isolated prototype route was removed.

**Prototype route:** `/prototypes/pricing/`

**Future production route:** `/pricing/`

## Purpose

Design and compare three complete pricing-page directions for a simple audience-based LocalCloud licensing model. LocalCloud should be free for individual developers, students, and nonprofit organizations. For-profit companies should contact LocalCloud for commercial licensing.

The exploration must remain isolated from the production site until a direction is selected. Publishing the selected direction requires a compatible governing license.

## Product Model

The page presents one product under two licensing categories. It must not imply that the free category receives a reduced feature set or that commercial customers unlock a separate technical tier.

### Community

- Price label: **Free**
- Eligible audiences: individual developers, students, and nonprofit organizations
- Primary action: **Get started**
- Primary action destination: `/docs/`
- Secondary action: **Read the license**
- Secondary action destination: `/docs/licensing/`

### Commercial

- Price label: **Contact us**
- Audience: any for-profit company using LocalCloud for its business
- Primary action: **Contact us**
- Action destination: `mailto:data.oculus.llc@gmail.com`
- Prefilled subject: `LocalCloud commercial licensing inquiry`
- Secondary action: **Read the license**
- Secondary action destination: `/docs/licensing/`

The page will use “Community” and “Commercial” as category names. It will state plainly that eligibility, rather than feature access, separates the categories.

## License Boundary

The current runtime `LICENSE` conflicts with the intended pricing model in two material ways:

1. It defines nonprofit organizations as commercial entities and does not grant them free use.
2. It states that no commercial license is currently offered or available.

The prototype must therefore be local-only, excluded from indexing, and labeled as a proposed policy. The production pricing route, navigation link, structured data, generated documentation, and marketing claims must not ship until all governing and synchronized license sources grant the advertised uses.

At minimum, production implementation must reconcile:

- the governing runtime `LICENSE`;
- the site licensing reference at `src/pages/docs/licensing.mdx`;
- synchronized documentation-contract licensing data;
- product facts and generated AI-readable documentation; and
- validators that currently prohibit pricing routes and commercial terms.

The license text remains authoritative when marketing copy and license summaries differ.

## Shared Page Structure

Each prototype renders the complete page in realistic LocalCloud site context:

1. Existing LocalCloud header treatment with a visible **Pricing** item immediately after **AI**.
2. A concise hero explaining audience-based pricing.
3. The Community and Commercial categories.
4. A direct statement that both categories use the same LocalCloud product and capabilities.
5. Eligibility details sufficient to distinguish personal, student, nonprofit, and for-profit use.
6. License links near the decision and in the page footer.
7. A restrained local-prototype notice that the proposed policy requires a license update before publication.

The page will not include monthly or annual dollar amounts, seat counts, feature matrices, add-ons, enterprise sub-tiers, discount badges, or a sales form.

## Prototype Directions

### Open Workbench

**Axis:** asymmetric, community-first composition.

The Community category occupies the larger portion of the page and reads as an open invitation to build. The Commercial category forms a compact inquiry panel beside it. A single workbench-like ruled surface connects both categories and reinforces that they use the same product.

This direction expresses the free-first philosophy most strongly. Its cost is that the unequal visual weight can make Commercial feel secondary.

### Two Clear Paths

**Axis:** balanced, familiar comparison.

Community and Commercial receive equal-width panels with parallel information order and actions. The panels use LocalCloud’s restrained borders and spacing rather than conventional elevated SaaS pricing cards.

This direction is the easiest to scan and compare. Its cost is that the composition is less distinctive and says less about the community-first philosophy.

### License Ledger

**Axis:** dense, decision-oriented eligibility record.

The page uses ruled rows and explicit eligibility statements instead of plan cards. Community and Commercial appear as two columns within a factual license ledger, followed by a compact decision prompt.

This direction makes the legal boundary clearest. Its cost is a more formal tone and less emotional warmth.

## Visual System

All variants must feel native to the current LocalCloud site:

- Use the existing Roboto display/body roles and Roboto Mono utility role.
- Preserve the bright workbench palette, Google-derived blue, accessible text colors, fine rules, and flat surfaces.
- Use cards only when they communicate a bounded licensing choice.
- Avoid decorative gradients, urgency devices, discount language, excessive pills, and generic enterprise-pricing imagery.
- Spend visual emphasis on one signature element per direction.
- Keep interactive transitions at 150ms or less, use explicit transition properties, and provide static hover, focus, and active cues.
- Respect `prefers-reduced-motion`.

## Prototype Architecture

The exploration will use an isolated Astro surface:

- `src/pages/prototypes/pricing/index.astro` owns the full-size preview stage and picker.
- One isolated component owns each variant.
- Prototype styles remain scoped to the prototype surface.
- Production components do not import prototype code.
- The route carries `noindex` metadata.

The picker follows the prototype skill contract exactly:

- one full-size variant is visible at a time;
- variant switching is instant;
- the floating picker preserves its specified neutral chrome;
- keys `1`–`3` and left/right arrows switch variants;
- the selected variant persists in the `v` URL parameter; and
- the picker remains usable by keyboard and at mobile widths.

## Interaction Behavior

- **Get started** navigates to the current Getting Started route.
- **Read the license** navigates to the current licensing reference.
- **Contact us** opens the user’s email client with the approved address and subject.
- Every interactive element has visible hover, focus, and active states.
- Tap targets meet a 44 by 44 CSS-pixel minimum where space permits.
- The page remains understandable and complete when motion is disabled.

The prototype will not collect form data or add analytics events.

## Responsive Behavior

All directions must work at 320, 375, 768, and 1440 CSS pixels wide.

- The full header context remains recognizable; mobile navigation follows the current site pattern.
- Two-column compositions collapse into a deliberate reading order: Community before Commercial.
- Long eligibility language wraps without page-level horizontal overflow.
- The picker does not obscure primary actions or license links.
- The page remains usable at 200% browser zoom.

## Verification

Before presentation:

1. Build the Astro site successfully with the isolated prototype route.
2. Open every direction through both pointer and keyboard picker controls.
3. Verify direct selection, arrow-key cycling, and URL persistence.
4. Verify the Getting Started, licensing, and email destinations.
5. Inspect desktop and mobile layouts for overflow, overlap, and readable order.
6. Confirm visible keyboard focus and reduced-motion behavior.
7. Confirm the browser console has no errors.
8. Capture one desktop screenshot of each direction for review.

## Selection and Promotion

The prototype remains available until a direction is selected. Selection does not itself authorize publication.

After selection:

1. Integrate the chosen direction at `/pricing/` using production components and tokens.
2. Add **Pricing** immediately after **AI** in desktop and mobile navigation and add the route to the relevant footer/product navigation.
3. Add appropriate page metadata and structured data without inventing a numeric offer.
4. Update the governing license and all synchronized licensing surfaces before publishing the route.
5. Replace validators that intentionally prohibit pricing with assertions for the approved two-category model.
6. Run the full build and rendered-content verification.
7. Delete the isolated prototype surface unless explicitly asked to retain it.

## Non-Goals

- Choosing or publishing a numerical commercial price.
- Building checkout, billing, account, entitlement, or license-key flows.
- Creating more than two audience categories.
- Differentiating categories with feature gates.
- Revising the governing license during the prototype phase.
- Publishing the pricing route or production navigation before a visual direction is selected and the license is compatible.
