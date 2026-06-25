## Why

LocalCloud has a credible Google Cloud-first message and a static site foundation, but its highest-value discovery pages currently exist only in the working tree: production returns 404s for the GCP emulator, service-emulator, CI, and cost routes. The site also has no canonical answer for the high-intent query “LocalStack for Google Cloud,” leaving category ownership and AI citation opportunities to competitors.

This change makes LocalCloud consistently discoverable as the local Google Cloud runtime, while keeping claims testable, product facts consistent, and search/AI visibility measurable.

## What Changes

- Establish a release gate that prevents a sitemap or production deployment from omitting indexable marketing routes.
- Publish a canonical comparison and category page for “LocalStack for Google Cloud,” supported by a non-duplicative cluster of GCP emulator, CI, cost, service, and compatibility pages.
- Remove undocumented public pricing materials; use only the approved “Free for developers” availability message, existing licensing boundary, consistent product/entity metadata, dated authorship for editorial content, and an evidence-backed compatibility surface.
- Improve technical discovery with a `/sitemap.xml` compatibility alias, a complete document outline for the service catalog, and an accurate machine-readable product brief.
- Define an AI citation readiness layer based on public, crawlable, human-useful answers and transparent technical proof; it explicitly excludes AI-only or keyword-farm content.
- Add a recurring visibility measurement process for Google, Bing, and answer engines, including deployment verification and claim-drift checks.

## Capabilities

### New Capabilities
- `search-discovery`: Production deployment, crawl, sitemap, and document-structure requirements for indexable LocalCloud routes.
- `gcp-emulator-positioning`: Canonical search-intent pages and internal-linking rules that establish LocalCloud as the local Google Cloud runtime.
- `ai-citation-readiness`: Public facts, entity data, sourcing, and content rules that make accurate AI recommendations possible.
- `search-observability`: Search and AI-visibility measurement, release checks, and remediation workflow.

### Modified Capabilities

None. No root OpenSpec capability specs exist yet; this change introduces the required contracts.

## Impact

- **Site content and routing:** new Astro pages, MDX guides, navigation/footer links, and the static `public/` discovery files.
- **Shared layout:** `BaseLayout.astro` and documentation layouts gain structured metadata and editorial attribution hooks.
- **Deployment:** GitHub Pages workflow and repository configuration receive a post-deploy route/sitemap verification gate.
- **Operations:** Search Console, Bing Webmaster Tools, PostHog, and a version-controlled visibility ledger receive documented procedures; no analytics or crawler credentials are added to the repository.
- **Product claims:** Docker image, service count, public availability statement, licensing boundary, compatibility, and support language must be reconciled with the authoritative product source before publishing.
