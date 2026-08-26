# Agentic Release Checklist

Use this checklist before promoting any LocalCloud agentic launch wave, runtime MCP integration, skills release, or community campaign.

## Release owner

- Release owner:
- Launch wave:
- Target date:
- Rollback/hold criteria:
- Comment owners:
- Measurement owner:

## 1. Claim and fact review

- [ ] Public facts are sourced from approved product facts and current docs.
- [ ] Docker image is `jaysen2apache/localcloud` everywhere.
- [ ] Service breadth uses `20+` and links `/services/`.
- [ ] No page claims 100% compatibility, production parity, official Google affiliation, LocalStack affiliation, or unsupported pricing/licensing.
- [ ] Every launch asset says LocalCloud is for development, testing, CI, and demos.
- [ ] Every launch asset says to validate against real Google Cloud before production.
- [ ] Default workflow language says no GCP account, credentials, service-account keys, or billing project are required.

## 2. Agentic docs

- [ ] `/ai/` explains the human workflow and links canonical docs.
- [ ] `/ai/agents.md` is reachable and copyable.
- [ ] `/ai/agents.md` includes Docker check, start/reuse, health wait, env export, SDK verification, Terraform setup, CI/headless setup, coverage notes, troubleshooting, and stop conditions.
- [ ] Copy prompts cover quickstart, project integration, CI, troubleshooting, BigQuery, Pub/Sub, Firestore, and Cloud Storage where published.
- [ ] `/llms.txt` and `/llms-full.txt` policy is current.
- [ ] Markdown/raw routes intended for agents have canonical/index policy documented.

## 3. Core docs and compatibility

- [ ] `/docs/` is linked from every launch surface.
- [ ] `/docs/sdk-examples/` has a safe localhost SDK path.
- [ ] `/docs/terraform/` has endpoint override guidance and production validation caveat.
- [ ] `/docs/seed-data/` tells users to use fake secrets/test data.
- [ ] `/services/` reflects current supported/partial/planned service state.
- [ ] `/compatibility/` is linked from community drafts, Product Hunt assets, and response playbook.

## 4. Runtime MCP integration

Complete this section when launch content mentions MCP support.

- [ ] Site content links to the runtime repository’s canonical MCP integration guide.
- [ ] Connection guidance distinguishes the runtime-owned `/mcp` endpoint from the `localcloud mcp` stdio bridge.
- [ ] Tool, transport, lifecycle, and security claims are sourced from the runtime repository rather than copied into this site.
- [ ] Site content does not advertise an independent package, registry listing, or client configuration owned by this repository.

## 5. Agent Skills specs

Complete this section only for launches that include skills.

- [ ] Skill repository README and install matrix are current.
- [ ] Each skill frontmatter follows naming and description rules.
- [ ] Skill bodies stay focused; detailed material lives in references where appropriate.
- [ ] Positive and negative triggers are present.
- [ ] Skills link `/services/`, `/compatibility/`, and relevant docs.
- [ ] CI/SDK/Terraform skills preserve no-credential defaults and production validation boundary.

## 6. Launch kit assets

- [ ] `agentic-launch-kit.md` commands are current.
- [ ] `agentic-launch-asset-templates.md` is filled for screenshots, Product Hunt fields, and community rule checks.
- [ ] Rehearsal runbook has been copied into the launch issue/tracker.
- [ ] `agentic-demo-script.md` has been used for the current demo recording or updated with the actual transcript link.
- [ ] Demo video/GIF shot list has no credentials, customer data, or private project IDs.
- [ ] Product Hunt tagline, maker comment, screenshots, and CTA are ready.
- [ ] Show HN draft leads with runnable demo and limitations.
- [ ] Reddit drafts are adapted per community and rules reviewed.
- [ ] DEV/LinkedIn/Medium drafts preserve canonical links and technical commands.
- [ ] Community response playbook owner is assigned.

## 7. Measurement ledger

- [ ] A launch ledger has been created from `agentic-economy-ledger-template.csv`.
- [ ] Baseline Docker pull count for `jaysen2apache/localcloud` is recorded.
- [ ] Baseline docs visits are recorded for `/ai/`, `/ai/agents.md`, `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, `/docs/seed-data/`, `/services/`, and `/compatibility/`.
- [ ] Quickstart proxy events are identified or marked unavailable.
- [ ] UTM/source labels are assigned for each platform where allowed.
- [ ] GitHub issue/discussion tracking is ready.
- [ ] AI citation baseline is recorded with `agentic-ai-citation-prompts.md`.
- [ ] Runtime MCP documentation and skill-install rows are present if those channels exist.

## 8. Crawler and bot policy

- [ ] Public docs and launch pages intended for citation are crawlable.
- [ ] Search/citation bot policy is separate from model-training policy.
- [ ] Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, GPTBot, and other identifiable bots have an explicit allow/deny decision.
- [ ] WAF/CDN rules do not accidentally block approved search/citation crawlers from public docs.
- [ ] Internal ledgers, drafts, credentials, and private data are not exposed.

## 9. Community safety

- [ ] Every community rule check is recorded before posting.
- [ ] No request for votes, brigading, fake reviews, or undisclosed promotion is present.
- [ ] Maintainers are available for first-day comments.
- [ ] Moderator removals will be recorded and respected.
- [ ] Repeated objection threshold and owner are agreed.

## 10. Hold criteria

Do not launch if any of these are true:

- Canonical Docker image, service count, or production boundary is inconsistent across public assets.
- `/compatibility/` or `/services/` is missing or stale for a claim in the launch assets.
- The demo requires real GCP credentials for the default path.
- Community copy claims production parity or 100% compatibility.
- Runtime MCP or skill assets claim a client support path that is not source-confirmed.
- Measurement owner cannot record baseline metrics and objections.
- Security owner flags Docker/MCP permissions, exposed ports, credentials, or private data concerns.

## 11. Post-launch closeout

Within one week:

- [ ] Every post URL and removal reason is recorded.
- [ ] Every repeated objection is clustered.
- [ ] Three-or-more repeated objections are converted to docs, FAQs, compatibility notes, skills, runtime issues, or product backlog items.
- [ ] Docker pull deltas and docs visits are recorded.
- [ ] Quickstart proxy metrics are recorded.
- [ ] GitHub issues and follow-up tasks are linked.
- [ ] AI citation checks are scheduled for the next monthly review.
- [ ] Freshness checklist next review date is set.
