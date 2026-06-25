## 1. Establish ownership, facts, and a release baseline

- [ ] 1.1 Confirm that `LocalStack-Google/localcloud-site` is the repository and GitHub Pages source serving `https://local.cloud`; record the repository, Pages branch/artifact setting, custom-domain setting, DNS owner, and rollback contact in `docs/operations/seo-ai-visibility.md`.
- [ ] 1.2 Resolve the canonical Docker image, official GitHub repository, service-count wording, approved “Free for developers” availability statement, and public licensing boundary with the responsible product owner; capture source links, reviewer, and review date in a new `src/data/productFacts.ts` module without adding enterprise or pricing facts.
- [ ] 1.3 Remove or correct any conflicting Docker, pricing, licensing, and service-count claims in the product-marketing context, public files, and page source; remove `public/pricing.md` and do not replace it with a public pricing route.
- [ ] 1.4 Reconcile the package-manager contract by adopting the workflow's pnpm toolchain, committing the matching lockfile, adding a `packageManager` field, and removing the obsolete lockfile only after a clean reproducible install succeeds.
- [ ] 1.5 Create `src/data/searchRoutes.ts` with the complete expected public-route manifest, including the homepage, docs hub, service catalog, all priority emulator pages, CI, cost, compatibility, and LocalStack-for-Google-Cloud routes; it SHALL exclude pricing routes.
- [ ] 1.6 Create `docs/operations/seo-ai-visibility.md` with the deployment baseline (live route statuses, sitemap count, current index evidence, owners, review cadence, and the unresolved external dependencies from the design).

## 2. Make production and sitemap output match the source tree

- [ ] 2.1 Review `.github/workflows/deploy.yml`, GitHub Pages configuration, and `public/` domain files to identify why the live custom domain serves an older artifact; add `public/CNAME` only if the verified GitHub Pages configuration confirms `local.cloud` is the intended canonical domain.
- [ ] 2.2 Add `scripts/verify-static-seo.mjs` to read the generated `dist/` output and fail when any route from `src/data/searchRoutes.ts` lacks HTML, a non-empty title, description, self-canonical, or exactly one visible H1.
- [ ] 2.3 Add a generated `/sitemap.xml` compatibility output that mirrors the generated sitemap index, and update the build script so it runs after Astro's sitemap generation and before Pagefind.
- [ ] 2.4 Extend `scripts/verify-static-seo.mjs` to parse the sitemap index and referenced sitemap files, asserting that every expected public route appears exactly once and that `robots.txt` references the canonical sitemap index.
- [ ] 2.5 Add `scripts/verify-live-seo.mjs` with a configurable base URL, bounded retry/backoff behavior, and failure-focused output for HTTP status, final URL, canonical, 404-page detection, sitemap membership, and robots policy.
- [ ] 2.6 Update `.github/workflows/deploy.yml` to run the static verifier before artifact upload and the live verifier after Pages deployment; make the live verifier test `https://local.cloud` only after the custom-domain mapping is confirmed.
- [ ] 2.7 Deploy the currently built priority routes in a reviewed commit that contains all required untracked source files, then retain the prior successful deployment reference for rollback.
- [ ] 2.8 Confirm in production that `/gcp-emulator/`, all priority service-emulator pages, `/gcp-integration-testing/`, `/reduce-gcp-dev-costs/`, `/compatibility/`, `/localstack-for-google-cloud/`, `/sitemap-index.xml`, and `/sitemap.xml` return expected responses; confirm `/pricing/` and `/pricing.md` are not promoted or linked.

## 3. Establish the canonical acquisition information architecture

- [ ] 3.1 Create `src/data/searchIntents.ts` mapping each priority intent to one canonical URL, user job, supporting evidence, required internal links, and conversion CTA; reject pages that duplicate an existing intent without material new value.
- [ ] 3.2 Create `src/pages/localstack-for-google-cloud.astro` with a direct non-affiliated answer, a fair LocalStack/LocalCloud/official-emulator comparison, verified capability references, clear development-only limitations, quick start, FAQs, and contextual links to the category, compatibility, licensing documentation, and CI pages.
- [ ] 3.3 Review and revise `src/pages/gcp-emulator.astro` as the category hub for “run Google Cloud locally” and “local GCP emulator,” without making it a duplicate of the LocalStack comparison page.
- [ ] 3.4 Ship and validate the existing service-emulator pages under `src/pages/*-emulator.astro`, ensuring each owns a service-specific intent, uses only approved facts, and links back to `/gcp-emulator/`, `/compatibility/`, and the relevant service detail page.
- [ ] 3.5 Review `src/pages/gcp-integration-testing.astro` and `src/pages/reduce-gcp-dev-costs.astro` for distinct CI and cost-intent content, with reproducible examples or clearly labelled assumptions for every quantitative claim.
- [ ] 3.6 Remove `public/pricing.md`, omit `src/pages/pricing.astro`, and ensure the public site communicates only “Free for developers” plus the existing licensing boundary without enterprise terms, prices, or sales contact details.
- [ ] 3.7 Create a human-readable `src/pages/compatibility.astro` that summarizes supported, partial, planned, and unsupported service behavior and links to the detailed evidence pages.
- [ ] 3.8 Add the priority acquisition pages to `src/components/Header.astro`, `src/components/Footer.astro`, relevant homepage sections, docs navigation, and contextual body links without adding repetitive site-wide keyword anchors.
- [ ] 3.9 Add a visible H1 and introductory category summary to `src/pages/services/index.astro`, preserving the existing filter and service-card behavior.

