# SEO and AI Visibility Operations

## Ownership and release boundary

| Area | Repository-controlled action | External owner/action |
|---|---|---|
| Static build | `pnpm build` emits every priority route, a sitemap index, and `/sitemap.xml`; local verification fails on missing metadata, H1s, schema, or sitemap entries. | None. |
| Cloudflare Workers | `.github/workflows/deploy.yml` audits, builds, and deploys the committed repository; `wrangler.jsonc` serves `dist` and the analytics proxy. | Confirm that the `localcloud-site` Worker owns the `local.cloud` and `www.local.cloud` custom domains in the intended Cloudflare account. |
| Live route check | Set the `SEO_VERIFY_BASE_URL` repository variable to enable the post-deploy route verifier. | Set it to `https://local.cloud` only after the custom domain serves the expected Cloudflare Worker deployment. |
| Search indexing | No credentials are stored in this repository. | Verify the domain in Google Search Console and Bing Webmaster Tools, submit `https://local.cloud/sitemap-index.xml`, and inspect the priority URLs after release. |
| Analytics | Existing PostHog page and copy events remain active. | Create saved segments for organic and answer-engine referrals; grant a reviewer read-only access if reporting is delegated. |

## Priority release checklist

Use the Node and pnpm versions pinned in `package.json` (Node 24.21.0 and pnpm 12.9.1).

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm run test:dependencies`, `pnpm run build:cloudflare`, and the installer, performance, analytics, and live-SEO regression suites.
3. Review the intended change files, then commit and push them through the configured Cloudflare Workers workflow.
4. Confirm the production verifier reports HTTP 200, the expected canonical URL, and no 404 content for each priority route.
5. Confirm `https://local.cloud/sitemap-index.xml` and `https://local.cloud/sitemap.xml` both return valid XML.
6. Submit the sitemap index to Google and Bing; use URL inspection for the comparison, GCP-emulator, compatibility, CI, and service-emulator routes.
7. Copy the baseline template before measuring rankings or citations. Indexing and ranking are external outcomes, not deployment pass conditions.

## Refreshing the Google Search icon

The homepage declares `/favicon.png` (96×96), exported from `public/favicon.svg`, and `/apple-touch-icon.png` (180×180), exported from `public/brand/localcloud-app-icon.svg`. Keep these raster exports in sync when changing the brand. Google’s [favicon guidelines](https://developers.google.com/search/docs/appearance/favicon-in-search) list supported raster formats, require a square icon, and recommend a stable URL. `/favicon.ico` redirects to the PNG.

After deploying, confirm that the homepage links to the new icon and the PNG returns HTTP 200. In the `local.cloud` Google Search Console property, inspect `https://local.cloud/`, test the live URL, and request indexing once. Google must recrawl and process the homepage and favicon; this can take several days to several weeks. A Cloudflare cache purge or repeated indexing requests does not force Google’s favicon cache to refresh.

## Monthly review

- Check the live sitemap, `robots.txt`, route verifier, and build checks.
- Review Search Console and Bing index state, impressions, clicks, and average position for the approved query set.
- Run the answer-engine prompts in `answer-engine-query-set.md` and record recommendations, citations, and factual errors in the ledger.
- For agentic-economy launch reviews, also run `agentic-ai-citation-prompts.md` and record results in `agentic-economy-ledger-template.csv`.
- Check `src/data/productFacts.ts` evidence review dates and correct material claim drift before changing marketing copy.
- Prioritize real evidence, useful documentation, and high-quality third-party references; do not create AI-only copy, fake reviews, or synthetic community mentions.

## Current external inputs needed

- Confirmation that the current Docker image, service-count wording, and public licensing boundary in `src/data/productFacts.ts` are authoritative.
- Confirmation of the Cloudflare Worker custom-domain routing and permission to set `SEO_VERIFY_BASE_URL` as a repository variable.
- Access or an owner for Google Search Console, Bing Webmaster Tools, and PostHog reporting.

## Agent page map

This map used to render on `/agents/`. It is guidance for writers, so it lives here. Each job has one canonical page family; add a page only when its content materially differs from the existing ones.

| Reader job | Canonical route | Audience | Avoid |
|---|---|---|---|
| Give a specific coding agent a safe Google Cloud sandbox | `/agents/` | Developers using Claude Code, Codex-style CLIs, Cursor, or Gemini CLI | One page per prompt; duplicating `/ai/` |
| Test one service locally with SDKs and environment variables | The "Use with an AI agent" section of `/services/{service}/` | Agents and maintainers validating BigQuery, Pub/Sub, Spanner, Cloud Storage, or Bigtable code | Splitting by language before the examples differ; claiming production parity |
| Set up a repeatable local workflow for Terraform, integration tests, or internal CI (the Public Preview License permits non-production internal CI) | `/workflows/{workflow}/` | Platform, DevOps, and test owners | One page per CI vendor before the snippets diverge; implying real Google Cloud validation is optional |
| Compare LocalCloud with another local or hosted sandbox | `/compare/{alternative}/` | Developers choosing between Google emulators, hosted code sandboxes, and BigQuery emulators | Attack pages; hiding where the alternative is better |
| Look up agentic local-cloud vocabulary | `/glossary/{term}/` | Searchers, agents, and docs readers | Near-synonym pages with the same definition; turning entries into landing pages |
| Follow a narrative demo or launch explanation | `/blog/{post}/` | Developers evaluating agent workflows | Posts without commands, caveats, and next steps; repeating service pages without a story |
