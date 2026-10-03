# Cloudflare deployment

The site publishes Astro's static `dist/` output to the Cloudflare Worker `localcloud-site`. Configuration lives in `wrangler.jsonc`; no Worker application code or SSR adapter is required.

## Automatic deployment

`.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch. It installs the locked dependencies, runs the complete site build, installer tests and live SEO regression tests, deploys with Wrangler, and checks all priority routes on the resulting `workers.dev` URL. If `SEO_VERIFY_BASE_URL` is set as a repository variable, a separate job also checks that URL after deployment.

GitHub Actions requires these repository secrets:

- `CLOUDFLARE_API_TOKEN`: the account-scoped Workers deployment credential.
- `CLOUDFLARE_ACCOUNT_ID`: the target Cloudflare account.

Credentials belong in GitHub Secrets or the local process environment, never in source files. Wrangler is pinned in `package.json` and the workflow.

The upstream verifier checks sibling repositories when they are present. GitHub Actions builds from the committed documentation snapshot because those siblings are not checked out. Before publishing a refreshed snapshot, run `node scripts/sync-upstream-docs.mjs` and `node scripts/verify-upstream-docs.mjs` locally and review the changes.

## Local deployment

With the two Cloudflare environment variables set:

```sh
pnpm install --frozen-lockfile
pnpm run deploy:cloudflare
SEO_VERIFY_BASE_URL=https://localcloud-site.localcloud-site.workers.dev node scripts/verify-live-seo.mjs
```

`public/.assetsignore` excludes Finder metadata and GitHub Pages metadata from Cloudflare uploads. HTML directory routes retain their trailing slashes, missing routes return HTTP 404, and HTML canonical URLs continue to point to `https://local.cloud`.

## Domain switch

The Cloudflare zone for `local.cloud` has these assigned nameservers:

- `hans.ns.cloudflare.com`
- `lana.ns.cloudflare.com`

Before changing nameservers at Spaceship, disable the previous DNSSEC configuration/remove its DS record. The previous DNSSEC chain must no longer be published before switching DNS providers. Existing Google site verification has been copied to Cloudflare.

Cloudflare Custom Domains connect `local.cloud` and `www.local.cloud` to the Worker. Zone redirect rules send `www` and plain HTTP traffic to the canonical `https://local.cloud` origin while preserving paths and query strings. Certificates are managed by Cloudflare. The zone must finish activation and certificate issuance before the custom domain is considered verified.

After the registrar changes propagate, confirm the authoritative nameservers, HTTPS certificate, redirects, installer, robots.txt, sitemap, raw agent documents, Pagefind assets and genuine 404 responses. Run:

```sh
SEO_VERIFY_BASE_URL=https://local.cloud node scripts/verify-live-seo.mjs
```

For recovery, the existing GitHub Pages deployment remains available. A rollback to Spaceship nameservers is only appropriate while the old DNS zone remains intact; check its records and DNSSEC configuration before reverting.
