## Context

LocalCloud is an Astro/Tailwind static marketing and documentation site for a Docker-based local Google Cloud emulator. The approved public product facts are: LocalCloud runs 20+ GCP services in one Docker container, uses standard GCP SDKs pointed at localhost, requires no GCP account or credentials for local development, and is for development/testing/CI/demos rather than production replacement. The canonical Docker image in this repo is `jaysen2apache/localcloud`; current machine-readable discovery exists at `public/llms.txt`, but there is no `/ai/`, `/ai/agents.md`, `/llms-full.txt`, agent-skill repository, or site link to the runtime-owned MCP integration.

The agent ecosystem now has three relevant standards/patterns:

- **MCP** exposes tools, resources, and prompts over JSON-RPC using stdio or Streamable HTTP. The LocalCloud runtime owns both its direct endpoint and CLI-provided stdio bridge.
- **Agent Skills** are portable directories with `SKILL.md` frontmatter (`name`, `description`) plus optional `references/`, `scripts/`, and `assets/`. Cursor, Codex, Claude Code plugins, GitHub Copilot, OpenCode, and others support variants of the standard.
- **Agent-readable docs** use `llms.txt`, `/ai/agents.md`, per-page Markdown, copyable prompts, and AGENTS.md templates. LocalStack's `/ai` pattern is the closest competitor reference, but LocalCloud's key difference is no account/auth token for the local sandbox.

Research sources used for this plan include the llms.txt specification, Agent Skills specification, Claude/Cursor/VS Code/Cline/GitHub docs, LocalStack's AI-agent blog and skills repository, Google Search AI guidance, Google Cloud emulator docs, and community launch rules for HN/Product Hunt/Reddit.

```mermaid
flowchart LR
  facts[Verified LocalCloud facts] --> aiPage[/ai/ + /ai/agents.md]
  facts --> skills[Agent Skills]
  aiPage --> discovery[llms.txt + markdown docs]
  aiPage --> runtimeMcp[Runtime MCP integration guide]
  skills --> agents[Claude/Cursor/Codex/Copilot workflows]
  discovery --> content[SEO, glossary, demos]
  runtimeMcp --> content
  content --> launch[community launch]
  launch --> measure[search, AI citations, Docker pulls]
  measure --> facts
```

## Goals / Non-Goals

**Goals:**

- Make LocalCloud discoverable and executable by AI coding agents with one canonical prompt and one canonical machine-readable setup guide.
- Link users to the LocalCloud runtime’s canonical MCP integration and connection instructions.
- Define portable Agent Skills that teach agents repeatable LocalCloud workflows across BigQuery, Pub/Sub, Terraform, CI, seed data, and SDK tests.
- Establish useful, evidence-backed content clusters for agentic GCP development without thin keyword pages or unsupported parity claims.
- Define launch and measurement operations so adoption is tracked through Docker pulls, quickstart activation, community feedback, search visibility, and AI citations.

**Non-Goals:**

- Implement runtime-owned MCP behavior, agent skills, landing pages, or content pages in this planning change.
- Replace real Google Cloud production validation or claim 100% GCP compatibility.
- Require users or agents to create LocalCloud accounts, provide GCP credentials, or configure billing for the default local flow.
- Publish private commercial licensing/pricing terms beyond the approved public availability and licensing boundary.
- Create keyword-farm pages, AI-only pages, synthetic reviews, fake community posts, or unauthentic directory submissions.
- Treat `llms.txt`, schema, MCP, or marketplace listings as guaranteed ranking/citation mechanisms.

## Decisions

### 1. Use `/ai/` and `/ai/agents.md` as the canonical agent entry point

**Choice:** Add a human-facing `/ai/` page with copy prompts and a raw Markdown execution guide at `/ai/agents.md`. The existing `/llms.txt` remains a curated site map and links to `/ai/agents.md`; `/llms-full.txt` is an optional large-context bundle.

**Rationale:** LocalStack's research-proven pattern separates human explanation from agent-executable instructions. `llms.txt` is useful but not automatically discovered by every assistant, so visible copy prompts and direct URLs are still required.

**Alternatives considered:**

- *Use only `/llms.txt`:* rejected because agents often need an explicit setup prompt and `llms.txt` is a discovery index, not a full execution flow.
- *Use root `AGENTS.md` as the website entry point:* rejected because AGENTS.md is for repo-local instructions in a user's codebase, not remote product onboarding.
- *Copy LocalStack's auth/account path:* rejected because LocalCloud's differentiator is credentialless local setup.

### 2. Treat the runtime repository as the MCP authority

**Choice:** Site content SHALL link to the LocalCloud runtime’s canonical MCP integration guide. It may summarize the runtime-owned `/mcp` endpoint and `localcloud mcp` stdio bridge, but it SHALL NOT duplicate tool catalogs, protocol behavior, packaging, or lifecycle implementation in this repository.

**Rationale:** Keeping implementation and integration documentation with the runtime prevents drift and avoids maintaining parallel MCP surfaces.

**Alternatives considered:**

- *Duplicate the runtime MCP guide in the site:* rejected because copied protocol and tool details would drift.
- *Hide MCP from the site entirely:* rejected because agents still need a discoverable path to the supported runtime integration.

