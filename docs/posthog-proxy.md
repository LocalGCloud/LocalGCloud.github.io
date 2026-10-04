# PostHog proxy

The Astro build remains static. The Cloudflare profile uses `worker/index.mjs` to handle analytics requests under `/ingest` on the same origin and forward them to PostHog US. The browser loads the SDK from `/ingest/static/array.js`. The public project token, capture settings and `ui_host: 'https://us.posthog.com'` stay unchanged.

## Build-time hosting configuration

| Build command | Default PostHog host | Use |
| --- | --- | --- |
| `pnpm run build` or `pnpm run build:cloudflare` | `/ingest` | Cloudflare Worker and static assets |
| `pnpm run build:static` | `https://us.i.posthog.com` | GitHub Pages or a VM serving only static files |
| `PUBLIC_POSTHOG_HOST=https://e.local.cloud pnpm run build:static` | `https://e.local.cloud` | A separate first-party proxy |
| `PUBLIC_POSTHOG_HOST=/ingest pnpm run build:static` | `/ingest` | A VM with Nginx/Caddy providing that path |

`SITE_DEPLOYMENT_TARGET` accepts `cloudflare` (the default) or `static`. `PUBLIC_POSTHOG_HOST` overrides either profile; use a root-relative proxy path or an HTTPS URL. Both variables can also be set in `.env`/`.env.production` or CI; process environment values take precedence. Trailing slashes are normalized and invalid URLs fail the build. `src/utils/posthog-config.mjs` resolves the host once for the browser bootstrap and CSP. External hosts automatically allow the API and SDK origins in the CSP.

These settings are baked into `dist/`; rebuild when changing hosts. The browser does not detect its hosting provider or automatically retry failed proxy events against another host. Use the static profile when moving away from the Worker; direct delivery works without a proxy but loses its reduction in third-party blocking. Cloudflare deployment commands and GitHub Actions explicitly select the Cloudflare profile.

## Cloudflare routing

| Browser path | Upstream path |
| --- | --- |
| `/ingest/static/*` | `https://us-assets.i.posthog.com/static/*` |
| `/ingest/array/*` | `https://us-assets.i.posthog.com/array/*` |
| Other `/ingest/*` requests | `https://us.i.posthog.com/*` |

Both scripts and event requests must be proxied. An HTTP redirect to a PostHog domain does not provide first-party delivery. The Worker preserves query strings, methods and request bodies, including compressed event batches. It removes cookies and authorization headers, forwards Cloudflare's client IP as `X-Forwarded-For`, and removes upstream `Set-Cookie` headers. API and configuration responses use `Cache-Control: no-store`; static SDK responses retain upstream browser cache headers. It does not parse or log event payloads, retry submissions, or proxy arbitrary upstream hosts.

This reduces blocking without guaranteeing event capture. The existing load delay still means very short visits can be missed. PostHog remains the data recipient; see the website's [privacy reference](../src/pages/docs/privacy.mdx).

## Cloudflare deployment and local verification

`wrangler.jsonc` binds static files as `ASSETS` and runs the Worker first for `/ingest` and `/ingest/*`. Other requests retain static routing, trailing-slash handling, headers and custom 404 behavior. With the default host, the CSP uses `connect-src 'self'`; its hashed bootstrap and `strict-dynamic` allow the SDK to load through the proxy. No new DNS record or PostHog secret is needed. The Worker serves only `/ingest`; another relative path requires a matching proxy and routing change.

```sh
pnpm run build
pnpm run test:installer
pnpm run test:performance
pnpm run test:analytics
pnpm exec wrangler dev --port 8875
```

Use Wrangler for this check: Astro dev and preview do not execute the Worker. In browser developer tools, verify that `/ingest/static/array.js`, remote configuration, and event requests succeed on the local origin, with no CSP errors. Confirm ordinary pages and unknown paths still return their expected content/status. The unit tests use a fake upstream; they do not send events to PostHog.

Production deployment requires an authenticated Cloudflare account (`pnpm exec wrangler login`) or account-scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` values in the process environment. Run `pnpm run deploy:cloudflare`, then inspect the deployed SDK/event requests and confirm a tagged test event appears in the correct PostHog project. HTTP acceptance alone does not prove visibility in PostHog. See [Cloudflare deployment](cloudflare-deployment.md) for the existing GitHub Actions route.

## Other hosts

**Google VM:** Nginx or Caddy can serve `dist/` and proxy `/ingest/*` on the same origin. Strip the `/ingest` prefix and use the same two upstream hosts above, including `/array/*`. Configure HTTPS upstream verification, the correct upstream Host/SNI, client IP forwarding, credential removal, request body limits large enough for PostHog batches (PostHog recommends 64 MB), and no API response caching. The current browser configuration can stay unchanged when this path exists. The VM does not execute a Cloudflare Worker automatically, and no Astro SSR conversion is required when the web server provides the proxy.

**GitHub Pages:** Pages cannot execute a server-side proxy. Build with `pnpm run build:static` for direct PostHog delivery, or override `PUBLIC_POSTHOG_HOST` with a first-party subdomain such as `https://e.local.cloud` (for example, PostHog's managed proxy or a proxy on a VM). Configure that proxy's CORS policy for the actual website origin. The build updates the SDK host and CSP together. DNS can route a hostname to the proxy; it cannot route only `/ingest` away from GitHub Pages. Keeping `/ingest` on the website origin requires a reverse proxy in front of Pages.

References: [PostHog Cloudflare proxy](https://posthog.com/docs/advanced/proxy/cloudflare), [PostHog proxy requirements](https://posthog.com/docs/advanced/proxy/proxy-reference), [Cloudflare Worker/static asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), and [GitHub Pages hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
