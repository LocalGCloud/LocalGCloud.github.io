## Context

LocalCloud is an Astro/Tailwind static marketing and documentation site for a Docker-based local Google Cloud emulator. The approved public product facts are: LocalCloud runs 20+ GCP services in one Docker container, uses standard GCP SDKs pointed at localhost, requires no GCP account or credentials for local development, and is for development/testing/CI/demos rather than production replacement. The canonical Docker image in this repo is `jaysen2apache/localcloud`; current machine-readable discovery exists at `public/llms.txt`, but there is no `/ai/`, `/ai/agents.md`, `/llms-full.txt`, MCP server, agent-skill repository, or agent-platform distribution surface.

The agent ecosystem now has three relevant standards/patterns:

- **MCP** exposes tools/resources/prompts over JSON-RPC using stdio or Streamable HTTP. Current clients include Claude Code/Desktop, VS Code/GitHub Copilot, Cursor, Cline, Zed, Smithery, Docker MCP Toolkit, and registry aggregators. Stdio is the broadest local-first transport; remote HTTP is best for hosted connectors.
- **Agent Skills** are portable directories with `SKILL.md` frontmatter (`name`, `description`) plus optional `references/`, `scripts/`, and `assets/`. Cursor, Codex, Claude Code plugins, GitHub Copilot, OpenCode, and others support variants of the standard.
- **Agent-readable docs** use `llms.txt`, `/ai/agents.md`, per-page Markdown, copyable prompts, and AGENTS.md templates. LocalStack's `/ai` pattern is the closest competitor reference, but LocalCloud's key difference is no account/auth token for the local sandbox.

Research sources used for this plan include primary MCP docs, llms.txt specification, Agent Skills specification, Claude/Cursor/VS Code/Cline/GitHub docs, LocalStack's AI-agent blog and MCP/skills repositories, Docker MCP Catalog docs, Smithery docs, Google Search AI guidance, Google Cloud emulator docs, and community launch rules for HN/Product Hunt/Reddit.

```mermaid
flowchart LR
  facts[Verified LocalCloud facts] --> aiPage[/ai/ + /ai/agents.md]
  facts --> skills[Agent Skills]
  facts --> mcp[MCP server]
  aiPage --> discovery[llms.txt + markdown docs]
  mcp --> registries[MCP/Docker/Claude/Cline/Smithery listings]
  skills --> agents[Claude/Cursor/Codex/Copilot workflows]
  discovery --> content[SEO, glossary, demos]
  registries --> launch[community launch]
  content --> measure[search, AI citations, Docker pulls]
  launch --> measure
  measure --> facts
```

## Goals / Non-Goals

**Goals:**

- Make LocalCloud discoverable and executable by AI coding agents with one canonical prompt and one canonical machine-readable setup guide.
- Define a safe local-first MCP server that lets agents operate LocalCloud without broad shell access or real GCP credentials.
- Define portable Agent Skills that teach agents repeatable LocalCloud workflows across BigQuery, Pub/Sub, Terraform, CI, seed data, and SDK tests.
- Define ecosystem distribution artifacts for registries, directories, marketplaces, client config snippets, and co-marketing channels.
- Establish useful, evidence-backed content clusters for agentic GCP development without thin keyword pages or unsupported parity claims.
- Define launch and measurement operations so adoption is tracked through Docker pulls, quickstart activation, community feedback, search visibility, and AI citations.

**Non-Goals:**

- Implement the MCP server, agent skills, landing page, or content pages in this planning change.
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

### 2. Ship stdio MCP first; defer remote HTTP until there is a hosted LocalCloud control plane

**Choice:** The first LocalCloud MCP server SHOULD be a local stdio server distributed by npm and optionally packaged as MCPB/OCI. Streamable HTTP is a future path only if LocalCloud offers remote or hosted sandbox control.

**Rationale:** LocalCloud is local/Docker-first. Stdio works across Claude Code/Desktop, Cursor, VS Code/Copilot, Cline, Zed, OpenCode-style clients, and avoids OAuth/resource-server complexity. Remote HTTP adds auth, origin validation, rate limiting, and hosting obligations that are unnecessary for the default sandbox.

**Alternatives considered:**

- *Remote HTTP first:* rejected because LocalCloud does not need an account-backed hosted connector for its core value.
- *Docker-only MCP packaging:* rejected as the only path because Docker-socket and mount requirements create trust friction. OCI remains a distribution option, not the sole install path.
- *No MCP server, just docs:* rejected because agent marketplaces and clients increasingly discover/install tool integrations, not just instructions.

