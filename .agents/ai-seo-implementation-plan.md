# AI SEO Implementation Plan — LocalCloud

Based on ChatGPT's comprehensive SEO/content review. Each section maps directly to findings in the review, with concrete implementation steps.

---

## Overview: Architecture Decisions

**Current site architecture:**
- Astro SSG with MDX docs pages (`src/pages/docs/*.mdx`)
- Homepage: `src/pages/index.astro` → `HomepageVariationFieldManual.astro`
- Dynamic service pages: `src/pages/services/[slug].astro` from `src/data/services.ts`
- Existing layouts: `BaseLayout.astro` (marketing pages), `DocsLayout.astro` (docs sidebar)
- Already has: `robots.txt`, `llms.txt`, `pricing.md`, Open Graph, JSON-LD schemas

**Key architectural decision for new landing pages:** We need to choose where new SEO landing pages live.

- **Option A: Under `/docs/` using `DocsLayout`** — Quickest to implement, gets sidebar nav. But these are marketing landing pages, not docs, and the docs sidebar is already crowded.
- **Option B: As top-level Astro pages (e.g., `src/pages/bigquery-emulator.astro`)** — Clean URLs, dedicated layouts, best for SEO. More work per page but correct architecture.
- **Option C: Under `/guides/` or similar new section** — Organizes them together, clear separation from docs.

**Recommendation:** **Option B** for flagship pages (BigQuery Emulator, GCP Emulator). **Option A** for comparison pages (extend existing comparison pattern). Create a dedicated `LandingLayout.astro` for SEO landing pages that's optimized for conversion, not documentation.

---

## Phase 1: Quick Wins (Day 1-2)

These are low-effort, high-impact changes to existing pages.

### 1.1 Homepage Metadata & Copy Refresh

**File:** `src/pages/index.astro`
**Changes:**
- Title: `LocalCloud — Google Cloud Platform in a box` → `LocalCloud — Local Google Cloud Emulator in Docker`
- Meta description: Update to include key service names

**File:** `src/layouts/BaseLayout.astro`
**Changes in default description:**
- Current: `'LocalCloud is a GCP emulator that runs 20+ Google Cloud services locally in one Docker container. Perfect for local development, testing, and CI/CD. Same SDKs, same APIs, zero code changes, no cloud costs. Free for developers.'`
- Better: Enrich with specific service names for better entity recognition by AI systems:
  ```
  'Run BigQuery, Pub/Sub, Firestore, Spanner, Bigtable, Cloud Storage, and 20+ GCP services locally in one Docker container. Use standard Google Cloud SDKs with zero code changes. Free for developers.'
  ```

### 1.2 Homepage Hero Copy Fixes

**File:** `src/components/HomepageVariationFieldManual.astro`

Changes needed:
1. **Headline** (lines ~44-47): 
   - Current: `"Google Cloud"` + `"In-a-Box."`
   - Change to: `"Run Google Cloud Locally"` + `"In One Docker Container."`
   
2. **"Free for Developers !"** (line ~87):
   - Current: `"Free for Developers !"`
   - Change to: `"Free for individual developers"`

3. **Subheadline** — Add a richer subheadline below the intro that names key services for SEO:
   ```html
   <p class="field-intro-secondary">
     LocalCloud gives you local BigQuery, Pub/Sub, Firestore, Spanner, Bigtable, Cloud Storage, and more — using standard GCP SDKs with no application code changes.
   </p>
   ```

### 1.3 Docs Page Metadata Audit

Audit all `.mdx` files in `src/pages/docs/` for:
- Unique `<title>` tags (currently via frontmatter `title`)
- Descriptive `description` frontmatter fields
- Pages currently missing description: check `architecture.mdx`, `console.mdx`, `licensing.mdx`, `privacy.mdx`, `sdk-examples.mdx`, `seed-data.mdx`, `services-overview.mdx`

**Action:** For each page, ensure description includes key search terms for that topic.

### 1.4 Copy Polish on Existing Pages

**File:** `src/pages/docs/localcloud-vs-google-emulators.mdx`

1. Line ~33 (Spanner row): `"More closer to Spanner production, compare to Spanner emulator"`
   → `"Closer to production Spanner behavior than the default in-memory emulator, with persistence for local testing."`

2. Add explicit `FAQPage` schema to this comparison page (high citation potential).

**File:** `src/pages/docs/faq.mdx`

