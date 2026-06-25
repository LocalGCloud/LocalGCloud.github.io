## ADDED Requirements

### Requirement: Release route parity
The site SHALL define a single expected public-route manifest containing the homepage, documentation hub, service catalog, `gcp-emulator`, the service-emulator routes, `gcp-integration-testing`, `reduce-gcp-dev-costs`, `compatibility`, and `localstack-for-google-cloud` routes. The build and deployment verification SHALL use that manifest rather than independently maintained URL lists.

#### Scenario: Static build contains every acquisition route
- **WHEN** the site build completes
- **THEN** each route in the expected public-route manifest has an emitted HTML document with a page-specific title, meta description, self-canonical URL, and one visible H1.

#### Scenario: Live deployment serves the built routes
- **WHEN** GitHub Pages deployment completes
- **THEN** the verifier confirms each expected route returns HTTP 200 at `https://local.cloud`, resolves to its canonical URL, and does not render the 404 page.

### Requirement: Sitemap completeness and compatibility
The generated sitemap SHALL contain every expected public route exactly once. The site SHALL serve both `/sitemap-index.xml` and `/sitemap.xml`; `/sitemap.xml` SHALL contain the sitemap index or an equivalent valid sitemap document. `robots.txt` SHALL reference the canonical sitemap index.

#### Scenario: Sitemap represents the release
- **WHEN** the production verifier reads the sitemap index and all referenced sitemap files
- **THEN** every expected public route is present and no expected route is omitted.

#### Scenario: Sitemap compatibility path works
- **WHEN** a crawler requests `https://local.cloud/sitemap.xml`
- **THEN** it receives HTTP 200 with valid XML rather than a 404 response.

### Requirement: Crawlable document structure
Every indexable page SHALL have one visible H1 that describes its primary purpose. The service catalog SHALL expose a visible H1 before its filter and card controls. New acquisition pages SHALL use semantic `main`, section headings, descriptive links, and server-rendered content.

#### Scenario: Service catalog has a primary heading
- **WHEN** a visitor or crawler opens `/services/`
- **THEN** the document contains one visible H1 that identifies it as the LocalCloud GCP service catalog.

#### Scenario: Crawlers can access discovery surfaces
- **WHEN** a major search or answer-engine crawler requests an indexable route or `robots.txt`
- **THEN** the route is not blocked by a page-level `noindex` directive or a conflicting robots rule.
