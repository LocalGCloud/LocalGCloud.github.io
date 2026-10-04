# Mobile PageSpeed remediation

Report: [local.cloud mobile](https://pagespeed.web.dev/analysis/https-local-cloud/anz5hhd2ou?hl=en&form_factor=mobile), captured October 2, 2026 at 6:41 PM PDT, Lighthouse 13.5.0, Moto G Power, Slow 4G.

Baseline: Performance 87, Accessibility 99, Best Practices 100, SEO 100; FCP 2.6 s, LCP 3.5 s, TBT 20 ms, CLS 0.007, Speed Index 2.6 s. No CrUX field data was available.

## Plan and audit inventory

| Finding | Evidence | Fix and verification |
| --- | --- | --- |
| Efficient cache lifetimes, 102 KiB estimated savings | First-party assets expire after 10 minutes; PostHog SDK 4 hours and config 5 minutes | Add Cloudflare static asset headers: one year immutable for fingerprinted `/_astro/` files, bounded cache for mutable images. Third-party TTLs remain vendor-controlled. Verify with local Wrangler and after deployment. |
| Forced reflow | PostHog 23 ms; unattributed 17 ms | Move SDK loading after page load to idle time; disable unused surveys. Keep interaction analytics. Trace after build; unattributed work requires fresh measurement. |
| Network dependency tree | Two stylesheet requests; 158 ms measured critical path | Inline page styles with Astro; self-host Latin variable fonts and preload the body font. Verify HTML and request graph. |
| Render-blocking requests | Two first-party CSS files, 16.8 KiB transferred, 750 ms estimated duration | Use Astro's supported stylesheet inlining. HTML grows, but initial rendering needs no CSS network round trip. Verify compressed HTML and mobile Lighthouse. |
| Duplicated JavaScript, 3 KiB | PostHog surveys and exception bundles share SDK internals | Disable unused surveys and defer SDK/extensions. Retain browser exception capture. Remaining SDK duplication belongs to the vendor. |
| Legacy JavaScript, 17 KiB | PostHog SDK and surveys polyfills | Remove surveys from loading; defer remaining vendor SDK. Cannot remove vendor polyfills through site build settings. |
| Layout shift culprits | Hero figure, CLS 0.007 | Reserve hero aspect ratio; replace asynchronous third-party font stylesheet with local optional fonts. Preserve artwork and layout. Verify dimensions and CLS. |
| LCP breakdown | Hero SVG: load delay 40 ms, duration 190 ms, render delay 180 ms in observed trace | Keep high-priority eager image, preload on homepage, reserve ratio, eliminate CSS request dependency. Verify measured LCP. |
| Third parties | PostHog 140 KiB/120 ms main thread; Google Fonts 73 KiB | Self-host fonts; defer analytics and disable unused surveys. Analytics remains third-party by design. |
| Unused JavaScript, 82 KiB | All flagged bytes are PostHog SDK/surveys | Disable surveys; load analytics after initial content. Remaining unused SDK code cannot be tree-shaken from the CDN script. |
| Long main-thread tasks | PostHog SDK 74 ms at 2,578 ms | Defer startup to idle after load. This changes scheduling; it cannot guarantee the vendor has no long tasks. |
| Heading order | Footer Product `h4` skips levels | Make footer group headings `h2`, retaining existing typography. Verify homepage and other layouts. |
| Redundant image alt text | Header and footer brand marks repeat adjacent LocalCloud text | Default BrandMark to empty alt and use empty alt for decorative service icons next to visible labels. Preserve descriptive hero alt. |
| CSP | No enforcement policy | Generate CSP from emitted scripts, with script hashes and integrity metadata plus explicit PostHog sources; allow existing inline styles. Test search, feedback and demo with enforcement. |
| HSTS | Missing header | Add HTTPS-only HSTS for this host, without subdomain/preload commitment. Verify serving headers. |
| COOP | Missing header | Add `same-origin`. Verify site navigation and external links. |
| Clickjacking | Missing frame control | Add X-Frame-Options DENY and CSP frame-ancestors in response headers. |
| Trusted Types | No directive | Defer enforcement: Pagefind, PostHog and the site's HTML sinks need a separate compatibility migration. Do not add a permissive default policy solely to pass an audit. |
| Baseline Features | PostHog limited-availability features; site features are newly/widely available | Informational inventory, no failing site compatibility finding. Keep native browser fallbacks. |
| Structured data | Manual check suggested | Existing build validates rendered SEO/JSON-LD; rerun it. Google's rich-result eligibility remains a separate external check. |
| Manual accessibility checks | Keyboard, focus, content and assistive-technology checks | Exercise mobile menu, search and keyboard help locally. Automated checks cannot establish complete accessibility. |

## Acceptance

Run the complete `pnpm run build`, `pnpm run test:installer`, local browser checks, mobile Lighthouse, and `graft build`. Preserve unrelated work. Record local results separately from production; the saved Google report will not change until the site is deployed and analyzed again.

## Implementation results

Implemented and locally verified on October 3, 2026. The canonical new brand and service icons remain in use.

- Inlined page CSS, self-hosted optional Latin variable fonts, preloaded the body font and homepage hero, and reserved the hero's aspect ratio. No external stylesheet or Google Fonts requests remain on the homepage.
- Analytics queues interactions immediately, then loads the SDK after page load, a 1.5-second delay, and an idle callback. Surveys are disabled; autocapture and exception capture remain enabled. Very short visits can leave before the SDK loads, as documented in the privacy page.
- Corrected footer headings, decorative image alternatives, and the pricing link's underline.
- Added static asset cache and security headers. Retained hash-based CSP with `strict-dynamic`, signed emitted local scripts with integrity metadata, and allowed Pagefind's same-origin worker. A 31,441-byte bundled Pagefind client loads only on search, avoiding the browser's rejection of dynamic module imports under this policy.

### Controlled local comparison

Lighthouse 13.5.0 mobile defaults, using the same local machine and plain static servers for both builds. These servers do not apply Cloudflare compression or cache headers; serving headers were verified separately with local Wrangler. Scores and timings vary between runs and are not production measurements.

| Metric | Local baseline | Final local build |
| --- | --- | --- |
| Performance | 79 | 97 |
| Accessibility | 99 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 2.8 s | 1.7 s |
| Largest Contentful Paint | 4.4 s | 2.5 s |
| Total Blocking Time | 50 ms | 30 ms |
| Cumulative Layout Shift | 0.013 | 0 |
| Speed Index | 3.4 s | 1.7 s |

The final audit reports no console errors, render-blocking stylesheet requests, or forced-reflow findings. Local Wrangler confirms one-year immutable caching for hashed fonts and scripts, seven-day caching for the brand mark, and the configured security headers. HTML and search index data retain revalidation.

### Verification

- Full site build passed for 129 pages, including upstream contract, policy, content, internal links, rendered tables, SEO/JSON-LD and Pagefind checks. Upstream provenance was synchronized using the required workflow; existing dependency resolutions were retained.
- Installer suite and all five performance regression tests passed. The latter exercise analytics scheduling/fallbacks, exact script hashes and integrity, concurrent lazy search loading, and built homepage assets.
- Browser checks passed for mobile navigation, search results and navigation, keyboard help, documentation installation tabs and syntax highlighting, feedback links, and the interactive demo's run action. No feedback was submitted.
- `git diff --check` passed. Gortex's final change scan timed out; build and browser verification provide the completion evidence. The graft graph was refreshed.
- Evidence: `output/pagespeed-remediation/lighthouse-before.json`, `lighthouse-after.json`, `build.log`, and `mobile-final.jpg`.

### Remaining limitations

- PostHog still contributes about 58.4 KiB of unused code, 8.1 KiB of legacy code, 1.7 KiB of duplication, and a 106 ms long task in the final run. Its CDN cache lifetime is vendor-controlled. These cannot be fully removed while retaining the current CDN SDK and exception capture; a narrower analytics integration or vendor changes are needed.
- Trusted Types enforcement needs a compatibility migration for site and vendor HTML sinks. It is not enabled by this change.
- Automated accessibility and JSON-LD checks passed; complete assistive-technology testing and Google's rich-result eligibility are separate checks.
- No deployment was performed. Production headers and performance require a fresh test after deployment. The saved PageSpeed report is historical, and CrUX field data depends on real user traffic.
