# Cloudflare deployment

The site publishes Astro's static `dist/` output and the analytics proxy in `worker/index.mjs` to the Cloudflare Worker `localcloud-site`. Configuration lives in `wrangler.jsonc`; no Astro SSR adapter is required. Every request runs through the Worker first except fingerprinted bundles (`/_astro/*`, `/pagefind/*`) and images (`/icons/*`, `/illustrations/*`), which stay asset-only. The Worker proxies `/ingest`, serves HTML with build-time Brotli or streaming gzip, turns trailing-slash `307` redirects into `301`, returns a real `404` for `/404`, and sends `X-Robots-Tag: noindex` on every host except `local.cloud`.

## Automatic deployment

`.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch. It installs the locked dependencies, audits production dependencies, runs the complete site build, installer, analytics proxy, page performance, byte budget, workerd runtime and live SEO regression tests, deploys with Wrangler, and checks the resulting `workers.dev` URL. A separate job then checks `https://local.cloud` (or the `SEO_VERIFY_BASE_URL` repository variable) on every deploy: priority routes, robots.txt, sitemap URLs, redirects, 404s, encodings, charsets and host indexing.

The deploy job checks out the full git history, because sitemap `lastmod` dates come from commit dates (`src/utils/page-dates.mjs`). Around the deploy, `scripts/sitemap-guard.mjs` protects and announces URLs:

- **Before deploying (blocking):** it fetches the live `https://local.cloud/sitemap-0.xml` and fails if any listed URL is neither built in `dist/` nor a source in `public/_redirects`. Removing or renaming a page therefore needs a redirect in the same commit. If the live sitemap cannot be fetched, the step only warns.
- **After deploying (non-blocking):** it POSTs the URLs that are new or whose `lastmod` changed, compared with the sitemap saved before the deploy, to IndexNow (`https://api.indexnow.org/indexnow`). The IndexNow key is `adc621f44f079b05ec91fa754dd7ca07`, hosted at `https://local.cloud/adc621f44f079b05ec91fa754dd7ca07.txt` from `public/adc621f44f079b05ec91fa754dd7ca07.txt`. The key is public by design; to rotate it, add a new key file, update `indexNowKey` in the script, and delete the old file after the next deploy. Preview a submission with `node scripts/sitemap-guard.mjs indexnow --dry-run`.

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

`public/.assetsignore` excludes OS/editor metadata, logs, environment files, local tool caches, design output, screenshots, research exports, historical summaries, and retired GitHub Pages metadata from Cloudflare uploads. Required public assets, the installer, LLM documents, crawler files, and generated page/search bundles remain included; Wrangler processes `_headers` separately as deployment configuration. HTML directory routes retain their trailing slashes, missing routes return HTTP 404, and HTML canonical URLs continue to point to `https://local.cloud`.

`.gitignore` keeps local proposal output, screenshots, image-generation prompts, the old HTML preview and prospect export, historical root update summaries, IDE state, and caches out of Git. Previously tracked copies are removed from the Git index while their disk copies remain available. These local artifacts are outside Astro's production inputs; deployments publish only `dist/`.

## Asset caching and browser security

`public/_headers` configures Cloudflare static asset responses. Fingerprinted `/_astro/` assets use a one-year immutable browser cache. A deploy keeps the previous deploy's `/_astro/` files for one more deploy: the build lists its own in `/asset-manifest.json`, and `node scripts/asset-manifest.mjs carry` (run by the workflow and `deploy:cloudflare` just before `wrangler deploy`) downloads the live manifest's files that the new build lacks. Mutable brand, icon and illustration paths use seven days; HTML, installers and agent text files use the same zero-age revalidation policy as Cloudflare's default. The Worker adds `no-transform` to HTML only, which prevents automatic beacon injection into CSP-protected pages while Cloudflare still compresses every other text file. Asset-specific rules remove that default cache header before setting their own lifetimes, avoiding conflicting `max-age` values. Version or rename mutable image paths when an update must reach returning visitors immediately.

