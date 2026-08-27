# Agentic Launch Asset Templates

Use these templates to produce launch assets without inventing claims or drifting from community rules.

## Asset inventory

| Asset | Required fields | Owner | Status |
|---|---|---|---|
| Show HN post | Title, runnable commands, limitations, maintainer availability | Launch operator | Draft in `agentic-community-post-drafts.md` |
| Product Hunt listing | Tagline, maker comment, categories, screenshot captions, GIF/video script, CTA | Launch operator | Draft in `agentic-community-post-drafts.md` |
| Reddit post | Subreddit, rules checked, adapted copy, feedback question, removal handling | Launch operator | Draft in `agentic-community-post-drafts.md` |
| Syndication post | Canonical URL, technical commands, source links, caveat paragraph | Content owner | Draft in `agentic-community-post-drafts.md` |
| Demo video | Script, transcript, screenshots, no-secret review | Demo owner | See `agentic-demo-script.md` |
| Measurement row | URL, comments, objections, docs visits, Docker pull delta, follow-up owner | Measurement owner | See CSV ledger |

## Screenshot template

| Screenshot | File name | Must show | Must not show | Caption |
|---|---|---|---|---|
| Docker start | `01-docker-start.png` | `jaysen2apache/localcloud` command or image reference | Tokens, private paths with usernames if not desired | “Start one LocalCloud container.” |
| Health check | `02-health.png` | `http://localhost:8080/_localcloud/health` | Private network hostnames | “Wait for local readiness.” |
| Env export | `03-env-export.png` | Emulator host variables | Real credential paths, service-account keys | “Route standard SDKs to localhost.” |
| Agent prompt | `04-agent-prompt.png` | No-credential prompt language | Private repository names unless approved | “Tell the agent not to use real GCP.” |
| SDK check | `05-sdk-check.png` | Local smoke check output | Customer data or production project IDs | “Verify one GCP workflow locally.” |
| Console | `06-console.png` | Local console state | Sensitive seed data | “Inspect local state.” |
| Compatibility | `07-compatibility.png` | `/compatibility/` caveat | None | “Validate real GCP before production.” |

## Product Hunt fields

| Field | Template |
|---|---|
| Name | LocalCloud |
| Tagline | Local Google Cloud sandbox for agents, dev, and CI |
| Short description | LocalCloud runs GCP-style development and test workflows locally in Docker, with standard SDKs routed to localhost and no default need for a GCP account, credentials, or billing project. |
| CTA | Try the Docker demo and tell us which GCP workflow should be easiest for agents. |
| Topics | Developer Tools; Artificial Intelligence; Software Engineering. Use Open Source only if the launched artifact/license supports it. |
| Caveat | Development/testing/CI/demo only; validate against real Google Cloud before production. |

## Community rule-check template

Record this before posting:

```text
Platform:
Community:
Rules URL:
Self-promotion allowed? yes/no/unclear
Moderator contacted? yes/no/n/a
Required disclosure:
Forbidden content:
Post owner:
Comment owner:
Post URL:
Removal status:
Notes:
```

## Repeated-objection conversion template

```text
Objection category:
Exact wording:
Seen on:
Count this wave:
Current response link:
Owner:
Artifact target: docs / FAQ / compatibility / services / skill / MCP guardrail / product backlog
Target URL or issue:
Due before next launch wave? yes/no
Resolution summary:
```

## No-claim-drift review

Before publishing any asset, confirm:

- [ ] Docker image is `jaysen2apache/localcloud`.
- [ ] Service count says 27 available service guides, with `/services/` linked.
- [ ] No production replacement or 100% compatibility claim appears.
- [ ] No unapproved pricing/licensing, benchmark, customer, or roadmap claim appears.
- [ ] No LocalStack affiliation is implied.
- [ ] Default workflow says no GCP account, credentials, or billing project.
- [ ] Compatibility and production-validation caveats are visible.
- [ ] The asset links canonical local.cloud URLs, not copied docs or stale screenshots alone.