### 3. Package Agent Skills as portable canonical content, then wrap for client-specific marketplaces

**Choice:** Create a standalone LocalCloud Agent Skills repository with canonical `skills/<name>/SKILL.md` directories. Client/plugin wrappers for Claude, Codex, GitHub Copilot, Cursor, and OpenCode SHALL reference or package the same canonical skills rather than maintaining divergent copies.

**Rationale:** Agent Skills are a cross-client workflow format. The open standard and major client docs converge on `SKILL.md` plus optional references/scripts/assets. Portable canonical skills reduce drift and let users copy them into `.agents/skills`, `.github/skills`, `.cursor/skills`, `.claude/skills`, or packaged plugins.

**Alternatives considered:**

- *Claude-only skills:* rejected because Cursor/Codex/Copilot are critical coding-agent channels.
- *Scripts-first skills:* rejected for trust; instructions-first skills with optional auditable scripts are safer.
- *One giant LocalCloud skill:* rejected because skills should be focused for activation precision and context efficiency.

### 4. Create agentic content only where the page has a distinct user job and evidence

**Choice:** Build page clusters for agent sandbox pages, service-local testing, workflows, comparisons, glossary definitions, and blog/demo content. Every page must provide concrete setup, service-specific details, compatibility boundaries, and a real verification path.

**Rationale:** Google states AI Overviews/AI Mode use core Search systems; special AI files do not create ranking guarantees. Thin programmatic pages are risky. Useful pages with unique examples and evidence serve humans, search engines, and agents.

**Alternatives considered:**

- *Mass-generate `{agent} x {service}` pages:* rejected as thin/cannibalizing unless each has distinct examples and compatibility notes.
- *Only write thought leadership:* rejected; developers and agents need commands, env vars, snippets, and verification.
- *Avoid competitor/generic-sandbox comparisons:* rejected; comparisons with E2B/Vercel/Google emulators clarify category boundaries when balanced and sourced.

### 5. Launch with a runnable demo before community promotion

**Choice:** Community launches SHALL happen only after the agent flow is directly tryable: one Docker command, one agent prompt, one smoke-test verification, and a documented limitation page. Launch posts must ask for technical feedback, not push generic ads.

**Rationale:** HN, Reddit, and developer communities penalize drive-by promotion. LocalCloud's strongest launch asset is a runnable proof that an agent can build/test GCP code without credentials or spend.

**Alternatives considered:**

- *Launch landing page first:* rejected; Show HN/Product Hunt/Reddit require a working thing.
- *Wait for every platform listing:* rejected; the first launch can validate messaging before full distribution.
- *Hide limitations during launch:* rejected; emulator fidelity is the obvious objection and must be addressed upfront.

## Risks / Trade-offs

- **Credential leakage risk:** Agents may use ambient GCP credentials if env vars are wrong. Mitigation: `/ai/agents.md`, skills, and links to the runtime MCP guide must reinforce emulator env vars and real-GCP stop conditions.
- **Compatibility overclaim risk:** Agents may assume full GCP behavior. Mitigation: every machine-readable and human page includes service status, known gaps, and “validate against real GCP before production.”
- **Content drift risk:** `/ai/agents.md`, `/llms.txt`, `/llms-full.txt`, service pages, skills, and runtime integration links can diverge. Mitigation: centralize site-owned product/service metadata, validate material facts, and leave MCP implementation details in the runtime repository.
- **SEO spam risk:** Agentic terms are emerging and tempting for programmatic SEO. Mitigation: restrict pages to distinct jobs, real examples, and source-backed compatibility sections.
- **Community backlash risk:** Developer communities dislike vendor spam. Mitigation: post runnable demos, technical tradeoffs, and feedback requests; use self-promo threads where required.

## Migration Plan

1. Create the `/ai/agents.md` execution guide and `/ai/` landing page from current LocalCloud facts and docs; expand `/llms.txt` to point to them.
2. Centralize and validate service and endpoint metadata for use by `/ai/`, `llms.txt`, skills, and content pages.
3. Link agent-facing content to the runtime repository’s canonical MCP integration guide.
4. Publish the first six Agent Skills in a portable repository and add client-specific installation docs.
5. Publish agentic content clusters incrementally: canonical `/ai/`, Claude/Codex/Cursor/Gemini setup pages, service-local-testing pages, workflow pages, comparisons, glossary, and blog demos.
6. Launch after the demo is runnable; collect objections and turn repeated objections into docs, compatibility notes, or product backlog items.
7. Run monthly measurement for search, AI citations, Docker pulls, skill usage proxies, community feedback, and claim accuracy.

## Research Sources

- Agent Skills: `agentskills.io/specification`, Cursor skills docs, OpenAI Codex skills docs, GitHub Copilot agent skills docs, Claude Code plugins docs.
- Agent-readable docs: `llmstxt.org`, `agents.md`, LocalStack `/ai` and `/ai/agents.md`, Apify agent onboarding, Rstest AI docs, Mintlify agent docs.
- Competitor/reference skills: `github.com/localstack/skills`.
- Growth/community: Google AI optimization guide, OpenAI/Perplexity bot docs, Google Cloud emulator docs, E2B/Vercel Sandbox docs, HN Show HN, Product Hunt, Reddit community rules.
