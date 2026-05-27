# Product

## Register

brand

## Users

Two overlapping audiences, both developers:

- **Evaluators** landing on the homepage and service pages. They want to know what LocalCloud runs, how it compares to individual GCP emulators, and whether it's worth adopting. They're skeptical of "free" and need credibility signals fast.
- **Active users** deep in the docs, SDK examples, and feature comparison tables. They're in the middle of a workflow and need accurate, scannable information with minimal friction.

Both audiences share context: they're developers who know Google Cloud, use CLIs and SDKs, and value speed over polish. They read code before prose.

## Product Purpose

LocalCloud is a single Docker container that runs 20+ Google Cloud services locally — same SDKs, same APIs, zero code changes, no cloud costs. It replaces the credential dance and the cloud bill during development with a local runtime that feels like the real thing.

Success looks like: a developer pulls the image, runs one command, points their SDK to localhost, and never thinks about cloud credentials during local development again.

## Brand Personality

**Developer friendly, credible, professional, impressively free.**

The voice is clear and technical without being cold. Think "well-maintained open source project that happens to be polished," not "startup trying to sell you something." The free tier isn't a growth hack — it's a genuine position. The design should make developers feel like they've discovered something serious and generous, not something that's about to put up a paywall.

Reference site: [localstack.cloud](https://localstack.cloud) — clean, high-signal, developer-tool confidence without SaaS fluff.

## Anti-references

- **SaaS-cream:** generic gradient heroes, floating 3D isometric illustrations, "The future of X" headlines, dashboard-in-a-laptop mockups with meaningless charts.
- **Enterprise-nav:** mega menus, dropdown carousels, "Solutions" and "Why Us" in the primary nav.
- **Startup urgency:** fake scarcity, countdown timers, "Join 50,000+ developers" social proof widgets, testimonial carousels.
- **Over-designed dev tools:** too much decoration on pages that developers are trying to scan for information. The docs should feel like well-designed reference material, not a marketing brochure.

## Design Principles

1. **Show, don't tell.** The quickstart block, the terminal, the service comparison tables — these do more convincing than any headline. Prioritize real artifacts (commands, tables, code samples) over marketing copy.

2. **High signal, low noise.** Every element on the page should help a developer understand, decide, or act. Cut decorative elements that don't carry information.

3. **Credible at scale.** The design should communicate that this is a serious Google Cloud tool — not a weekend project, not abandonware. Typography, spacing, and color should feel like Google's own design language translated to an independent tool.

4. **Generosity as brand position.** "Free for developers" is a core message, not a footnote. The design should feel open, welcoming, and transparent — no dark patterns, no locked content, no upsell anxiety.

5. **Docs are the product.** The documentation pages are where active users spend their time. They should be as thoughtfully designed as the homepage — fast, scannable, typographically excellent.

## Accessibility & Inclusion

No specific WCAG level mandated. Follow standard best practices: sufficient color contrast, keyboard navigability, focus indicators, and `prefers-reduced-motion` support (already partially implemented).
