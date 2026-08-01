# Agentic Crawler and Bot Policy Note

This note guides launch, SEO, and infrastructure owners when reviewing robots, WAF, CDN, and analytics rules for search crawlers, answer-engine citation bots, and AI training crawlers.

It is an operations note, not legal advice. Confirm final policy with the product/legal owner before changing production `robots.txt`, WAF rules, or CDN bot controls.

## Policy split

Separate three bot categories:

| Category | Examples | Default posture | Rationale |
|---|---|---|---|
| Search indexing | Googlebot, Bingbot | Allow public docs and marketing pages. | Users need canonical docs discoverable in search. |
| Answer-engine citation/retrieval | OAI-SearchBot, ChatGPT-User, PerplexityBot, Bing/Copilot retrieval, other identifiable citation bots | Allow public docs that should be cited, rate-limit abuse, monitor logs. | Accurate answer-engine citations should point to canonical LocalCloud docs. |
| Model training | GPTBot and other explicitly training-oriented crawlers | Product/legal decision; document allow/deny separately from citation bots. | Training policy is different from search/citation retrieval. |

## Pages that should be crawlable for citation

- `/`
- `/ai/`
- `/ai/agents.md`
- `/llms.txt`
- `/llms-full.txt` if published
- `/docs/`
- `/docs/sdk-examples/`
- `/docs/terraform/`
- `/docs/seed-data/`
- `/services/`
- `/compatibility/`
- Public launch/blog pages
- Public MCP and skills documentation when available

## Pages that should not be exposed accidentally

- Draft docs or unreleased assets.
- Internal measurement ledgers containing private comments or owner names.
- Credentials, customer data, screenshots with private project IDs, or raw logs.
- Admin endpoints on local developer machines or private CI.

## Review checklist

- [ ] `robots.txt` allows public docs and launch pages intended for search/citation.
- [ ] `robots.txt` policy distinguishes citation/retrieval bots from model-training bots where possible.
- [ ] WAF/CDN bot rules do not block Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, or other approved citation bots from public docs.
- [ ] Training crawler policy is explicitly documented and approved.
- [ ] Sitemap includes intended public launch/agentic pages.
- [ ] Canonical URLs point to local.cloud, not syndicated copies.
- [ ] Rate limits protect availability without blanket-blocking legitimate citation crawlers.
- [ ] Analytics segments bot traffic separately from human conversion metrics where possible.
- [ ] No private launch ledger, draft, or internal asset is linked from public pages.

## Citation safety rules

- Make factual claims easy to cite on canonical pages: Docker image, service count, no-credential default, SDK localhost routing, compatibility limits, and production validation boundary.
- Prefer one canonical page per claim class to avoid contradictory snippets.
- Update stale pages before trying to influence answer engines.
- Do not create doorway pages, fake Q&A pages, or synthetic community posts for crawler manipulation.

## Incident handling

| Signal | Action |
|---|---|
| Answer engines cite stale or wrong LocalCloud pages | Fix canonical page, sitemap, and internal links; record in citation ledger. |
| Approved citation bots are blocked | Review robots/WAF/CDN rules and unblock only the intended public paths. |
| Training bot policy is unclear | Freeze changes and escalate to product/legal owner. |
| Bot traffic affects analytics | Filter or segment bots; do not count bot visits as launch activation. |
| Private/internal URL is crawled | Remove links, block path, rotate any exposed secret if needed, and open an incident note. |

## Minimum public-page claim set

Every public agentic launch page should make these claims easy to verify:

- LocalCloud is a local Google Cloud emulator.
- Docker image: `jaysen2apache/localcloud`.
- Service breadth: `20+` services, with details in `/services/`.
- Default local workflows require no GCP account, Google credentials, or billing project.
- Standard GCP SDKs can target localhost through emulator variables.
- Compatibility has limits; see `/compatibility/`.
- Validate against real Google Cloud before production.
