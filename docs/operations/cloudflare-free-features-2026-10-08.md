# Cloudflare free features for LocalCloud

Reviewed **2026-10-08** against official Cloudflare documentation. Recommendations target the existing Astro site, Workers Assets deployment, installer, agent-readable documentation, and PostHog relay. Product availability is verified; private dashboard configuration and account subscriptions are not. No remote settings were changed.

Prioritize reliable crawler/installer access, basic security, and existing analytics. Additional products should wait for a concrete need.

## Verified LocalCloud state

The main review agent checked public DNS/HTTP behavior and repository configuration during this review:

- Cloudflare authoritative nameservers are `hans` and `lana`. DS queries through both `1.1.1.1` and `8.8.8.8` returned no DS; authoritative `hans` returned no DNSKEY. DNSSEC is not active publicly.
- HTTPS apex returns 200; HTTP apex and HTTPS `www` return 301 to the HTTPS apex. HTTP/3 is advertised. HSTS is already `max-age=31536000`, without `includeSubDomains` or preload.
- Mutable content uses `max-age=0, must-revalidate, no-transform`. `/docs/` returns both HTML and Markdown with 200 and `Vary: Accept`. Python's non-browser HTTP client received 200 for `/llms.txt`, `/docs/`, `/install.sh`, `/robots.txt`, and `/sitemap.xml`.
- Authored robots rules permit AI search, user-driven fetches, and training crawlers. Spaceship forwarding MX/SPF are active; DMARC is `p=none` with Cloudflare aggregate reporting.
- Source `wrangler` configuration invokes the Worker first for most pages and `/ingest`; hashed `/_astro/` assets bypass it. `docs/cloudflare-deployment.md` prescribes Browser Integrity Check, Rocket Loader, and email obfuscation off; managed robots must remain off or match authored policy.
- A `Speculation-Rules` header is present. This signals Speed Brain configuration, not a measured speed improvement: Worker routes and the site's restrictive CSP limit eligibility.
- The supplied dashboard URL opened a sign-in page. WAF rules, plan selection, analytics dashboards, usage, and private settings remain unverified.

## Use or verify now

