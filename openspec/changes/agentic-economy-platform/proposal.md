## Why

AI coding agents are becoming a primary way developers create cloud-connected software, but agent-written GCP code needs a safe execution target before it touches real Google Cloud. LocalCloud already has the strongest primitive for this market — one credentialless Docker sandbox with 20+ GCP services — but the site and tooling do not yet expose LocalCloud as an agent-first platform with discoverable runtime MCP guidance, agent-readable setup, portable skills, and measurable launch channels.

## What Changes

- Publish a canonical agent onboarding surface at `/ai/`, backed by `/ai/agents.md`, an expanded `/llms.txt`, and optional `/llms-full.txt`/Markdown docs so agents can discover and execute LocalCloud setup without human explanation.
- Surface the LocalCloud runtime’s canonical MCP integration from agent onboarding content, including its `/mcp` endpoint and `localcloud mcp` stdio bridge, without duplicating implementation details in this site repository.
- Create a portable LocalCloud Agent Skills repository covering BigQuery, Pub/Sub, Terraform, CI sidecars, seed data, and SDK integration tests using the Agent Skills open standard.
- Add an agentic search/content system targeting useful, evidence-backed pages for agent sandboxes, service-local testing, workflows, comparisons, glossary terms, and blog/demo content without creating thin keyword variants.
- Define a community launch and measurement program for Show HN, Product Hunt, Reddit, DEV, demo videos, AI-citation checks, crawler policy, Docker pulls, and activation signals.
- Keep the LocalCloud product boundary explicit: local development, testing, CI, and demos only; no GCP account or credentials by default; validate against real Google Cloud before production deployment.

## Capabilities

### New Capabilities

- `agent-discovery-surface`: Agent-facing landing page, machine-readable instructions, `llms.txt`/Markdown discovery, copy prompts, AGENTS.md templates, and links to the runtime-owned MCP integration.
- `agent-skill-packs`: Portable Agent Skills repository and first six LocalCloud workflow skills.
- `agentic-search-content`: SEO, glossary, comparison, service, workflow, and blog content system for agentic GCP development.
- `agent-community-launch`: Launch channels, community playbook, demo assets, outreach constraints, and measurement process.

### Modified Capabilities

None. Existing OpenSpec capability specs do not cover agent-first LocalCloud onboarding, runtime MCP discovery, or skill packaging.

## Impact

- **Site content and routing:** new `/ai/` route, raw Markdown routes, copy-prompt sections, updated `llms.txt`, possible `/llms-full.txt`, agent-specific glossary/content pages, and internal links from docs/homepage/service pages.
- **Public artifacts:** Agent Skills, canonical runtime MCP documentation links, privacy/security guidance, social assets, and demo transcripts/videos.
- **Product positioning:** adds “agent-safe local GCP sandbox” as a first-class message alongside developer cost savings and enterprise CI velocity.
- **Operations:** new release/launch checklist, directory submission tracking, crawler/citation monitoring, community response workflow, and metric ledger.
- **Security and trust:** requires explicit local-only defaults, no real GCP credentials by default, Docker permission documentation, destructive-tool confirmations, compatibility caveats, and anti-overclaim guardrails.
