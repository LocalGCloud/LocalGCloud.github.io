# Agentic Content Freshness Review Checklist

Review agentic launch and distribution content every quarter and whenever a platform changes its docs, API, install flow, bot policy, or integration requirements.

## Scope

| Area | Canonical artifacts |
|---|---|
| Product facts | `src/data/agenticFacts.ts`, `src/data/productFacts.ts`, `/services/`, `/compatibility/` |
| Agent instructions | `/ai/`, `/ai/agents.md`, `/llms.txt`, `/llms-full.txt` if published |
| Developer docs | `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, `/docs/seed-data/` |
| Launch docs | `agentic-launch-kit.md`, community drafts, response playbook, rehearsal runbook |
| Runtime MCP integration | Runtime-owned MCP guide and site links to it |
| Skills distribution | Skill `SKILL.md` files, references, install matrix, plugin metadata |
| Measurement | Ledger template, AI citation prompts, bot policy, release checklist |

## Quarterly review checklist

### Product facts and compatibility

- [ ] Docker image is still `jaysen2apache/localcloud` or all public docs have been updated from an approved source.
- [ ] Service count still uses approved `20+` wording.
- [ ] `/services/` matches current supported, partial, and planned service status.
- [ ] `/compatibility/` lists known service gaps and production validation boundary.
- [ ] Planned services are not described as safe for local verification.
- [ ] No page claims 100% GCP compatibility or production parity.
- [ ] No page invents pricing, licensing, customers, benchmarks, or roadmap dates.

### Agent platform instructions

- [ ] `/ai/agents.md` still tells agents to avoid real GCP credentials by default.
- [ ] Copyable prompts still instruct agents to stop when LocalCloud is unhealthy instead of falling back to real GCP.
- [ ] Client-specific install instructions have been checked against current platform docs or marked as unverified.
- [ ] Claude/Codex/Cursor/Copilot/Gemini/OpenCode/Zed references are platform-specific only where source-confirmed.
- [ ] MCP links point to the runtime-owned integration guide, and skills links point to existing repositories before public promotion.

### Runtime MCP integration

- [ ] Site links resolve to the runtime repository’s canonical MCP guide.
- [ ] Site copy distinguishes the `/mcp` endpoint from the `localcloud mcp` stdio bridge.
- [ ] Tool, lifecycle, transport, and security details remain owned by the runtime repository.
- [ ] No site page duplicates runtime-owned MCP client configuration or tool details.

### Skills and prompts

- [ ] Skill names and frontmatter still match the packaging rules.
- [ ] Service-specific skills link the correct docs and limitations.
- [ ] Negative triggers and refusal/stop conditions are still present.
- [ ] CI and SDK test skills do not ask for real GCP credentials by default.
- [ ] Skill install instructions are still accurate for each client.

### Launch and community assets

- [ ] Show HN, Product Hunt, Reddit, DEV, LinkedIn, and Medium drafts still match current community rules.
- [ ] Every draft includes compatibility/production caveat language.
- [ ] Every draft links canonical local.cloud URLs instead of stale syndicated copies.
- [ ] Screenshot/video script avoids showing credentials, customer data, private project IDs, or cloud billing pages.
- [ ] Response playbook covers the top repeated objections from the latest ledger.

### Measurement and answer-engine visibility

- [ ] `agentic-economy-ledger-template.csv` still includes active channels and runtime MCP/skills fields.
- [ ] AI citation prompt set includes current answer engines and public claim classes.
- [ ] Bot policy reflects current robots/WAF/CDN behavior.
- [ ] Analytics event names still match implemented events.
- [ ] Docker pull, docs visit, quickstart proxy, and skill repository metrics have current owners.

## Triggered review events

Run an out-of-cycle review when any of these happen:

- Service support status changes.
- Docker image name changes.
- `/ai/agents.md`, the runtime MCP integration guide, or skill prompts change agent behavior.
- A platform changes its agent-integration or extension instructions.
- A community removes a launch post for rule reasons.
- Three or more users repeat the same objection.
- An answer engine cites inaccurate LocalCloud facts.
- A security concern mentions credentials, Docker socket, exposed ports, or private data.

## Review output

Record each review in the measurement ledger with:

- Date and owner.
- Artifacts reviewed.
- Facts changed or confirmed.
- Links updated.
- Objections converted into docs/backlog.
- Next review date.

Do not ship a new launch wave until critical freshness issues are fixed or explicitly marked as blockers.