## 4. Centralize entity, editorial, and machine-readable content

- [ ] 4.1 Define typed product-fact and evidence interfaces in `src/data/productFacts.ts`, including source URL/reference, reviewer, review date, status (`supported`, `partial`, `planned`, `unsupported`), and a guard against publishing unreviewed current claims or prohibited enterprise/pricing facts.
- [ ] 4.2 Add a shared metadata/schema contract to `src/layouts/BaseLayout.astro`, including a named head slot or typed schema prop, so JSON-LD is rendered in the document head and cannot be silently duplicated.
- [ ] 4.3 Render approved Organization metadata site-wide and SoftwareApplication metadata only on the product/category hubs, using canonical name, URL, logo, official profiles, Docker/install reference, category, and license information from `productFacts`.
- [ ] 4.4 Extend `src/layouts/DocsLayout.astro` and relevant MDX frontmatter with visible author/reviewer, published date, last material update, and evidence-review date fields; emit Article and Breadcrumb JSON-LD only when the visible content supplies those values.
- [ ] 4.5 Move or adapt existing page-level JSON-LD so FAQ, Breadcrumb, and product schema exactly match visible content and render through the shared head contract; remove duplicate or stale scripts.
- [ ] 4.6 Remove `public/pricing.md` and update `public/llms.txt` from or against `productFacts`; link it to the existing licensing docs, `/compatibility/`, the comparison hub, and docs without publishing commercial terms.
- [ ] 4.7 Add a machine-readable validation script that fails the build when `llms.txt`, schema values, and their corresponding human pages disagree on a material approved fact or contain prohibited pricing/enterprise terms.
- [ ] 4.8 Review `public/robots.txt` for an explicit documented answer-engine crawler policy and add that policy to the static and live verifier without representing crawler allowance as a ranking guarantee.

## 5. Publish evidence that earns trust and citations

- [ ] 5.1 Define the compatibility evidence model for `/compatibility/`: test/environment version, source repository or test suite, tested date, service, capability, status, known limitation, workaround, and deep-link target.
- [ ] 5.2 Populate the first compatibility release only with independently reproducible or reviewed service evidence; mark unverified information planned or omit it rather than extrapolating from marketing copy.
- [ ] 5.3 Add author/reviewer attribution, material update dates, methodology, and evidence links to the comparison, compatibility, BigQuery coverage, and service-feature pages.
- [ ] 5.4 Create an original technical asset with demonstrable value, such as a repeatable local-GCP CI benchmark or emulator compatibility report, and publish its method, environment, source, limitations, and raw/derived results.
- [ ] 5.5 Align the official GitHub README, Docker Hub description, release notes, and approved product facts with the same Google Cloud-first category message and canonical website links; do not create synthetic reviews, forum posts, or encyclopedia entries.

## 6. Instrument discovery and answer-engine outcomes

- [ ] 6.1 Add `docs/operations/seo-ai-visibility-template.csv` with query, intent, canonical URL, Google/Bing index state, impressions, clicks, position, answer-engine, recommendation status, cited URL, cited competitor, factual-accuracy status, owner, and review date columns.
- [ ] 6.2 Create `docs/operations/answer-engine-query-set.md` with the approved recurring prompts, including “localstack for google cloud,” “localstack alternative for gcp,” “run google cloud locally,” “gcp emulator docker,” “local gcp integration testing,” and service-specific evaluation queries.
- [ ] 6.3 Verify the domain in Google Search Console and Bing Webmaster Tools, submit the canonical sitemap index, inspect every new priority URL, and record the results in the visibility ledger.
- [ ] 6.4 Use existing PostHog page and copy events to define organic and answer-engine referral segments; add only the minimum new events needed to distinguish quick-start, comparison, compatibility, and documentation conversion paths.
- [ ] 6.5 Establish a monthly review meeting/process that checks live route health, sitemap/robots policy, fact-review dates, Search Console, Bing, PostHog referrals, and all answer-engine prompts; open remediation items for controllable defects.

## 7. Validate, release, and evaluate without ranking promises

- [ ] 7.1 Run the reproducible package-manager install, static SEO verifier, content-fact verifier, and production build; fix all failures before requesting a deployment review.
- [ ] 7.2 Run a rendered-page/schema validation against the homepage, GCP emulator, LocalStack-for-Google-Cloud, compatibility, service catalog, and one service page; confirm JSON-LD, visible claims, canonical URLs, and H1s agree.
- [ ] 7.3 Run accessibility and responsive checks on every new or materially changed page, including headings, link names, comparison tables, tables on narrow viewports, and keyboard operation of the service catalog.
- [ ] 7.4 Run a mobile and desktop PageSpeed/Lighthouse audit on the deployed homepage and priority hubs; log scores and concrete regressions, but do not block on arbitrary score targets unrelated to user experience.
- [ ] 7.5 After deployment, run the live verifier, submit/inspect URLs, capture the baseline ledger, and wait for external indexing data before judging ranking performance.
- [ ] 7.6 At 30, 60, and 90 days, compare priority-query visibility, citations, referral conversions, and factual accuracy against the baseline; prioritize evidence/content/link improvements only where the data identifies a gap.
- [ ] 7.7 Validate the OpenSpec change with `openspec validate seo-ai-visibility --strict` and retain the completed artifacts as the implementation contract before beginning code changes.