| Priority | Setting | Recommended configuration and benefit |
|---|---|---|
| 1 | Account security | Enable two 2FA factors and save backup codes; scope CI API tokens to required account/zone permissions. [2FA](https://developers.cloudflare.com/fundamentals/user-profiles/2fa/), [tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). |
| 1 | DNSSEC | Enable zone signing, then publish Cloudflare's exact DS at the existing registrar and validate the chain. Free; registrar transfer unnecessary. Coordinate both sides because mismatched DS/signing breaks resolution. [Setup](https://developers.cloudflare.com/dns/dnssec/), [free availability](https://developers.cloudflare.com/registrar/). |
| 1 | Crawler access | Explicitly allow **Search** and **Agent** traffic. Keep Training aligned with the site's current permissive robots policy unless product strategy changes. September 2026 controls distinguish these behaviors; mixed Search/Training crawlers can be blocked by Training policies. Free AI Crawl Control identifies declared user agents and offers a 24-hour metrics window. [Policies](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/), [limits](https://developers.cloudflare.com/ai-crawl-control/get-started/). |
| 1 | Bot Fight Mode | Keep **off**. It applies across the domain, can challenge API clients, and cannot be exempted by WAF Skip/Allow rules. That is incompatible with reliable curl installation, agent fetches, and telemetry. [Limitations](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/). |
| 1 | Security baseline | Keep automatic DDoS protection and the default Free Managed Ruleset. Free WAF is a narrower ruleset than paid Cloudflare/OWASP coverage. Review blocked legitimate requests before adding restrictions. [DDoS behavior](https://developers.cloudflare.com/waf/feature-interoperability/), [Free WAF](https://developers.cloudflare.com/waf/get-started/). |
| 1 | Worker usage | Monitor requests, CPU errors, and `/ingest` failures. Free scripts allow **100,000 requests/day/account and 10 ms CPU/invocation**; direct Assets requests are unlimited and free. Worker-first page traffic consumes script quota. Hitting quota produces failures even at low human traffic if bots spike. [Pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Assets behavior](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/). |
| 2 | TLS and HTTPS | Keep Universal SSL/HTTPS redirects; verify minimum TLS **1.2** and TLS 1.3. SSL covers apex/first-level subdomains. Retain current HSTS and subdomain/preload exclusions. [SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/), [minimum TLS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/minimum-tls/), [TLS 1.3](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/tls-13/), [HSTS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/). |
| 2 | Protocols/compression | Retain HTTP/2 (automatic on Free) and HTTP/3. Use ordinary Brotli/Gzip where responses permit transformations; `no-transform` prevents compression rules changing those responses. Free supplies ten Compression Rules, but no extra rule is necessary by default. [HTTP/2](https://developers.cloudflare.com/speed/optimization/protocol/http2/), [HTTP/3](https://developers.cloudflare.com/speed/optimization/protocol/http3/), [compression](https://developers.cloudflare.com/rules/compression-rules/). |
| 2 | Security Insights/alerts | Review misconfigurations weekly and enable useful email alerts. Free scans run weekly and support on-demand rechecks; inactivity can pause automatic scans. Insights notifications are available on all plans. [Scans](https://developers.cloudflare.com/security/security-insights/how-it-works/), [alerts](https://developers.cloudflare.com/notifications/notification-available/). |
| 2 | Certificate monitoring | Enable free CT Monitoring email alerts for unexpected certificates; Cloudflare-issued certificates are filtered. [CT Monitoring](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/certificate-transparency-monitoring/). |
| 2 | Analytics/RUM | Use existing PostHog visitor → docs/CTA → install-interest events; script retrieval is counted independently, not completed installation/activation. Keep Cloudflare Web Analytics for performance; ensure one beacon. Free automatic RUM excludes EEA/UK/CH by default and offers no path-specific injection rules. Low traffic means sparse metrics. Synthetic quotas omit Free; verify dashboard entitlement. [RUM](https://developers.cloudflare.com/speed/observatory/), [analytics limits](https://developers.cloudflare.com/web-analytics/limits/), [test quotas](https://developers.cloudflare.com/speed/observatory/run-speed-test/). |
| 2 | Worker logs | Use bounded sampling and exclude request bodies, identifiers, and secrets. Free includes **200,000 log events/day, three-day retention** today. Cloudflare announces a pricing transition on **December 1, 2026**; recheck then. [Logs pricing](https://developers.cloudflare.com/workers/observability/logs/workers-logs/). |

## Cache and performance decisions

Set **Browser Cache TTL → Respect Existing Headers** and keep **Development Mode off** during normal operation. The source already gives fingerprinted assets a one-year immutable lifetime and makes mutable documents/installers revalidate. A global browser TTL can override shorter origin lifetimes. [Browser TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/), [Development Mode](https://developers.cloudflare.com/cache/reference/development-mode/).

Preserve the current asset caching and mutable-document revalidation. Avoid a zone-wide “Cache Everything”: HTML and Markdown share URLs, installers change, and telemetry is dynamic. Free includes ten Cache Rules. `Vary: Accept` alone is not honored by default CDN caching; the current **Cache Rules Vary feature is available on Free** and can be configured when caching the relevant origin/subrequest response. `passthrough` preserves raw Accept semantics; normalization can remove/reorder quality values. Evaluate Worker routing first, then test HTML/Markdown in both request orders and after a deploy. [Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/), [Vary behavior](https://developers.cloudflare.com/cache/concepts/vary/), [default behavior](https://developers.cloudflare.com/cache/concepts/cache-control/).

The newer **Workers Cache** is a distinct feature in front of Worker execution. Enabling it makes every request count at the Worker request rate, including normally free Assets requests. It is not a free-quota workaround. [Workers Cache pricing](https://developers.cloudflare.com/workers/cache/#pricing).

| Feature | Decision |
|---|---|
| Speed Brain | Already indicated; do not weaken CSP or restructure routing for it. It requires cache eligibility, Chromium 121+, and no Worker invocation; strict-dynamic/nonce CSP prevents it working. [Requirements](https://developers.cloudflare.com/speed/optimization/content/speed-brain/). |
| Early Hints | Free and conditional: useful only with correct preload/preconnect `Link` response headers. Assess measured value on the fast static site; the toggle alone does not supply hints. [Conditions](https://developers.cloudflare.com/cache/advanced-configuration/early-hints/). |
| Crawler Hints | Optional Free enhancement; it uses cache signals and IndexNow. Existing explicit IndexNow publishing may already cover the need. It cannot guarantee ranking or indexing. [Behavior](https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/). |
| Redirect/header rules | Free: ten Single Redirects and ten active Transform Rules; Bulk Redirects support 10,000 URLs. Preserve working canonical redirects and source-controlled headers; use these only for gaps or moved URLs. [Redirect quotas](https://developers.cloudflare.com/rules/url-forwarding/), [transforms](https://developers.cloudflare.com/rules/transform/). |

## Conditional products

| Product | Useful trigger and free boundary |
|---|---|
| Client-Side Security | Optional basic script inventory via **Continuous script monitoring**. Free excludes connections/cookies, attribution, change/malware detection and alerts. Uses Report-Only CSP; preserve the enforcing CSP. [Availability](https://developers.cloudflare.com/client-side-security/), [configuration](https://developers.cloudflare.com/client-side-security/reference/settings/). |
| WAF custom/rate rules | Abuse at a specific endpoint. Free has **five custom rules**, no Log action/regex, and **one IP-based rate rule with 10-second counting/mitigation periods**. Baseline `/ingest` bursts first; block excess requests rather than send a browser challenge. Shared NAT users can collide. [Custom rules](https://developers.cloudflare.com/waf/custom-rules/), [rate limits](https://developers.cloudflare.com/waf/rate-limiting-rules/). |
| Turnstile | Add only to a future abused signup/contact form, with server-side token verification. Free: **20 widgets, ten hostnames/widget, unlimited challenges**. Do not gate docs/installers. [Plans](https://developers.cloudflare.com/turnstile/plans/), [validation](https://developers.cloudflare.com/turnstile/get-started/). |
| Access + Tunnel | Protect private staging, admin tools, or explicit demo sharing. Zero Trust Free serves teams up to **50 users**; Tunnel alone does not authenticate visitors. Public docs/installers stay public; never expose a user's emulator automatically. [Plans](https://www.cloudflare.com/plans/zero-trust-services/), [private apps](https://developers.cloudflare.com/cloudflare-one/setup/secure-private-apps/). |
| DMARC reporting | Already publicly configured: use reports to validate real senders before strengthening `p=none`. DMARC Management is on all plans. Preserve Spaceship forwarding; Cloudflare Email Routing is free inbound forwarding, not a reason to replace working MX records. Arbitrary-recipient outbound email requires Workers Paid. [DMARC](https://developers.cloudflare.com/dmarc-management/), [email pricing](https://developers.cloudflare.com/email-service/platform/pricing/). |
| Zaraz | Only if many marketing tags later require centralized delivery/consent. **1 million events/month free**, then stops without paid activation. Avoid duplicating existing PostHog/Cloudflare beacons. [Pricing](https://developers.cloudflare.com/zaraz/pricing-info/). |
| Startup credits | Investigate eligibility: current bootstrapped tier offers **$10,000**, with partner-funded tiers up to **$350,000**. Credits expire after one year/consumption, have exclusions, and require acceptance. No application submitted. [Program](https://www.cloudflare.com/startups/). |
| OSS sponsorship | Project Alexandria may help qualifying recognized-OSS projects operating nonprofit or fitting its mission. Acceptance and credits are discretionary; commercial LocalCloud eligibility is unconfirmed. [Program](https://www.cloudflare.com/lp/project-alexandria/), [criteria](https://blog.cloudflare.com/expanding-our-support-for-oss-projects-with-project-alexandria/). |

## Developer freebies: inventory, not a migration plan

Use only for a specific hosted feature. Quotas use the account/product scope in linked pricing pages.

| Product | Current Free allowance | Potential use / decision |
|---|---|---|
| [KV](https://developers.cloudflare.com/kv/platform/pricing/) | 1 GB; 100k key reads/day; 1k each writes/deletes/lists/day | Small configuration; unnecessary for static content. |
| [D1](https://developers.cloudflare.com/d1/platform/pricing/) | 5 GB; 5m rows read/day; 100k written/day | Future feedback storage; [Free limits](https://developers.cloudflare.com/d1/platform/limits/) also cap each DB at 500 MB, ten DBs. |
| [R2](https://developers.cloudflare.com/r2/pricing/) | Standard: 10 GB-month, 1m Class A + 10m Class B/month; direct egress free | Future owned download mirror; overage is billable, not a hard free plan. Keep current release distribution until needed. |
| [Queues](https://developers.cloudflare.com/queues/platform/pricing/) | 10k operations/day, 24-hour retention | Future reliable async work; normal delivery uses three operations/message. |
| [Workflows](https://developers.cloudflare.com/workflows/reference/pricing/) | Shared 100k invocations/day, 10 ms CPU, 3k steps/day, 1 GB-month state | Future durable jobs; avoid replacing existing CI. |
| [Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/) | SQLite only; 100k requests/day, 13k GB-seconds/day, 5 GB storage | Future coordination; unnecessary for site analytics. |
| [Cron](https://developers.cloudflare.com/workers/platform/limits/) / [Builds](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) | Five Cron triggers/account; Builds 3k minutes/month, one concurrent | Small checks or alternative CI; reuse current pipeline. |
| [Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/) | 10k Neurons/day; some models require payment | Bounded experiment only; no unsolicited chatbot. |
| [AI Search](https://developers.cloudflare.com/ai-search/platform/limits-pricing/) | Beta: 20k queries/month, 500 crawled pages/day; model/gateway usage separate | Future docs search experiment; beta pricing is temporary. |
| [Vectorize](https://developers.cloudflare.com/vectorize/platform/pricing/) | 5m stored dimensions, 30m queried/month | Only for a chosen retrieval feature. |
| [AI Gateway](https://developers.cloudflare.com/ai-gateway/reference/pricing/) | Core analytics/cache/rate controls free; inference still costs | Only for hosted LLM calls; new gateways use Workers log pricing. |
| [Browser Run](https://developers.cloudflare.com/browser-run/pricing/) | Ten minutes/day, three concurrent browsers | Occasional hosted smoke checks; existing browser tests suffice. |
| [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/pricing/) | Published Free allocation 100k writes + 10k queries/day; billing not yet active | Avoid adding another analytics store. |
| [Hyperdrive](https://developers.cloudflare.com/hyperdrive/platform/pricing/) | 100k queries/day; underlying DB separate | Only when Workers need an existing hosted SQL database. |
| [Images transformations](https://developers.cloudflare.com/images/pricing/) | 5k unique transforms/month for externally stored images | Conditional; static build optimization is simpler. Images storage/delivery is paid. |
| [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/) | 100 custom hostnames included; more cost $0.10 each | Future customer-domain hosting only; no current LocalCloud need. |

## Leave unused

For any future externally hosted proxied origin, use **Full (strict)** with a valid origin certificate. The current Workers Assets site has no separate VM origin to configure. [Origin TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).

Keep BIC off for unusual/missing user agents, Under Attack Mode off except an attack, Rocket Loader off, and authored robots unchanged. Legacy “Medium” security guidance is obsolete. [BIC](https://developers.cloudflare.com/learning-paths/application-security/default-traffic-security/browser-integrity/), [security level](https://developers.cloudflare.com/waf/tools/security-level/), [Rocket Loader](https://developers.cloudflare.com/speed/optimization/content/rocket-loader/), [managed robots](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/).

No Pages migration: direct Assets on Workers already have free unlimited serving, while Pages Functions share Worker quotas. Cloudflare Fonts only transforms Google Fonts; unnecessary if fonts are already local. [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Fonts](https://developers.cloudflare.com/speed/optimization/content/fonts/).

Do not buy Argo, APO, Stream, or domain transfer for this review. Argo is usage-billed; APO targets WordPress and requires purchase on Free; Stream storage/delivery costs money; Registrar sells domains at cost, not free. [Argo](https://developers.cloudflare.com/argo-smart-routing/get-started/), [APO](https://developers.cloudflare.com/automatic-platform-optimization/get-started/activate-cf-wp-plugin/), [Stream](https://developers.cloudflare.com/stream/pricing/), [Registrar](https://developers.cloudflare.com/registrar/).

## Weekly growth check

Compare source/referrer and landing pages; inspect docs/CLI-interest conversions, search dead ends, feedback, and vitals. Existing source events include `code_copied`, `cta_clicked`, `github_click`, `docs_search`, and `doc_feedback`. Worker `install_script_fetched` measures successful installer GETs with random IDs: it proves neither installation/activation nor individual visitor attribution. Runtime activation needs separate evidence. This event inventory was source-verified by the main review agent; dashboard results were unavailable.

The main agent passed the 84-page build and installer tests; sibling-upstream checks were skipped because this worktree lacks those repositories.

Private settings and real-user results were not checked. Risks: blocking automation, mixing cached HTML/Markdown, and exhausting Worker quota.