### 3. Make the MCP tool surface explicit and safe instead of exposing generic shell commands

**Choice:** The MCP MVP SHALL expose purpose-built tools: runtime lifecycle, service discovery, endpoint/env config, safe local GCP operations, logs, state/reset, docs search, diagnostics, and prompts. It SHALL NOT expose arbitrary shell execution.

**Rationale:** MCP servers can execute local processes. A generic shell tool creates unnecessary risk and marketplace review friction. LocalCloud can expose a safer abstraction: every operation must target localhost, enforce fake/default project behavior, avoid real GCP auth, and return structured outputs.

**Alternatives considered:**

- *Generic `gcloud` shell passthrough:* rejected; use argv-based allowlists and endpoint enforcement instead.
- *Lifecycle-only MCP server:* rejected because agents need service endpoints, logs, docs, and state to complete workflows.
- *Full LocalStack-like breadth on v1:* rejected; core reliability and safety matter more than chaos/replication/remote state in the first release.

### 4. Package Agent Skills as portable canonical content, then wrap for client-specific marketplaces

**Choice:** Create a standalone LocalCloud Agent Skills repository with canonical `skills/<name>/SKILL.md` directories. Client/plugin wrappers for Claude, Codex, GitHub Copilot, Cursor, and OpenCode SHALL reference or package the same canonical skills rather than maintaining divergent copies.

**Rationale:** Agent Skills are a cross-client workflow format. The open standard and major client docs converge on `SKILL.md` plus optional references/scripts/assets. Portable canonical skills reduce drift and let users copy them into `.agents/skills`, `.github/skills`, `.cursor/skills`, `.claude/skills`, or packaged plugins.

**Alternatives considered:**

- *Claude-only skills:* rejected because Cursor/Codex/Copilot are critical coding-agent channels.
- *Scripts-first skills:* rejected for trust; instructions-first skills with optional auditable scripts are safer.
- *One giant LocalCloud skill:* rejected because skills should be focused for activation precision and context efficiency.

### 5. Use registry/listing metadata as product surface, not afterthought

**Choice:** Registry files, package metadata, icons, privacy/security docs, demo assets, and install snippets are first-class deliverables. Official MCP Registry/GitHub MCP Registry, Docker MCP Catalog, Claude Desktop/MCPB, Cline, Smithery, VS Code/Copilot, Zed, Cursor, PulseMCP, and fallback recipes are tracked with required assets and risks.

**Rationale:** Agent tools are discovered through registries and marketplace UIs. Reviewers and users evaluate trust from README quality, security docs, license, tool boundaries, SBOM/provenance where available, and package metadata.

**Alternatives considered:**

- *Only publish npm package:* rejected; npm enables install but not broad discovery.
- *Chase every directory immediately:* rejected; prioritize P0/P1 channels with source-confirmed submission paths and fit.
- *Wait for perfect product before listing:* rejected; publish once the MVP is safe, documented, and honest about gaps.

### 6. Create agentic content only where the page has a distinct user job and evidence

**Choice:** Build page clusters for agent sandbox pages, service-local testing, workflows, comparisons, glossary definitions, and blog/demo content. Every page must provide concrete setup, service-specific details, compatibility boundaries, and a real verification path.

**Rationale:** Google states AI Overviews/AI Mode use core Search systems; special AI files do not create ranking guarantees. Thin programmatic pages are risky. Useful pages with unique examples and evidence serve humans, search engines, and agents.

**Alternatives considered:**

- *Mass-generate `{agent} x {service}` pages:* rejected as thin/cannibalizing unless each has distinct examples and compatibility notes.
- *Only write thought leadership:* rejected; developers and agents need commands, env vars, snippets, and verification.
- *Avoid competitor/generic-sandbox comparisons:* rejected; comparisons with E2B/Vercel/Google emulators clarify category boundaries when balanced and sourced.

### 7. Launch with a runnable demo before community promotion

**Choice:** Community launches SHALL happen only after the agent flow is directly tryable: one Docker command, one agent prompt, one smoke-test verification, and a documented limitation page. Launch posts must ask for technical feedback, not push generic ads.

**Rationale:** HN, Reddit, and developer communities penalize drive-by promotion. LocalCloud's strongest launch asset is a runnable proof that an agent can build/test GCP code without credentials or spend.

