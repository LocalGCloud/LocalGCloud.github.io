# Search and agent discovery

The site publishes these documents from the same committed content used by its pages:

| Surface | Source | Purpose |
| --- | --- | --- |
| `/robots.txt` | `public/robots.txt` | Search and AI crawler access; sitemap discovery |
| `/sitemap-index.xml`, `/sitemap.xml` | Astro sitemap and `scripts/write-sitemap-alias.mjs` | Canonical HTML URLs and modification dates |
| `/llms.txt` | `scripts/generate-distributed-docs.mjs` | Agent entry point, Markdown links, feeds and policy references |
| `/llms-full.txt`, page `.md` twins | `scripts/generate-markdown-twins.mjs` | Technical corpus and individual page content |
| `/ai/*.md` | Agent document routes and shared agent data | Curated agent setup and reference documents |
| `/rss.xml` | `src/data/blogPosts.ts` and `/blog/` | Blog updates, with canonical article URLs and known publication dates |
| `/changelog/rss.xml` | `src/data/releases.json` through `src/data/trust.ts` | CLI release updates and GitHub release links |
| `/ai.txt`, `/.well-known/ai.txt` | `scripts/generate-distributed-docs.mjs` | Identical experimental AI usage declarations |

The shared layout advertises Markdown, `llms.txt` and both RSS feeds on every page;
the homepage also advertises `ai.txt`, which is linked from `llms.txt`. The Worker
also returns HTTP `Link` discovery on HTML and Markdown, retaining canonical links,
conditional responses, content negotiation and preview-host indexing restrictions.
Anchored links in `llms.txt` retain their HTML URL because explicit HTML IDs may not
survive Markdown conversion. Unanchored page links use Markdown twins.

The AI declaration follows the key-value fields of the individual Internet-Draft
[draft-car-ai-txt-wellknown-00](https://datatracker.ietf.org/doc/draft-car-ai-txt-wellknown/).
It is experimental, not an Internet Standard or a guarantee of crawler adoption.
The permissive preferences apply to public website content and match existing
`robots.txt` access. They do not grant rights to the LocalCloud software or override
the published software license. Revisit the format when a supported standard emerges.

Feeds build offline; they never fetch new release data or manufacture publication
dates from build time. Update releases using the existing release-sync workflow.
`pnpm run test:discovery` checks built documents and feed invariants during the full
build. `pnpm run test:worker` checks response headers and GET/HEAD behavior in workerd.

## Operational checks — October 25, 2026

- Cloudflare API inspection showed AI crawler blocking, Bot Fight Mode, JavaScript
  bot challenges and managed `robots.txt` disabled. The custom firewall rules target
  scanner IPs and private configuration paths; the scanner rate limit excludes
  verified bots. No Cloudflare settings were changed. These configuration checks do
  not prove that every verified crawler has successfully retrieved every page.
- Deployment run `40227181662` at source `4551ce44e1b3247aced057739852318147b97c48`
  completed its IndexNow step with “no new or changed URLs.” An accepted submission
  is not proof that a search engine has crawled or indexed a URL. The preceding
  submission in run `40187762328` accepted two URLs with HTTP 200.
- Bing Webmaster Tools required sign-in in the available browser session, so its
  indexing report was unavailable.
- The available signed-in Google Search Console session reported no access to the
  `local.cloud` domain property. Actual indexing coverage and URL Inspection results
  require an account with property access.

After an authorized deployment, verify both feed bodies and content types, both AI
declaration paths, HTML/Markdown discovery links, and the IndexNow job receipt.
Check Google indexing in Search Console and Bing indexing in Bing Webmaster Tools;
neither robots permission, a sitemap nor an IndexNow receipt guarantees indexing.
