## Why

AI coding agents are becoming a primary way developers create cloud-connected software, but agent-written GCP code needs a safe execution target before it touches real Google Cloud. LocalCloud already has the strongest primitive for this market — one credentialless Docker sandbox with 20+ GCP services — but the site and tooling do not yet expose LocalCloud as an agent-first platform with installable MCP tools, agent-readable setup, portable skills, ecosystem listings, and measurable launch channels.

## What Changes

- Publish a canonical agent onboarding surface at `/ai/`, backed by `/ai/agents.md`, an expanded `/llms.txt`, and optional `/llms-full.txt`/Markdown docs so agents can discover and execute LocalCloud setup without human explanation.
- Define a LocalCloud MCP server product surface for lifecycle, service discovery, endpoint export, logs, state/reset, docs search, safe GCP-local operations, prompts, packaging, and marketplace metadata.
- Create a portable LocalCloud Agent Skills repository covering BigQuery, Pub/Sub, Terraform, CI sidecars, seed data, and SDK integration tests using the Agent Skills open standard.
- Establish ecosystem distribution requirements for official MCP Registry/GitHub MCP Registry, Docker MCP Catalog, Claude Desktop/Connectors, VS Code/GitHub Copilot, Cline, Smithery, Zed, Cursor, PulseMCP, and fallback recipe channels such as Aider/Continue.
- Add an agentic search/content system targeting useful, evidence-backed pages for agent sandboxes, service-local testing, workflows, comparisons, glossary terms, and blog/demo content without creating thin keyword variants.
- Define a community launch and measurement program for Show HN, Product Hunt, Reddit, DEV, GitHub/MCP directories, demo videos, AI-citation checks, crawler policy, Docker pulls, and activation signals.
- Keep the LocalCloud product boundary explicit: local development, testing, CI, and demos only; no GCP account or credentials by default; validate against real Google Cloud before production deployment.

## Capabilities

### New Capabilities

- `agent-discovery-surface`: Agent-facing landing page, machine-readable instructions, `llms.txt`/Markdown discovery, copy prompts, and AGENTS.md templates.
- `localcloud-mcp-server`: MCP server tool/resource/prompt surface, protocol behavior, packaging, safety model, and install metadata.
- `agent-skill-packs`: Portable Agent Skills repository and first six LocalCloud workflow skills.
- `agent-platform-distribution`: Directory, registry, marketplace, client-config, and co-marketing requirements across agent platforms.
- `agentic-search-content`: SEO, glossary, comparison, service, workflow, and blog content system for agentic GCP development.
- `agent-community-launch`: Launch channels, community playbook, demo assets, outreach constraints, and measurement process.

### Modified Capabilities

None. Existing OpenSpec capability specs do not cover agent-first LocalCloud onboarding, MCP tools, skill packaging, or ecosystem distribution.

## Impact

- **Site content and routing:** new `/ai/` route, raw Markdown routes, copy-prompt sections, updated `llms.txt`, possible `/llms-full.txt`, agent-specific glossary/content pages, and internal links from docs/homepage/service pages.
- **Public artifacts:** new MCP server package/repository, Agent Skills repository, registry `server.json`, marketplace metadata, install snippets, privacy/security docs, icon/social assets, and demo transcripts/videos.
- **Product positioning:** adds “agent-safe local GCP sandbox” as a first-class message alongside developer cost savings and enterprise CI velocity.
- **Operations:** new release/launch checklist, directory submission tracking, crawler/citation monitoring, community response workflow, and metric ledger.
- **Security and trust:** requires explicit local-only defaults, no real GCP credentials by default, Docker permission documentation, destructive-tool confirmations, compatibility caveats, and anti-overclaim guardrails.