1. BigQuery FAQ answer: `"There is no official BigQuery emulator from Google. so the BigQuery Emulator is built from scratch…"`
   → `"Because Google does not provide an official BigQuery emulator, LocalCloud includes a DuckDB-backed BigQuery emulator built for local development and CI testing."`

2. BigQuery coverage: `"some of the features that you only care on production…"`
   → `"Production-only concerns such as BQML, encryption, policy enforcement, and full geography parity are outside the emulator scope."`

### 1.5 Service Pages Metadata

**File:** `src/pages/services/[slug].astro`
- Currently: `<BaseLayout title={`${service.name} Local Emulator — LocalCloud`}>`
- Better title for BigQuery: `"BigQuery Emulator for Local Development — LocalCloud"` 
- Strategy: Use service-specific SEO title patterns. Add a `seoTitle` field to the `Service` type in `services.ts`.

**File:** `src/data/services.ts`
- Add optional `seoTitle` and `seoDescription` fields to the `Service` interface for override capability.

---

## Phase 2: SEO Landing Pages (Day 3-7)

Create these as top-level Astro pages with a new `LandingLayout.astro` optimized for conversion.

### 2.1 Create LandingLayout.astro

**New file:** `src/layouts/LandingLayout.astro`

A layout for SEO landing pages (not docs). Features:
- Full-width, no sidebar
- Hero section with H1, subheadline, CTA
- Content sections with clear H2/H3 hierarchy for extractability
- FAQ accordion section at the bottom (with FAQPage JSON-LD)
- Quick start / code snippet section
- Related pages cross-links
- Strong CTA at bottom
- Open Graph + Twitter meta
- BreadcrumbList schema

### 2.2 BigQuery Emulator Landing Page (Flagship)

**New file:** `src/pages/bigquery-emulator.astro`

**URL:** `/bigquery-emulator/`

**Target keywords:** `bigquery emulator`, `run bigquery locally`, `local bigquery`, `bigquery local development`, `bigquery docker emulator`

**Title:** `BigQuery Emulator for Local Development and CI Testing — LocalCloud`

**Meta description:** `Run BigQuery locally with LocalCloud's DuckDB-backed emulator. Test SQL, DDL, DML, scripting, REST APIs, and Storage API workflows without cloud cost. ~96% SQL coverage, 936 tests.`

**Page structure (40-60 word extractable blocks):**

```
1. HERO
   H1: "BigQuery Emulator for Local Development and CI Testing"
   Subheadline: "Run BigQuery locally with a DuckDB-backed emulator. Same SQL, same SDKs, same REST & gRPC APIs — zero cloud costs."
   CTA: "Start in 60 Seconds" / "See Feature Coverage"

2. THE PROBLEM (definition block)
   H2: "Why You Need a BigQuery Emulator"
   40-60 word answer: "Google does not provide an official BigQuery emulator. Teams either pay for real BigQuery queries during development — accumulating significant cloud costs — or skip local testing entirely, discovering schema and query issues only after deploying to production."

3. THE SOLUTION (definition block)
   H2: "How LocalCloud's BigQuery Emulator Works"
   40-60 word answer: "LocalCloud includes a DuckDB-backed BigQuery emulator that translates GoogleSQL to DuckDB's execution engine. It speaks the same REST and gRPC Storage APIs as production BigQuery, so your Python, Go, Java, and Node.js SDKs work without code changes."

4. QUICK START (code block)
   Docker command + env export + first query example

5. COVERAGE HIGHLIGHTS (statistics block)
   - ~96% SQL coverage across DQL/DDL/DML
   - 936 collected tests across 25 test modules
   - 200+ mapped BigQuery functions
   - 175+ mapped functions verified by tests
   - 11 INFORMATION_SCHEMA views
   - REST API + gRPC Storage API support

6. SQL CAPABILITIES (comparison table)
   Feature | Supported | Notes
   SELECT/JOIN/CTE/window | ✅ | Full support
   DDL/DML | ✅ | CREATE, INSERT, UPDATE, DELETE, MERGE
   Scripting/procedures | ✅ | Variables, control flow, transactions
   Pipe syntax | ✅ | Tested patterns execute locally
   External tables | ✅ | Parquet, CSV, JSON from local files
   BQML | ❌ | Cloud-only, outside emulator scope
   GEOGRAPHY | ⚠️ | 12 ST_* functions supported; full parity not claimed

7. SDK EXAMPLES (tabs: Python, Node.js, Go)
   Copy-paste code showing BigQuery query execution locally

8. CI/CD INTEGRATION
   GitHub Actions example with LocalCloud as a service container

9. LIMITATIONS (honesty block — builds trust)
   Clear list of what's NOT supported and why

10. FAQ (with FAQPage schema)
    - "Is there an official BigQuery emulator from Google?"
    - "How accurate is LocalCloud's BigQuery emulator?"
    - "Can I run BigQuery queries in CI/CD with LocalCloud?"
    - "What BigQuery features are not supported?"

11. CTA: "Start Testing BigQuery Locally"
    Link to docs, Docker pull command
```