The file also sets HSTS for this host (without `includeSubDomains` or preload), COOP, clickjacking protection, MIME sniffing protection and a referrer policy. Astro generates a per-page CSP with script and style hashes. `scripts/finalize-static-csp.mjs` minifies inline JavaScript, rebuilds its hashes from the final bytes, and adds integrity metadata to external local scripts. JSON-LD data and style hashes remain intact. The policy retains `strict-dynamic` for trusted script loading and permits the PostHog ingestion endpoints and the configured Cloudflare Web Analytics endpoint. `scripts/bundle-pagefind.mjs` creates a fingerprinted, integrity-protected search client that loads on demand, avoiding browser incompatibility with dynamic ES-module imports under a hash-based policy. `worker-src 'self'` permits Pagefind's worker; `wasm-unsafe-eval` supports its main-thread fallback without enabling JavaScript eval. The shared layout allows element-level presentation styles through the per-page CSP API for existing components and syntax highlighting. Trusted Types enforcement needs a separate migration for the site and its third-party HTML sinks.

Use `pnpm exec wrangler dev --port 8875` to validate these response headers locally. Astro preview alone does not apply `_headers`. After deployment, verify the same headers on `https://local.cloud` and run a fresh mobile PageSpeed analysis. The saved report is a historical snapshot.

## Cloudflare Web Analytics

The shared layout loads Cloudflare's beacon through a hashed inline bootstrap, so `strict-dynamic` authorizes it without allowing arbitrary inline scripts. Like the PostHog SDK, it loads after the load event, a 1.5-second delay and an idle callback, and not at all when the browser sends Global Privacy Control or Do Not Track or the visitor chose "Analytics: Off" in the footer. Every build with a token sends measurements to `https://cloudflareinsights.com/cdn-cgi/rum` and adds that origin to `connect-src`; `scripts/verify-page-performance.test.mjs` checks that the built policy allows it. The default Cloudflare build uses local.cloud's existing public Web Analytics site token. Set `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` to another 32-character hexadecimal site token, or set it to an empty value to disable the beacon. Static builds disable it by default; register the new hostname in Cloudflare Web Analytics and supply its manual-installation token to enable it on another host. A Cloudflare zone token must use the collection endpoint on its proxied hostname. This identifier is public and is not a Cloudflare API credential.

On HTML, `Cache-Control: public, max-age=0, must-revalidate, no-transform` prevents Cloudflare from injecting a second, untrusted copy after the build. The manually loaded beacon continues to send Web Analytics data. See Cloudflare's [manual setup and automatic injection guidance](https://developers.cloudflare.com/web-analytics/get-started/). Keep this header if automatic injection remains enabled in the zone, including when disabling the manual beacon. It also disables Cloudflare's automatic compression for HTML. The last build stage, `scripts/precompress-html.mjs`, writes a Brotli sidecar (`index.html.br`) next to every page; `worker/static-response.mjs` serves it to clients that accept Brotli (reading `cf.clientAcceptEncoding` when Cloudflare normalizes the header), falls back to streaming gzip, and otherwise sends identity bytes. Every variant decodes to the exact built bytes, CSP, status code and revalidation policy, with a weak ETag and `Vary: Accept-Encoding`. Sidecars are not public URLs. Partial (`206`) and already encoded responses pass through unchanged. `pnpm run test:worker` checks all of this in workerd. Fingerprinted fonts and scripts retain their existing asset caching and compression.

## Zone settings the site depends on

These settings live in the Cloudflare dashboard, not in this repository. Confirm them after any zone change:

- Brotli compression is on.
- Rocket Loader and Email Address Obfuscation are off; both rewrite HTML and break hash-based CSP.
- Browser Integrity Check is off. It returned error 1010 (HTTP 403) to Python's standard-library `urllib` on every page, which blocks AI agents that fetch docs with it. `scripts/verify-live-seo.mjs` fails the deploy check if `/llms.txt` or `/docs/` return anything but 200 to that client.
- AI Crawl Control and managed robots.txt are off, or match `public/robots.txt`.

## Analytics proxy

See [PostHog proxy](posthog-proxy.md) for routing, local verification and alternatives for GitHub Pages or a VM. Both the SDK and API requests use `/ingest`; a redirect to a PostHog domain would not provide first-party delivery. Static SDK responses retain upstream browser cache headers; configuration and API responses use `Cache-Control: no-store`. Static asset `_headers` rules do not apply to responses produced by Worker code.

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

For recovery, the existing GitHub Pages deployment remains available. Build with `pnpm run build:static` before publishing there: this uses direct PostHog ingestion by default because Pages cannot execute `/ingest`. Set `PUBLIC_POSTHOG_HOST` to use a separate proxy; the SDK and CSP update together. See [PostHog proxy](posthog-proxy.md). A rollback to Spaceship nameservers is only appropriate while the old DNS zone remains intact; check its records and DNSSEC configuration before reverting.
