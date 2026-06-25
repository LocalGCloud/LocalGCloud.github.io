## ADDED Requirements

### Requirement: Verified product facts source
The site SHALL maintain one typed product-facts source for the Docker image, supported-service count, approved public availability statement, licensing boundary, official URLs, product category, supported environments, and evidence review date. Public product, comparison, schema, and machine-readable outputs SHALL derive from or be validated against that source. The source SHALL NOT contain price, enterprise-term, or sales-contact data.

#### Scenario: A material fact changes
- **WHEN** an approved Docker image, public availability statement, license boundary, or service count changes
- **THEN** a maintainer updates the product-facts source and the affected human-readable pages, schema, and `llms.txt` remain consistent after the build.

#### Scenario: A claim lacks evidence
- **WHEN** a proposed public claim has no approved source or evidence review date
- **THEN** it is not published as a current product fact and is either removed, marked planned, or escalated for review.

### Requirement: Consistent entity and editorial metadata
The shared layout SHALL emit valid Organization metadata for the site and page-specific structured data only when it matches visible content. The product/category hub SHALL emit `SoftwareApplication` data; editorial guides SHALL show an author and last-updated date and emit Article metadata; hierarchical pages SHALL emit breadcrumb data.

#### Scenario: Product hub renders structured facts
- **WHEN** a crawler renders the GCP emulator or comparison hub
- **THEN** it receives non-duplicated Organization and SoftwareApplication JSON-LD with the approved name, URL, description, application category, license information, and official profiles.

#### Scenario: A guide shows provenance
- **WHEN** a visitor opens a comparison, compatibility, or implementation guide
- **THEN** the page visibly identifies its author or reviewer, its last material update date, and the evidence source for quantitative compatibility claims.

### Requirement: Human-first machine-readable resources
The site SHALL provide a human-readable `/compatibility/` route and maintain `public/llms.txt` as a supplementary product brief. The site SHALL NOT publish `/pricing/` or `public/pricing.md`. `llms.txt` SHALL link to the existing licensing documentation and SHALL not contain price, enterprise-term, or sales-contact information.

#### Scenario: An agent or developer needs public availability information
- **WHEN** a request reaches `llms.txt` or the licensing documentation linked from it
- **THEN** the response communicates only the approved “Free for developers” availability statement and existing licensing boundary without publishing commercial terms.

#### Scenario: An agent or developer needs product limits
- **WHEN** a request reaches `/compatibility/` or the compatibility link in `llms.txt`
- **THEN** the response clearly distinguishes supported, partial, planned, and unsupported behavior with links to evidence.

### Requirement: AI crawler policy remains intentional
The site SHALL allow or disallow answer-engine crawlers through an explicit reviewed `robots.txt` policy. The policy review SHALL document the business intent and confirm that the allowed bots are not accidentally overridden by broader rules.

#### Scenario: Robots policy is checked in release verification
- **WHEN** the SEO verifier runs
- **THEN** it reports the effective `robots.txt` policy for the configured answer-engine crawler list and fails if an intended allowed crawler is blocked.
