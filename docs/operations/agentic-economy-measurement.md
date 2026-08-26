# Agentic Economy Measurement Operations

This document defines how to measure the LocalCloud agentic launch without spam, synthetic engagement, or unsupported claims. It covers launch posts, comments, Docker pulls, docs visits, answer-engine citations, runtime MCP documentation, skill repository adoption, and quickstart activation proxies.

## Owner and cadence

| Cadence | Owner | Work |
|---|---|---|
| Launch day | Launch operator | Record every post, comment thread, removal, docs spike, Docker pull baseline/delta, quickstart interaction, and high-risk objection. |
| Launch week daily | Launch operator + maintainer | Cluster objections, respond where useful, open docs/backlog issues, and update the ledger. |
| Monthly | Growth/ops owner | Review search visibility, AI citations, Docker pulls, docs visits, skill repository signals, and conversion proxies. |
| Quarterly | Docs owner + product owner | Review compatibility freshness, runtime MCP integration links, skills, and launch assets. |
| Before each launch wave | Release owner | Complete `agentic-release-checklist.md` and confirm the ledger has baseline rows. |

## Source of truth

Use `docs/operations/agentic-economy-ledger-template.csv` as the copyable ledger template. Each launch should copy it to the working tracker for that launch wave. Do not overwrite historical rows.

Launch asset production uses `agentic-launch-asset-templates.md`; demo recording and transcript capture use `agentic-demo-script.md`.

## Measurement channels

| Channel | What to record | Source/tool | Notes |
|---|---|---|---|
| Hacker News / Show HN | Post URL, title, time, rank if visible, points, comments, repeated objections, moderator notes. | Manual capture. | Do not vote-brigade or ask for upvotes. |
| Product Hunt | Launch URL, tagline, categories, maker comment URL, comments, feedback themes, asset performance notes. | Product Hunt dashboard/manual. | Ask for feedback, not votes. |
| Reddit | Subreddit, rule check, post URL, removal status, comments, moderator notes. | Manual capture. | Skip communities where rules discourage this post. |
| DEV/LinkedIn/Medium | Canonical URL, syndicated URL, comments, reactions, referral visits. | Platform analytics/manual. | Preserve canonical local.cloud links. |
| GitHub | Issues, discussions, stars, forks, bug reports, docs PRs. | GitHub UI/API. | Separate product bugs from docs objections. |
| Docker pulls | Baseline, daily count, launch-week delta. | Docker Hub public stats or owner dashboard. | Pull count is directional; do not treat as activated usage. |
| Docs visits | Page visits, referrers, copy-prompt clicks, quickstart clicks, SDK/Terraform visits. | PostHog or configured analytics. | Segment by UTM/source where available. |
| Quickstart activation proxies | `/ai/agents.md` visits, env export docs visits, copy prompt events, docs SDK example visits, Terraform guide visits. | Analytics events/page paths. | These are proxies, not proof of successful local runs. |
| Runtime MCP documentation | Guide visits, MCP-link clicks, and MCP-related support issues. | Analytics/manual. | The runtime repository owns implementation and connection details. |
| Skill repo installs/stars | Stars, clones, install links clicked, issues. | GitHub/analytics. | Only when skill repo exists. |
| Answer engines | Prompt, engine, cited URLs, competitor mentions, factual accuracy. | Manual monthly review. | Use `agentic-ai-citation-prompts.md`. |

## Baseline setup

Before launch day:

