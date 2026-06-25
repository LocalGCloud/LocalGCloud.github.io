---
target: entire site
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-05-27T02-49-28Z
slug: src-pages-src-components
---
# Design Critique: LocalCloud Site

**Target**: entire site (src/pages/ + src/components/)
**Register**: Brand
**Date**: 2026-05-26

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good active states and copy feedback |
| 2 | Match System / Real World | 3 | Developer-appropriate language, real Docker commands |
| 3 | User Control and Freedom | 3 | Esc to close search, skip link, mobile toggle |
| 4 | Consistency and Standards | 3 | Two parallel naming systems (field- vs site-) |
| 5 | Error Prevention | 3 | Good 404, search empty states |
| 6 | Recognition Rather Than Recall | 3 | Active nav, breadcrumbs, sidebar highlight |
| 7 | Flexibility and Efficiency | 3 | Cmd+K search, copy buttons; no nav shortcuts |
| 8 | Aesthetic and Minimalist Design | 2 | Busy hero illustration, grid overlay noise |
| 9 | Error Recovery | 2 | Good 404; no inline error states |
| 10 | Help and Documentation | 4 | Extensive docs, searchable, multi-language SDK examples |
| **Total** | | **29/40** | **Good — solid foundation** |

---

## Anti-Patterns Verdict

**Does this look AI-generated?** No. Deliberate voice, real content, committed design decisions. Several training-data reflexes to address.

**LLM assessment**: Google-adjacent aesthetic (blue accent, white surfaces, Roboto) is functionally appropriate but risks reading as a GCP documentation subdomain rather than an independent product.

**Deterministic scan**: Detector entrypoint not found — no automated findings.

**Visual overlays**: Not attempted — no browser automation available.

### Violations of Absolute Bans

**Side-stripe borders** (3 instances):
1. `.callout` — `border-left: 3px solid` with background tint (src/styles/global.css)
2. `.prose-site blockquote` — `border-left: 3px solid` with asymmetric border-radius (src/styles/global.css)
3. `.field-callout` — `border-left: 3px solid` (src/components/HomepageVariationFieldManual.astro)

---

## Overall Impression

Solid developer-tool website with real craft. The biggest opportunity is injecting more personality so LocalCloud feels like its own product rather than a polished GCP subdomain.

---

## What's Working

1. **The quickstart section is the best thing on the page.** Real terminal block with actual Docker command. Three-step numbered list alongside terminal. "Show, don't tell" done right.

2. **Service catalog organization.** 18 services grouped by category with clear icons, tags (Default-on/Opt-in, protocol, port), and descriptions. Implementation labels build credibility.

3. **Search with Cmd+K.** Pagefind integration with keyboard shortcut, debounced input, result click-to-close. Search hint text is thoughtful.

---

## Priority Issues

### [P1] The site lacks its own visual identity
Google-blue palette reads as derivative. Shift accent away from pure #1a73e8 toward a deeper indigo-blue or teal-shifted blue.

### [P1] IBM Plex Sans and IBM Plex Mono are reflex-reject fonts
Training-data default for developer tools. Browse for a replacement with "credible, professional, generous" in mind.

### [P2] Two parallel CSS naming systems (site- vs field-)
Global CSS uses site-* prefixes; homepage uses field-* prefixes. Consolidate into one system.

### [P2] The grid dot overlay on the body is decorative noise
Fixed grid of dots adds no information and competes for attention on the homepage.

### [P3] Hero illustration is complex but doesn't communicate clearly
Orbital composition is ambitious but "this runs on your laptop" gets lost. Simplify.

---

## Persona Red Flags

**Jordan (First-Timer)**: Long Docker command is intimidating. No visible trust signals above the fold. Hero illustration doesn't reinforce headline.

**Alex (Power User)**: No keyboard shortcuts beyond Cmd+K. Docs sidebar disappears under 980px. FAB feedback button can't be dismissed permanently.

**Casey (Mobile)**: Docker command requires horizontal scroll. Service catalog requires lots of scrolling — no filter. Docs mobile nav pills are small.

---

## Minor Observations

- `site-eyebrow__pulse` green dot implies live status that doesn't mean anything
- Footer uses 4 font families — consolidate
- Reveal animation stagger caps at 8 items
- 404 page design is nice
- PostHog tracking is thorough, no dark patterns
- `prefers-reduced-motion` respected

---

## Cognitive Load

**Score: 1 failure (low cognitive load)** — Docs sidebar has 18 items (chunked into 5 sections, acceptable for a docs site).

---

## Questions to Consider

1. What would a confident version of this look like?
2. Does the hero illustration earn its complexity?
3. What if the docs got the same design attention as the homepage?