### 2.3 GCP Emulator Landing Page

**New file:** `src/pages/gcp-emulator.astro`

**URL:** `/gcp-emulator/`

**Target keywords:** `gcp emulator`, `google cloud emulator`, `google cloud local emulator`, `local gcp development`

**Title:** `GCP Emulator — Run Google Cloud Services Locally in Docker`

**Meta description:** `Run 20+ Google Cloud services locally with LocalCloud's all-in-one GCP emulator. BigQuery, Pub/Sub, Firestore, Spanner, Bigtable, Cloud Storage, and more in a single Docker container.`

Page structure similar to BigQuery page but focused on the all-in-one story:
- Why individual GCP emulators aren't enough (only 3 services)
- How LocalCloud bundles 20+ into one container
- Service grid with status indicators
- Quick start
- Comparison: LocalCloud vs individual emulators vs real GCP dev projects
- Web console features
- FAQ

### 2.4 Pub/Sub Emulator Docker Page

**New file:** `src/pages/pubsub-emulator.astro`

**URL:** `/pubsub-emulator/`

**Target keywords:** `pubsub emulator docker`, `google pubsub emulator`, `run pubsub locally`, `pubsub local development`

**Title:** `Pub/Sub Emulator in Docker — Run Google Pub/Sub Locally`

**Meta description:** `Run Google Cloud Pub/Sub locally with LocalCloud's bundled emulator. Test topics, subscriptions, publishing, and streaming pull in Docker — zero cloud costs, zero code changes.`

### 2.5 Firestore Emulator Page

**New file:** `src/pages/firestore-emulator.astro`

**URL:** `/firestore-emulator/`

**Target keywords:** `firestore emulator docker`, `firestore local emulator`, `google firestore emulator`

### 2.6 Spanner Emulator Page

**New file:** `src/pages/spanner-emulator.astro`

**URL:** `/spanner-emulator/`

**Target keywords:** `spanner emulator`, `cloud spanner emulator docker`, `spanner local development`, `run spanner locally`

### 2.7 Bigtable Emulator Page

**New file:** `src/pages/bigtable-emulator.astro`

**URL:** `/bigtable-emulator/`

**Target keywords:** `bigtable emulator`, `cloud bigtable emulator docker`, `bigtable local development`

### 2.8 Cloud Storage Emulator Page

**New file:** `src/pages/cloud-storage-emulator.astro` (or add to existing services page optimization)

**URL:** `/cloud-storage-emulator/`

**Target keywords:** `google cloud storage emulator`, `gcs emulator docker`, `fake-gcs-server`, `cloud storage local`

---

## Phase 3: Comparison Pages (Day 5-10)

### 3.1 LocalCloud vs LocalStack

**New file:** `src/pages/docs/localcloud-vs-localstack.mdx`

**URL:** `/docs/localcloud-vs-localstack/`

**Key points:**
- LocalStack = AWS emulation; LocalCloud = GCP emulation
- Different cloud ecosystems, similar philosophy
- Feature-by-feature concept mapping (S3→GCS, DynamoDB→Firestore, etc.)
- If team uses GCP, LocalStack's AWS features don't help

### 3.2 LocalCloud vs Testcontainers

**New file:** `src/pages/docs/localcloud-vs-testcontainers.mdx`

**URL:** `/docs/localcloud-vs-testcontainers/`

**Key points:**
- Testcontainers manages Docker container lifecycle for tests
- LocalCloud provides the emulated services themselves
- They're complementary: use Testcontainers to manage LocalCloud in integration tests
- Testcontainers + individual emulators = fragmented; + LocalCloud = one container

### 3.3 LocalCloud vs Using a Shared GCP Dev Project

**New file:** `src/pages/docs/localcloud-vs-shared-gcp-dev.mdx`

