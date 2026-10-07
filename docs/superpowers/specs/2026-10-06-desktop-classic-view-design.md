# Desktop and Classic LocalCloud Views

## Goal

Add the approved personal-cloud desktop presentation while preserving every current website page, its complete content, and the existing Classic presentation as a selectable view.

## Approved visual references

- Homepage: /Users/jsenjaliya/.codex/generated_images/01a1145d-1f7a-7f50-9aae-ae81303cb7d2/exec-426d00d7-e0e9-4bf2-88dc-838900ea5821.png.
- Catalog: /Users/jsenjaliya/.codex/generated_images/01a1145d-1f7a-7f50-9aae-ae81303cb7d2/exec-e32b111b-addf-4bbc-8027-66f7e333e865.png.
- Service guide: /Users/jsenjaliya/.codex/generated_images/01a1145d-1f7a-7f50-9aae-ae81303cb7d2/exec-98eef1ad-a938-474d-9a7c-a0b72c70d86c.png.
- Compatibility: /Users/jsenjaliya/.codex/generated_images/01a1145d-1f7a-7f50-9aae-ae81303cb7d2/exec-4166359b-312a-4e40-9b9e-a39e65c0b693.png.
- The landscape is not an instruction to create or download artwork. Use an existing lightweight animated background.

## Preservation and architecture

1. Keep one route tree and one set of authored pages, data, guides, examples, search indexes, Markdown twins, and SEO metadata.
2. Integrate at BaseLayout.astro, shared by all page families. Classic renders the existing page without desktop-only style overrides.
3. Offer Desktop and Classic on every page. Plain URLs default to Desktop; only Classic uses ?view=classic. Old ?view=desktop links remain accepted and normalize to clean Desktop URLs. Do not use a saved Classic preference to change a clean URL. Switching retains route, other query values and fragment. Without JavaScript the complete Classic site remains usable.
4. Desktop uses a large central window on wide screens. Narrow screens retain the existing responsive navigation and reading flow.
5. Do not remove below-the-fold sections, service groups, examples, FAQs, legal copy, footer links, or compatibility boundaries.
6. Desktop navigation replaces only the center content and updates the actual page URL and metadata. Chrome, side icons, wallpaper and window controls remain mounted. Build-generated content uses the existing page tree; widget scripts initialize through guarded mount hooks. Previous pages appear as shallow, clickable title/summary previews behind it; keep six URLs and show two previews. No iframes.
7. Do not publish, deploy, push, or create a PR during this implementation.

## Design and interactions

- Warm muted window #e7e5dd; highlighted cards #ffffff; existing blue #1a73e8 and existing fonts.
- At the reference viewport the central window is approximately 78% wide, with readable side icons and an expand action for wide tables.
- Left shortcuts: Services, AI Agents, Docs, Pricing. No README.
- Right shortcuts: Console demo, Examples, Quickstart, Changelog, My cloud.
- Console demo opens the existing immersive demonstration, clearly identified as a demo.
- My cloud reuses the existing solid app icon and opens http://localhost:5380 in a new browser tab with noopener/noreferrer. Never probe or automatically launch a runtime.
- Top navigation includes Home, Explore, Docs, Help, search and Get started. Classic view appears only in the bottom bar.
- The main position and dimensions remain identical across routes. Support minimize/restore, expand/restore and returning to the previous page. Keep essential actions keyboard accessible; remove dragging, resizing and independent content windows.
- Internal links, search results and keyboard shortcuts use clean Desktop URLs; Classic HTML and dynamic search links retain ?view=classic. Preserve section fragments and other query values. Normal browser Back/Forward, reload and copied URLs use the actual page route.
- The approved compact centered homepage uses Start free as the install shelf label, with Explore the services on the right. Remove the service-count sentence from the Desktop introduction and use the requested OSS proof line with a link to its terms. Keep the three existing persona icons and all Classic copy/artwork.
- Desktop Home ends at the three personas. The hero fills the center pane, artwork uses remaining flex space with object-fit:contain, and the persona row stays at the bottom as the viewport resizes. Verified from 1024×720 through 1920×1080; short viewports may scroll rather than compressing content unreadably. Keep all lower Home sections and the full footer in Classic/mobile.
- Bind controls before optional styles resolve; Close/Back use the same content navigation as links. Closing the only page hides it without reloading Home. Browser Back/Forward restores the center's reading position, including hash routes.
- Warm at most three build-generated route payloads on hover/focus; cache at most six. Skip Save-Data/2G. Styles and scripts retain immutable same-origin URLs and SRI; no eval, iframe, or CSP exception. Payloads reuse the existing previous-deployment asset carry. Native navigation remains the failure fallback and the Classic/mobile behavior.
- Keep complete static HTML, crawlable anchor URLs, canonical/noindex boundaries, social metadata, JSON-LD, sitemap, Pagefind and Markdown negotiation. Content swaps update title, canonical, metadata, JSON-LD and Markdown discovery. Internal routing assets are noindex.
- Animate wallpaper with transform rather than background-position. Preserve colors, reduced motion and clipped viewport coverage; add no animation engine.
- Validate history URLs as same-origin HTML and render stored titles/summaries with textContent. External links, downloads, raw Markdown/text, modifier-clicks and My cloud retain native browser behavior.
- Every content page has a generated Markdown twin and a `.md` action. Exclude the 404 error page and preserve curated `/ai/*.md` resources. Keep the existing bounded technical `llms-full.txt` corpus.
- Use a folder for Services, a notebook for Docs and a matching robot/tag for AI/Pricing. Retain the Console demo terminal, solid My cloud icon and Changelog document.
- Use an existing background preset; no custom artwork or animation engine. Finisher Subtle is the suggested preference; CSS Gradient Animator is the dependency-free fallback. Respect reduced motion.
- Preserve search, copy feedback, privacy controls, analytics choices, and direct links. Exclude desktop chrome from Pagefind and Markdown content.

## Content authority

- ../localcloud/documentation.yaml, ../localcloud/localcloud.defaults.yaml, and committed guide/status documents consumed by scripts/sync-upstream-docs.mjs are canonical.
- Run node scripts/sync-upstream-docs.mjs followed by UPSTREAM_DOCS_STRICT=1 node scripts/verify-upstream-docs.mjs before content generation and after implementation.
- Leave unrelated upstream edits untouched. Use the existing contract, services data, editorial data and productFacts in both views.
- Supported/Unsupported only, without redundant Supported badges. Firestore remains supported and opt-in; Dataproc remains supported. Preserve all explicit boundaries.
- Mockup endpoint labels are not authoritative; use the contract and generated endpoint guidance.

## Acceptance

- Every pre-change built HTML route remains available with its canonical URL, one H1, anchors, original content, and Classic styling.
- View choice survives navigation and reload; explicit overrides, missing storage, and no JavaScript are handled.
- Desktop matches the approved frame, spacing, colors, shortcut arrangement, and hierarchy. All content remains reachable through scrolling.
- Center navigation, background history previews, search, copy, filtering, privacy/footer links, Markdown actions and My cloud destinations work.
- All 83 content pages provide Markdown; all 84 original HTML routes and canonical boundaries remain intact. Search cannot activate stale results while the visitor changes a query.
- Mobile navigation and reading remain usable; reduced motion stops decorative animation.
- Pass full build, installer suite, focused desktop tests, dependency audit, performance/analytics checks, strict upstream verification, git diff --check, and graft build.
- Capture browser evidence and save design-qa.md with final result: passed before handoff.
