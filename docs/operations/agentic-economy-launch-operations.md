# Agentic Economy Launch Operations Index

This is the operating index for LocalCloud agentic launch tasks 7.1-7.9 and 8.1-8.6. It maps each OpenSpec task to the docs/templates that operators should use.

## Operating principles

- Follow community rules; do not mass-post, vote-brigade, or create synthetic engagement.
- Disclose affiliation when posting or replying.
- Use only supported public facts: LocalCloud is a local Google Cloud emulator, covers `20+` service surfaces, uses Docker image `jaysen2apache/localcloud`, routes standard GCP SDKs to localhost, requires no default GCP account/credentials/billing project, and requires real-GCP validation before production.
- Link `/compatibility/`, `/services/`, `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, and `/docs/seed-data/` where relevant.
- Treat Docker pulls, docs visits, quickstart clicks, citations, and stars as directional signals unless tied to a verified user workflow.
- Convert repeated objections into public docs, compatibility notes, skills, runtime MCP guidance, or product backlog items before the next launch wave.

## Task-to-artifact map

| Task | Artifact(s) | Operator action |
|---|---|---|
| 7.1 Launch kit | `agentic-launch-kit.md`, `agentic-demo-script.md`, `agentic-launch-asset-templates.md` | Prepare runnable demo, copyable prompt, transcript, screenshots/video, compatibility matrix, limitations, Docker image, and GitHub links. |
| 7.2 Fresh-machine rehearsal | `agentic-launch-rehearsal.md`, `agentic-demo-script.md` | Run the rehearsal outside this docs task, paste real output into the launch tracker, and log gaps in the ledger. |
| 7.3 Show HN | `agentic-community-post-drafts.md` | Adapt the Show HN draft, lead with runnable demo and limitations, and assign a maintainer for comments. |
| 7.4 Product Hunt | `agentic-community-post-drafts.md`, `agentic-launch-asset-templates.md` | Fill tagline, maker comment, categories, GIF/video, screenshots, and feedback CTA. |
| 7.5 Reddit | `agentic-community-post-drafts.md`, `agentic-launch-asset-templates.md` | Check each subreddit rule, adapt framing, disclose affiliation, and skip communities where the post is not welcome. |
| 7.6 DEV/LinkedIn/Medium | `agentic-community-post-drafts.md` | Publish/syndicate with canonical local.cloud links, commands, and compatibility caveats. |
| 7.7 Response playbook | `agentic-community-response-playbook.md` | Use templates for compatibility, security, Docker/MCP permissions, comparisons, pricing/licensing, and production validation. |
| 7.8 Measurement ledger | `agentic-economy-measurement.md`, `agentic-economy-ledger-template.csv` | Track posts, comments, objections, removals, GitHub issues, Docker pulls, docs visits, quickstart interactions, and follow-ups. |
| 7.9 Objection conversion | `agentic-community-response-playbook.md`, `agentic-economy-measurement.md` | Convert three-or-more repeated objections into docs, FAQs, compatibility notes, skills, runtime MCP guidance, or backlog items. |
| 8.1 Measurement operations | `agentic-economy-measurement.md` | Follow owner/cadence/channel/review process. |
| 8.2 CSV/template ledger | `agentic-economy-ledger-template.csv` | Copy per launch wave and preserve historical rows. |
| 8.3 AI citation prompts | `agentic-ai-citation-prompts.md`, `answer-engine-query-set.md` | Run monthly prompts and record cited URLs, competitors, and factual accuracy. |
| 8.4 Crawler/bot policy | `agentic-crawler-bot-policy.md` | Separate search/citation retrieval policy from model-training policy. |
| 8.5 Freshness review | `agentic-content-freshness-checklist.md` | Review quarterly or when platform docs/policies change. |
| 8.6 Release checklist | `agentic-release-checklist.md` | Validate agentic docs, runtime MCP links, skills, copy prompts, bot policy, and the measurement ledger before promotion. |

## Launch wave sequence

1. Copy `agentic-economy-ledger-template.csv` into the launch tracker.
2. Record baseline Docker pulls, docs visits, quickstart proxies, skill signals, and AI citations.
3. Complete `agentic-release-checklist.md`.
4. Run the fresh-machine rehearsal from `agentic-launch-rehearsal.md` and attach the real transcript.
5. Produce screenshots and video using `agentic-demo-script.md` and `agentic-launch-asset-templates.md`.
6. Publish only the community posts whose rules allow the format.
7. Monitor comments with `agentic-community-response-playbook.md`.
8. Log every post, comment, objection, removal, issue, Docker pull delta, docs visit, and follow-up task.
9. Convert repeated objections before the next wave.
10. Run monthly AI citation and freshness reviews.

## Hold conditions

Do not promote the launch if:

- The demo path requires real GCP credentials by default.
- Public assets disagree on Docker image, service count, or production boundary.
- `/compatibility/` or `/services/` does not support a launch claim.
- Community copy violates platform rules or asks for votes.
- Runtime MCP or skill assets claim unsupported client integration.
- Measurement baseline rows are missing.
- Docker/MCP permissions, exposed ports, credentials, or private data concerns are unresolved.