1. Create a new ledger from `agentic-economy-ledger-template.csv`.
2. Record baseline Docker pull count for `jaysen2apache/localcloud`.
3. Record baseline docs traffic for `/ai/`, `/ai/agents.md`, `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, `/docs/seed-data/`, `/services/`, and `/compatibility/`.
4. Confirm analytics labels for copy-prompt, docs quickstart, SDK examples, Terraform, seed data, and compatibility clicks.
5. Assign comment owners for each platform.
6. Record current answer-engine citation baseline using `agentic-ai-citation-prompts.md`.
7. Record the current runtime MCP documentation link and Agent Skills repository status.

## UTM and event naming

Use UTM parameters where platform rules and UX allow them. Do not add tracking parameters to communities that strip them or discourage them.

Recommended pattern:

```text
utm_source=<platform>&utm_medium=community&utm_campaign=agentic-economy-launch&utm_content=<post-or-asset>
```

Recommended event labels:

| Event | Meaning |
|---|---|
| `agentic_prompt_copy` | User copied an agent prompt. |
| `agentic_agents_md_view` | User viewed `/ai/agents.md`. |
| `agentic_quickstart_click` | User clicked a quickstart/demo link. |
| `agentic_sdk_examples_click` | User clicked SDK examples. |
| `agentic_terraform_click` | User clicked Terraform docs. |
| `agentic_seed_data_click` | User clicked seed data docs. |
| `agentic_compatibility_click` | User clicked limitations/compatibility. |
| `agentic_docker_click` | User clicked Docker image/reference. |

## Comment and objection tracking

For each meaningful comment thread, record:

- Platform and URL.
- Comment URL or permalink.
- Objection category.
- Exact user wording or a short faithful summary.
- Response URL and owner.
- Whether the concern is resolved, needs site docs, needs a runtime issue, needs skill guidance, or should be ignored by rule.

Use these standard objection categories:

- `compatibility-gap`
- `production-boundary`
- `credential-safety`
- `docker-permissions`
- `mcp-permissions`
- `localstack-comparison`
- `generic-sandbox-comparison`
- `pricing-licensing`
- `missing-service`
- `ci-setup`
- `terraform-setup`
- `seed-data`
- `docs-confusion`
- `moderation-removal`

## Converting repeated objections

During launch week, review objection clusters daily.

| Repetition threshold | Required action |
|---|---|
| 1 report | Answer if useful and record in ledger. |
| 2 similar reports | Draft a short internal note or issue; watch for recurrence. |
| 3+ similar reports | Assign an owner and convert into a public artifact or backlog item before the next launch wave. |

Artifact mapping:

| Objection cluster | Convert into |
|---|---|
| Compatibility confusion | `/compatibility/`, `/services/`, or service-specific docs. |
| SDK routing confusion | `/docs/sdk-examples/`, `/ai/agents.md`, or copy prompt update. |
| Terraform setup confusion | `/docs/terraform/` update. |
| Seed/reset confusion | `/docs/seed-data/` update. |
| Agent safety failure | Skill instruction, runtime MCP guidance, or `/ai/agents.md` stop condition. |
| Docker/MCP permission concern | Security note or the runtime repository’s canonical MCP integration guide. |
| Pricing/licensing question | Public licensing/pricing doc only after owner approval; otherwise response playbook update. |
| Missing service | Product backlog item and service catalog/compatibility note if needed. |

## Monthly review process

1. Copy the current month’s ledger rows into the reporting view.
2. Review community post outcomes and unresolved objections.
3. Record Docker pull baseline/delta.
4. Record docs visits and quickstart activation proxies.
5. Run the AI-citation prompt set across enabled answer engines.
6. Record cited URLs, competitor mentions, and factual accuracy.
7. Check search visibility using the existing SEO/AI visibility process.
8. Review runtime MCP integration links and Agent Skills distribution status.
9. Open updates for repeated objections and stale content.
10. Share a concise summary: what launched, what users asked, what changed, and what remains blocked.

## Quality bar

- No fake reviews, synthetic comments, undisclosed astroturfing, or vote requests.
- No claims that LocalCloud is production-safe or 100% compatible.
- No claims of Docker pulls, docs visits, stars, or citations unless recorded from a real source.
- No unsupported pricing/licensing promises.
- Every repeated objection has an owner, artifact/backlog target, and next review date.
