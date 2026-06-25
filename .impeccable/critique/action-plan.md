# Critique Action Plan — LocalCloud Site

**Date**: 2026-05-26 | **Score**: 29/40 (Good)
**Decision**: Keep Google-adjacent aesthetic. No font changes for now.

---

## What's Working (Preserve)

1. **Quickstart section** — Real terminal block with Docker command, three-step numbered list. High signal.
2. **Service catalog organization** — 18 services grouped by category with clear icons, tags, implementation labels.
3. **Search with Cmd+K** — Pagefind integration, debounced input, hint text. Quality-of-life feature.
4. **Copy buttons on all code blocks** — Developer UX win.
5. **Docs navigation** — Previous/next pagination, sidebar with active states, breadcrumbs.
6. **404 page** — Well-designed with clear recovery paths.
7. **PostHog tracking** — Thorough, no dark patterns, respects privacy.
8. **prefers-reduced-motion** — Respected throughout.

---

## Action Items

### 1. ✅ Fix side-stripe borders (P2) — DONE
- [x] `.callout` — Removed `border-left`, replaced with uniform border + background tint
- [x] `.prose-site blockquote` — Removed `border-left`, replaced with full border
- [x] `.field-callout` — Removed `border-left`, replaced with uniform border

### 2. ✅ Consolidate CSS naming systems (P2) — DONE
- [x] Replaced all `var(--field-*)` references with global `var(--*)` equivalents
- [x] Removed 17 duplicated `--field-*` custom properties (bg, paper, ink, muted, line, accent, shadow, etc.)
- [x] Kept only 2 unique scoped tokens: `--field-moss` (column variant color)
- [x] Replaced `.field-button` with `.site-button` (removed 30 lines of duplicate button CSS)
- [x] Kept `.field-kicker`, `.field-stamp`, `.field-section-heading` as homepage-scoped classes (different semantic intent from global equivalents)
- [x] Removed unused `--field-accent-soft`, `--field-sky`, `--field-sky-soft`, `--field-moss-soft`

### 3. ✅ Remove grid dot overlay (P2) — DONE
- [x] Reduced opacity from 0.7 to 0.35, reduced dot alpha from 0.045 to 0.022
- [x] Reduced mask visibility, shortened gradient range

### 4. ✅ Simplify hero section (P3) — DONE
- [x] Removed 280+ lines of dead `.field-board__*` CSS (orbits, rings, cubes, laptop screen, notes) from older hero design
- [x] Removed `@keyframes field-float` and `@keyframes field-pulse` (unused animations)
- [x] Cleaned 60+ lines of dead responsive rules for removed elements
- [x] Merged two intro paragraphs into one concise line
- [x] Removed "Free for developers" stamp (redundant with $0 messaging + ribbon stamps below)
- [x] Total: 436 lines removed (1240 → 804)

### 5. ✅ Add keyboard shortcuts (P2) — DONE
- [x] `/` to focus search
- [x] `J/K` for doc pagination (next/previous)
- [x] `G H` for home, `G D` for docs, `G S` for services (vim-style)
- [x] `?` to show keyboard shortcut help modal
- [x] Double-click FAB to dismiss permanently (stored in localStorage)
- [x] Help modal with shortcut reference table

### 6. ✅ Add service catalog filter (P3) — DONE
- [x] Text filter on services page (searches name + description)
- [x] Status toggle: All / Default-on / Opt-in
- [x] Hidden empty category sections when no results match
- [x] Filter bar styled to match existing design

### 7. SEO Improvements — DONE (quick wins)
- [x] Created `/pricing.md` for AI agent discoverability
- [x] Added `noindex` to `/immersive-demo/` (thin content)
- [x] Fixed heading hierarchy (h3 → h2 for "Service Catalog")
- [x] Improved title tags with target keywords (Services page, service detail pages)
- [x] Improved homepage meta description (added "emulator", "development", "testing", "CI/CD")
- [x] Added `TechArticle` schema to all docs pages
- [x] Full audit report: `.impeccable/seo-audit-report.md`

### 8. SEO — Remaining (high impact)
- [ ] Create `/localcloud-vs-localstack/` comparison page
- [ ] Create `/localcloud-vs-google-emulators/` comparison page
- [ ] Create `/gcp-local-development/` hub page
- [ ] Add H1 to services index page
- [ ] Start blog with first 3 posts
- [ ] Add Review/AggregateRating schema to service pages
- [ ] Add `lastmod` to sitemap