**URL:** `/docs/localcloud-vs-shared-gcp-dev/`

**Key points:**
- Cost comparison (shared project racking up bills vs. zero local)
- Isolation (devs stepping on each other's resources)
- Onboarding speed (IAM + billing setup vs. docker run)
- Offline capability
- When shared dev projects still make sense (production-scale load testing)

### 3.4 Update Existing "LocalCloud vs Google Emulators"

**File:** `src/pages/docs/localcloud-vs-google-emulators.mdx`

**Existing, needs updates:**
- Fix copy issues noted in Phase 1
- Add more specific statistics (exact test numbers from BigQuery coverage)
- Add FAQPage schema
- Consider renaming slug to something more keyword-rich or keeping it

---

## Phase 4: Use-Case Pages (Day 7-14)

### 4.1 "Run GCP Integration Tests in CI/CD"

**New file:** `src/pages/gcp-integration-testing.astro` (or `/guides/gcp-integration-testing/`)

**URL:** `/gcp-integration-testing/`

**Target keywords:** `gcp integration tests`, `google cloud emulator ci`, `test gcp locally ci/cd`, `github actions gcp integration tests`

**Content:**
- The cost problem with cloud-dependent CI
- LocalCloud as CI service container
- GitHub Actions, GitLab CI, Jenkins examples
- Cost savings calculation
- Terraform validation in CI
- FAQ

### 4.2 "Reduce GCP Development Costs"

**New file:** `src/pages/reduce-gcp-dev-costs.astro`

**URL:** `/reduce-gcp-dev-costs/`

**Target keywords:** `reduce gcp development costs`, `gcp cost optimization`, `cloud development costs local`

**Content:**
- Where dev cloud costs come from (CI runs, sandbox projects, data egress, idle resources)
- How local emulation eliminates these
- ROI calculator / example savings
- Tiered approach: local → staging → production
- FAQ

### 4.3 "Local GCP Development Environment"

**New file:** `src/pages/local-gcp-development.astro`

**URL:** `/local-gcp-development/`

**Target keywords:** `local gcp development environment`, `gcp local development`, `develop google cloud locally`

### 4.4 "Developer Onboarding for GCP Teams"

**New file:** `src/pages/gcp-developer-onboarding.astro`

**URL:** `/gcp-developer-onboarding/`

**Target keywords:** `developer onboarding gcp`, `onboard gcp developers`, `gcp development environment setup`

### 4.5 "Offline Google Cloud Development"

**New file:** `src/pages/offline-gcp-development.astro`

**URL:** `/offline-gcp-development/`

**Target keywords:** `offline google cloud development`, `develop gcp without internet`, `google cloud offline`

---

## Phase 5: Homepage Restructuring (Day 10-14)

**File:** `src/components/HomepageVariationFieldManual.astro`

The current homepage jumps from hero → quick start → service catalog. Restructure for persuasion:

### Proposed new section order:

```
1. HERO (updated copy from Phase 1)
   H1: "Run Google Cloud Locally in One Docker Container"
   Subheadline with service names
   CTA: "Start in 60 seconds" + "View supported services"

2. PROBLEM SECTION (NEW)
   H2: "GCP local development is fragmented."
   - Individual emulators cover only 3 services
   - Real GCP dev projects are expensive and slow
   - CI/CD pipelines burn cloud budget
   - Onboarding takes days, not minutes
   Stats: "$100-500+/month per developer on non-production GCP usage"

3. SOLUTION SECTION (NEW)
   H2: "One runtime, one console, one SDK handoff."
   3-column grid:
   - 20+ services in one container
   - Same SDKs, zero code changes
   - Built-in web console for inspection

4. USE CASES (NEW — replaces current ribbon)
   H2: "Built for how GCP teams actually work."
   Icon + title cards for:
   - Local development (faster inner loop)
   - CI/CD integration testing (cut costs 70-90%)
   - BigQuery pipeline testing (finally test locally)
   - Developer onboarding (minutes, not days)
   - Terraform validation (safe plan/apply locally)
   - Offline development (code anywhere)

5. BIGQUERY PROOF BLOCK (NEW)
   H2: "The BigQuery emulator Google never built."
   Key stats: ~96% SQL coverage, 936 tests, 200+ mapped functions
   Link to dedicated BigQuery emulator page
   Trust signal: "Test-evidence-based coverage, not implementation assumptions"

6. QUICK START (existing, updated)
   Keep the terminal + steps section, it's strong

7. COMPARISON TABLE (NEW)
   H2: "How LocalCloud compares"
   Table: LocalCloud vs Google emulators vs Real GCP dev project
   Columns: Setup time, Services covered, BigQuery, Web console, CI/CD, Cost

8. SUPPORTED SERVICES GRID (existing, updated)
   Keep the service catalog section

9. COMMERCIAL / TEAM CTA (NEW)
   H2: "For teams and organizations"
   Link to pricing page and licensing FAQ
   "Contact us for team licensing, CI/CD usage, and enterprise support"

10. BOTTOM CTA (existing, keep)
```

---

## Phase 6: Blog/Content Roadmap (Ongoing)

Create a blog section. Options:
- Add to Astro as `src/pages/blog/` with MDX
- Use a separate blog platform and link

### Bottom-funnel posts:
1. "How to Run BigQuery Locally" — step-by-step tutorial
2. "How to Test GCP Applications Locally with Docker"
3. "How to Run Pub/Sub, Firestore, and BigQuery Together Locally"
4. "GCP Integration Testing in GitHub Actions" — CI/CD setup guide
5. "How to Reduce GCP Development Costs with Local Emulation"

### Comparison posts:
6. "LocalCloud vs Google Cloud Emulators" — expanded from current comparison page
7. "LocalCloud vs LocalStack for GCP Developers"
8. "BigQuery Emulator Options Compared"
9. "Should You Use a Shared GCP Dev Project or Local Emulators?"

### Technical authority posts:
10. "How LocalCloud Emulates BigQuery with DuckDB"
11. "What BigQuery Features Matter for Local Testing?"
12. "Why Cloud Emulators Are Hard" — engineering perspective
13. "Designing a Local Cloud Runtime for Developer Inner Loops"

---

## Phase 7: Technical SEO Verification

### 7.1 Verify existing technical SEO

- [x] `robots.txt` — Already properly configured, allows AI bots, blocks CCBot ✅
- [x] Sitemap — `@astrojs/sitemap` plugin generates `sitemap-index.xml` ✅
- [x] Canonical tags — Already in `BaseLayout.astro` ✅
- [x] Open Graph/Twitter — Already in `BaseLayout.astro` ✅
- [x] JSON-LD Organization schema on homepage ✅
- [x] JSON-LD FAQPage schema on FAQ page ✅
- [x] JSON-LD TechArticle on docs pages ✅
- [x] JSON-LD BreadcrumbList on service pages ✅
- [x] JSON-LD SoftwareApplication on service pages ✅

### 7.2 Items to verify/add

- [ ] **Verify sitemap includes all new pages** — `@astrojs/sitemap` auto-generates, but verify after adding new pages
- [ ] **Unique title + description on every page** — Audit all pages (Phase 1.3 work)
- [ ] **`llms.txt` update** — Add new landing pages to `public/llms.txt` after creation
- [ ] **`pricing.md` update** — Already exists at `public/pricing.md` ✅ but should be linked from homepage and llms.txt
- [ ] **FAQ schema on service pages** — Add `FAQPage` JSON-LD to key service landing pages (BigQuery, Pub/Sub, etc.)
- [ ] **Product schema** — Add `SoftwareApplication` schema to homepage and comparison pages
- [ ] **Code blocks server-rendered** — Shiki code highlighting in Astro config ✅ (already server-rendered)
- [ ] **Navigation is crawlable HTML** — All nav links are `<a>` tags in Astro components ✅
- [ ] **Service detail pages have indexable URLs** — Each at `/services/{slug}/` ✅

### 7.3 Crawl budget & indexing

- Ensure docs pages that should be indexed are not accidentally noindexed
- `licensing.mdx` and `privacy.mdx` could be noindex (low search value)
- Add self-referencing canonical to every new landing page

---

## Phase 8: Machine-Readable Files Enhancement

### 8.1 Update `llms.txt`

**File:** `public/llms.txt`

Add new landing pages and key comparison pages after creation. Current file is good but will need updating as new pages are added.

### 8.2 Update `pricing.md`

**File:** `public/pricing.md`

Current pricing page is good but has placeholder pricing. When actual pricing is decided, update this file. Ensure it's linked from:
- `llms.txt` ✅ (already linked)
- Homepage (planned in Phase 5)
- Footer
- `/docs/licensing/` page

### 8.3 Add `/llms-full.txt` (optional, future)

A longer version of `llms.txt` with more detailed page descriptions for AI context. Not critical now.

---

## Implementation Priority Matrix

| Priority | Task | Effort | Impact | Phase |
|----------|------|--------|--------|-------|
| 🔴 P0 | Homepage title + meta description | 10 min | High — immediate search visibility | Phase 1 |
| 🔴 P0 | Copy fixes on existing pages | 30 min | Medium — professionalism, snippet quality | Phase 1 |
| 🔴 P0 | BigQuery Emulator landing page | 3-4 hrs | **Very High** — flagship SEO asset | Phase 2 |
| 🔴 P0 | GCP Emulator landing page | 2-3 hrs | High — category-defining query | Phase 2 |
| 🟡 P1 | LandingLayout.astro | 1 hr | Foundation for all new pages | Phase 2 |
| 🟡 P1 | Homepage restructuring | 3-4 hrs | High — improves conversion + SEO | Phase 5 |
| 🟡 P1 | Comparison pages (LocalStack, Testcontainers) | 1-2 hrs each | Medium-High — commercial intent | Phase 3 |
| 🟡 P1 | Pub/Sub Emulator page | 1.5 hrs | Medium — specific search intent | Phase 2 |
| 🟢 P2 | Firestore, Spanner, Bigtable emulator pages | 1 hr each | Medium | Phase 2 |
| 🟢 P2 | Use-case pages (CI/CD, costs, onboarding) | 1-2 hrs each | Medium — top-of-funnel | Phase 4 |
| 🟢 P2 | Blog setup + first 3 posts | 4-6 hrs | Medium-Long term | Phase 6 |
| ⚪ P3 | Blog posts 4-13 | Ongoing | Long-term authority building | Phase 6 |
| ⚪ P3 | Technical SEO verification | 1 hr | Assurance | Phase 7 |

---

## Summary of File Changes

### New files to create:
```
src/layouts/LandingLayout.astro              # SEO landing page layout
src/pages/bigquery-emulator.astro            # Flagship SEO page
src/pages/gcp-emulator.astro                 # Category page
src/pages/pubsub-emulator.astro              # Service SEO page
src/pages/firestore-emulator.astro           # Service SEO page
src/pages/spanner-emulator.astro             # Service SEO page
src/pages/bigtable-emulator.astro            # Service SEO page
src/pages/cloud-storage-emulator.astro       # Service SEO page
src/pages/gcp-integration-testing.astro      # Use-case page
src/pages/reduce-gcp-dev-costs.astro         # Use-case page
src/pages/local-gcp-development.astro        # Use-case page
src/pages/gcp-developer-onboarding.astro     # Use-case page
src/pages/offline-gcp-development.astro      # Use-case page
src/pages/docs/localcloud-vs-localstack.mdx  # Comparison
src/pages/docs/localcloud-vs-testcontainers.mdx # Comparison
src/pages/docs/localcloud-vs-shared-gcp-dev.mdx  # Comparison
```

### Files to modify:
```
src/pages/index.astro                        # Title + description
src/components/HomepageVariationFieldManual.astro  # Copy fixes + restructuring
src/layouts/BaseLayout.astro                 # Default description
src/pages/docs/faq.mdx                       # Copy fixes
src/pages/docs/localcloud-vs-google-emulators.mdx  # Copy fixes + schema
src/pages/services/[slug].astro              # SEO titles
src/data/services.ts                         # Add seoTitle/seoDescription fields
public/llms.txt                              # Add new pages
```

---

## Measurement Plan

### Pre-launch baseline:
- Record current rankings for target keywords
- Check AI Overview presence for primary queries
- Record organic traffic baseline

### Post-launch tracking (monthly):
- Check Google AI Overviews, ChatGPT, Perplexity for:
  - "bigquery emulator"
  - "gcp emulator"
  - "run bigquery locally"
  - "google cloud emulator"
  - "pubsub emulator docker"
  - "localstack for google cloud"
- Track organic traffic to new landing pages (PostHog already configured)
- Monitor "Share of AI voice" via Otterly or manual checks

### Success criteria (6-month):
- BigQuery Emulator page ranking top 5 for "bigquery emulator"
- GCP Emulator page ranking top 10 for "gcp emulator"
- Brand cited in AI answers for at least 3 of top 10 target queries
- Organic traffic increase of 50%+ from baseline