**Alternatives considered:**

- *Launch landing page first:* rejected; Show HN/Product Hunt/Reddit require a working thing.
- *Wait for every platform listing:* rejected; the first launch can validate messaging before full distribution.
- *Hide limitations during launch:* rejected; emulator fidelity is the obvious objection and must be addressed upfront.

## Risks / Trade-offs

- **MCP security risk:** Local MCP servers can access local processes, Docker, logs, and files. Mitigation: explicit tools, no generic shell, no real GCP credentials, localhost endpoints, destructive confirmations, output caps, SECURITY.md, and clear Docker/socket threat model.
- **Credential leakage risk:** Agents may use ambient GCP credentials if env vars are wrong. Mitigation: `/ai/agents.md`, skills, and MCP tools must verify emulator env vars and explicitly refuse production endpoints unless the user asks for real-GCP validation.
- **Compatibility overclaim risk:** Agents may assume full GCP behavior. Mitigation: every machine-readable and human page includes service status, known gaps, and “validate against real GCP before production.”
- **Content drift risk:** `/ai/agents.md`, `/llms.txt`, `/llms-full.txt`, service pages, skills, MCP docs, and registry descriptions can diverge. Mitigation: centralize product/service metadata and add build validation for material facts.
- **Directory instability risk:** MCP Registry is preview and marketplace requirements change. Mitigation: keep official package/repo metadata canonical and treat secondary listings as distribution mirrors.
- **Docker trust friction:** Docker socket or broad container mounts are high risk. Mitigation: prefer npm stdio for MCP control, document any Docker requirements, offer “assume LocalCloud already running” mode, and avoid hidden mounts.
- **SEO spam risk:** Agentic terms are emerging and tempting for programmatic SEO. Mitigation: restrict pages to distinct jobs, real examples, and source-backed compatibility sections.
- **Community backlash risk:** Developer communities dislike vendor spam. Mitigation: post runnable demos, technical tradeoffs, and feedback requests; use self-promo threads where required.

## Migration Plan

1. Create the `/ai/agents.md` execution guide and `/ai/` landing page from current LocalCloud facts and docs; expand `/llms.txt` to point to them.
2. Centralize/validate service and endpoint metadata for use by `/ai/`, `llms.txt`, MCP docs, skills, and content pages.
3. Build the MCP server MVP as a local stdio npm package with structured safe tools and docs; add MCPB/OCI packaging only after tool behavior is stable.
4. Publish the first six Agent Skills in a portable repository and add client-specific installation docs.
5. Prepare registry/marketplace assets and submit to P0/P1 channels in sequence: official MCP/GitHub registry, Docker MCP Catalog, Claude/MCPB, VS Code/Copilot docs snippets, Cline, Smithery.
6. Publish agentic content clusters incrementally: canonical `/ai/`, Claude/Codex/Cursor/Gemini setup pages, service-local-testing pages for BigQuery/Pub/Sub/Firestore/Spanner, workflow pages, comparisons, glossary, and blog demos.
7. Launch after the demo is runnable; collect objections and turn repeated objections into docs, compatibility notes, or product backlog items.
8. Run monthly measurement for search, AI citations, Docker pulls, MCP installs/listings, skill usage proxies, community feedback, and claim accuracy.

## Research Sources

- MCP docs and registry: `modelcontextprotocol.io`, `github.com/modelcontextprotocol/registry`.
- Agent Skills: `agentskills.io/specification`, Cursor skills docs, OpenAI Codex skills docs, GitHub Copilot agent skills docs, Claude Code plugins docs.
- Agent-readable docs: `llmstxt.org`, `agents.md`, LocalStack `/ai` and `/ai/agents.md`, Apify agent onboarding, Rstest AI docs, Mintlify agent docs.
- Competitor/reference implementations: `github.com/localstack/localstack-mcp-server`, `github.com/localstack/skills`.
- Distribution surfaces: Docker MCP Catalog, Claude connectors/MCPB docs, VS Code MCP docs, Cline marketplace, Smithery, Zed MCP docs, PulseMCP, GitHub repository topic/community-profile docs.
- Growth/community: Google AI optimization guide, OpenAI/Perplexity bot docs, Google Cloud emulator docs, E2B/Vercel Sandbox docs, HN Show HN, Product Hunt, Reddit community rules.
