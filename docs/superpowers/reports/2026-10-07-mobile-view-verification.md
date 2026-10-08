# Mobile View Verification

Date: October 7, 2026 (America/Los_Angeles).

Implemented the approved Mobile view in the existing website. Clean URLs select Mobile below 64rem and Desktop above it; explicit Mobile and Classic remain available. All views consume the existing route tree, service contract, guides and canonical URLs.

## Delivered behavior

- Mobile Home presents the product introduction, one horizontal row of all 25 available supported services, three persona links, and the complete existing lower content.
- The shared Home/Services/Docs/About dock, compact header/menu and search work across page families.
- Service links open their existing `#main-content` target. Additional overview information uses a native disclosure on mobile; deep links into it remain visible. Technical usage, opt-in guidance, boundaries, examples and FAQs remain below.
- Native Back restores the document reading position. A numeric, per-path session scroll cache restores the nested service strip when the browser does not retain it. Storage failures and corrupt numeric values are handled without blocking navigation.
- Shared URL helpers load first; Desktop window controls and Mobile presentation logic load only for the selected mode. Optional controller downloads have an eight-second deadline and readable Classic fallback.
- The existing mapped-script helper now minifies the four view modules before SRI/CSP and desktop content generation. Each mapped asset includes its public, readable source map and a digest of both code and map.

## Automated results

The commands use the pinned pnpm 12.9.1/Node 24.21.0 toolchain through its available Corepack entry point.

| Check | Result |
| --- | --- |
| Full `pnpm run build` | Passed: all 84 HTML routes, SEO/content/contract checks, Markdown, Pagefind, CSP and desktop payload generation |
| `pnpm run test:installer` | Passed |
| `pnpm run test:performance` | 132 passed, zero failures |
| `pnpm run test:analytics` | 26 passed, zero failures |
| `git diff --check` | Passed |
| `graft build` | Passed |

Regression coverage includes mode selection/overrides, URL/query/hash preservation, native view-choice links, automatic fallback, controller deadlines, cross-mode pending navigation/history/failure/prewarm cancellation, horizontal-only centering, numeric scroll restoration, fragment visibility, source maps/SRI/CSP, existing page content and every retained canonical/Markdown route.

## Browser evidence

Tested in the Codex in-app browser against the existing local preview at `http://127.0.0.1:4325/`.

- Home at 320×740, 375×812, 390×844, 430×932, 844×390 landscape, 768×1024 and explicitly selected Mobile at 1280×900. Every case had one H1, 25 strip entries, no horizontal page overflow and dock clearance.
- Automatic Home switched Mobile → Desktop → Mobile → Desktop while resizing 390 → 1280 → 390 → 1366 pixels; the page and headline remained usable.
- Mobile Cloud Storage/BigQuery flows, selecting Dataproc beyond the initially visible icons, native Back, Read guide, and current-fragment view-choice URLs were checked. Back retained the reading position and restored a far-scrolled strip rather than recentering it.
- Mobile Firestore, Cloud Run, Vertex AI, catalog, compatibility, docs, SDK examples, blog, pricing, About, privacy and 404 were checked at 390px. All had one H1 and page width equal to the viewport. Firestore remained supported; Vertex AI retained its Unsupported callout.
- Mobile documentation search returned results and opened BigQuery through native navigation.
- A direct `#typical-uses-title` link left the disclosure open and the target below the sticky header.
- Wide Classic retained its original headline and full lower sections. Wide Desktop retained its window presentation and ready state.

Screenshots:

- [Home, 390px](2026-10-07-mobile-view/home-390.png)
- [BigQuery, 390px](2026-10-07-mobile-view/bigquery-390.png)
- [Classic, 1280px](2026-10-07-mobile-view/classic-1280.png)
- [Desktop, 1280px](2026-10-07-mobile-view/desktop-1280.png)

## Size and scope

The Desktop startup ceiling remains 45,000 bytes. The measured aggregate maximum after module minification was 42,233 bytes. The Home/CSS guards separately bound the new Mobile markup and shared styles; the combined checkout also includes a separately owned My Cloud dialog with a fixed, conditional allowance. Base ceilings for other HTML remain unchanged.

One combined-worktree measurement: maximum raw HTML 215,742 bytes, gzip HTML 42,710 bytes, inline styles 102,174 bytes, static scripts 22,553 bytes. These are build byte counts, not field Core Web Vitals or production transfer timings.

Separately owned My Cloud, Home shortcut, social-card and quickstart changes appeared during implementation. They were preserved; browser checks and the full pipeline qualified the combined working checkout. They are not part of the mobile feature's ownership.

Physical iOS/Android/Safari, OS text-size settings and production deployment were not tested. JavaScript-disabled fallback and failed/stalled controllers were qualified through static HTML/source and executable harness checks; they were not browser-emulated. The Mobile presentation has no added animation and retains existing reduced-motion rules. No deployment, push or PR was performed.
