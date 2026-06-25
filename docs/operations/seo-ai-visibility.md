# SEO and AI Visibility Operations

## Ownership and release boundary

| Area | Repository-controlled action | External owner/action |
|---|---|---|
| Static build | `pnpm build` emits every priority route, a sitemap index, and `/sitemap.xml`; local verification fails on missing metadata, H1s, schema, or sitemap entries. | None. |
| GitHub Pages | `.github/workflows/deploy.yml` builds from the committed repository artifact. | Confirm that `LocalStack-Google/localcloud-site` is the Pages source for `local.cloud`, and that the custom-domain/DNS configuration points to it. |
| Live route check | Set the `SEO_VERIFY_BASE_URL` repository variable to enable the post-deploy route verifier. | Set it to `https://local.cloud` only after the custom domain serves the expected GitHub Pages artifact. |
| Search indexing | No credentials are stored in this repository. | Verify the domain in Google Search Console and Bing Webmaster Tools, submit `https://local.cloud/sitemap-index.xml`, and inspect the priority URLs after release. |
| Analytics | Existing PostHog page and copy events remain active. | Create saved segments for organic and answer-engine referrals; grant a reviewer read-only access if reporting is delegated. |

## Priority release checklist

1. Run `corepack pnpm@10.28.0 install --frozen-lockfile`.
2. Run `corepack pnpm@10.28.0 build`.
3. Review only the intended SEO change files, then commit and push them through the configured Pages workflow.
4. Confirm the production verifier reports HTTP 200, the expected canonical URL, and no 404 content for each priority route.
5. Confirm `https://local.cloud/sitemap-index.xml` and `https://local.cloud/sitemap.xml` both return valid XML.
6. Submit the sitemap index to Google and Bing; use URL inspection for the comparison, GCP-emulator, compatibility, CI, and service-emulator routes.
7. Copy the baseline template before measuring rankings or citations. Indexing and ranking are external outcomes, not deployment pass conditions.

## Monthly review

- Check the live sitemap, `robots.txt`, route verifier, and build checks.
- Review Search Console and Bing index state, impressions, clicks, and average position for the approved query set.
- Run the answer-engine prompts in `answer-engine-query-set.md` and record recommendations, citations, and factual errors in the ledger.
- Check `src/data/productFacts.ts` evidence review dates and correct material claim drift before changing marketing copy.
- Prioritize real evidence, useful documentation, and high-quality third-party references; do not create AI-only copy, fake reviews, or synthetic community mentions.

## Current external inputs needed

- Confirmation that the current Docker image, service-count wording, and public licensing boundary in `src/data/productFacts.ts` are authoritative.
- Confirmation of the GitHub Pages custom-domain source and permission to set `SEO_VERIFY_BASE_URL` as a repository variable.
- Access or an owner for Google Search Console, Bing Webmaster Tools, and PostHog reporting.
