## 1. Establish agentic product facts and shared metadata

- [x] 1.1 Create an agentic-workflow fact inventory covering Docker image, service count, admin endpoints, env export formats, service statuses, ports, SDK env vars, Terraform env vars, known gaps, and production-validation boundary.
- [x] 1.2 Add or extend a shared service/endpoint metadata source used by `/ai/`, `/ai/agents.md`, `/llms.txt`, MCP docs, skill references, and agentic content pages.
- [x] 1.3 Reconcile public Docker image naming across product context, docs, `llms.txt`, and any new agent pages; prefer `jaysen2apache/localcloud` unless product owner updates the canonical image.
- [x] 1.4 Define a claim-review rule for agentic pages: no service capability, cost, credential, or compatibility claim can ship without source, owner, and review date.
- [x] 1.5 Create a validation checklist for “agent-safe” messaging: no default GCP credentials, no cloud account, no production replacement, and real-GCP validation before production.

## 2. Build the canonical agent discovery surface

- [x] 2.1 Create `/ai/` as the canonical agent onboarding landing page with human explanation, copyable prompts, workflow cards, service matrix, safety boundaries, and links to docs/resources.
- [x] 2.2 Create `/ai/agents.md` as raw Markdown with non-negotiables, setup paths, Docker checks, idempotent container start/reuse, health wait, env export, SDK verification, Terraform setup, CI/headless setup, coverage notes, and troubleshooting.
- [x] 2.3 Add a copyable prompt library for quick setup, existing-repo integration, CI setup, troubleshooting, BigQuery, Pub/Sub, Firestore, and Cloud Storage workflows.
- [x] 2.4 Expand `/llms.txt` to follow the llms.txt section pattern and prioritize `/ai/`, `/ai/agents.md`, quickstart docs, SDK examples, Terraform docs, service catalog, compatibility, and optional long-form resources.
- [x] 2.5 Add `/llms-full.txt` generation or a manually maintained first version with table of contents, source URLs, and large-context warning.
- [x] 2.6 Add Markdown alternatives or raw Markdown routes for the core docs/service pages needed by agents; decide and document the index/canonical policy for Markdown routes.
- [x] 2.7 Add a downloadable/copyable AGENTS.md template for user repositories and explain the difference between remote `/ai/agents.md` and project-local `AGENTS.md`.
- [x] 2.8 Add structured metadata, sitemap entries, and static verification for `/ai/`, `/ai/agents.md`, `/llms.txt`, `/llms-full.txt`, and Markdown routes intended for publication.
- [x] 2.9 Run build and static route verification; confirm `/ai/` renders with correct title, H1, canonical, description, copy prompts, and no unverified claims.

## 3. Design and implement the LocalCloud MCP server MVP

- [x] 3.1 Create a dedicated public MCP server repository or workspace package with TypeScript/npm stdio as the first supported runtime.
- [x] 3.2 Add MCP server package metadata, license, README, SECURITY.md, privacy statement, CONTRIBUTING.md, issue templates, icon assets, and local.cloud documentation links.
- [x] 3.3 Implement MCP stdio transport with stderr-only logging, bounded output, JSON Schema input schemas, structured outputs, text mirrors, and namespaced `localcloud-*` tool names.
- [x] 3.4 Implement `localcloud-runtime` for status, health, start, stop, restart, and readiness; require `confirm: true` for stop/restart and default image `jaysen2apache/localcloud`.
- [x] 3.5 Implement `localcloud-services` from the shared service metadata source or a synchronized generated snapshot.
- [x] 3.6 Implement `localcloud-diagnostics` to check Docker availability, port conflicts, container state, health endpoint, env vars, and SDK routing pitfalls.
- [x] 3.7 Implement `localcloud-logs` with summary/errors/requests/raw modes, service filters, bounded log lines, grouped errors, and truncation metadata.
- [x] 3.8 Implement `localcloud-state` inspect/reset functions where supported; require `confirm: true` for reset and return before/after health/resource summaries.
- [x] 3.9 Implement `localcloud-docs` using local.cloud docs, `/llms.txt`, service catalog, and source URLs as the primary corpus.
- [x] 3.10 Evaluate and, if safe enough, implement `localcloud-gcp-client` as a constrained argv/allowlist tool with forced localhost endpoints and no shell/string command execution.
- [x] 3.11 Add user-invoked MCP prompts such as `gcp-sandbox-tester`, `write-localcloud-integration-test`, `terraform-local-gcp-validation`, and `debug-localcloud-sdk-routing`.
- [x] 3.12 Add unit tests for schemas, refusal paths, destructive confirmations, stdout/stderr separation, output truncation, endpoint enforcement, and no-credentials defaults.
- [x] 3.13 Add integration smoke tests that start or reuse LocalCloud, verify health, list services, export env config, and run one safe local service operation.
- [x] 3.14 Document client install snippets for Claude Code/Desktop, Cursor, VS Code/GitHub Copilot, Cline, Zed, OpenCode/Codex-style clients, and generic MCP JSON config.

## 4. Package and distribute the MCP server

- [x] 4.1 Publish an npm package runnable with `npx -y`, including registry-compatible MCP metadata and a pinned minimum Node version.
- [x] 4.2 Create `server.json` for official MCP Registry submission with package metadata, transports, icon, repo, docs, version, license, and security/privacy links.
- [x] 4.3 Prepare OCI/Docker packaging if the server can run safely in a container; document Docker socket/mount behavior or provide a no-socket mode.
- [x] 4.4 Prepare an MCPB bundle for Claude Desktop/Smithery-style local distribution with manifest, icon, config schema, tools/prompts metadata, privacy policy, and checksum.
- [x] 4.5 Submit or prepare submission to official MCP Registry and validate that downstream GitHub MCP Registry metadata can ingest the package.
- [x] 4.6 Prepare Docker MCP Catalog PR assets: server.yaml, tools.json, README, Dockerfile/image, icon URL, config/env/volume declarations, and test evidence.
- [x] 4.7 Prepare Claude Desktop/MCPB documentation and determine whether a Claude Connectors Directory submission is appropriate for local MCPB vs remote connector.
- [x] 4.8 Prepare Cline marketplace issue assets: repository URL, 400x400 logo, stability statement, README/llms-install.md setup path, and demo prompt.
- [x] 4.9 Prepare Smithery listing metadata or server-card JSON for MCPB/local distribution.
- [x] 4.10 Prepare VS Code/Copilot `.vscode/mcp.json`, user config, Copilot cloud-agent allowlist, and sandboxing docs.
- [x] 4.11 Prepare Cursor, Zed, PulseMCP, Glama, Aider fallback, and Continue legacy docs only where source-confirmed; avoid claiming unsupported native marketplace paths.

## 5. Create the LocalCloud Agent Skills repository

- [x] 5.1 Create the skills repository structure with README, install matrix, LICENSE, SECURITY.md, AGENTS.md for contributors, and canonical `skills/` directory.
- [x] 5.2 Add `skills/localcloud-bigquery/SKILL.md` with references for BigQuery coverage, query examples, unsupported SQL/features, and SDK test acceptance criteria.
- [x] 5.3 Add `skills/localcloud-pubsub/SKILL.md` with references for topics/subscriptions, publish/pull/ack, streaming pull, env vars, and known gaps.
- [x] 5.4 Add `skills/localcloud-terraform/SKILL.md` with endpoint override guidance, supported resources, unsupported resource caveats, and no-credential defaults.
- [x] 5.5 Add `skills/localcloud-ci-sidecar/SKILL.md` with GitHub Actions template, readiness gate, env export, test command placeholders, Docker/memory/port constraints, and cleanup guidance.
- [x] 5.6 Add `skills/localcloud-seed-data/SKILL.md` with seed schema references, examples for multiple services, fake-secret guidance, admin API/startup mount loading, and reset flow.
- [x] 5.7 Add `skills/localcloud-sdk-tests/SKILL.md` with Python/Node/Go/Java SDK guidance, env vars, local project defaults, no mocks positioning, and production unset instructions.
- [x] 5.8 Add per-skill positive and negative trigger prompts and verify descriptions front-load service names, LocalCloud, GCP emulator, and workflow triggers.
- [x] 5.9 Validate all skills against Agent Skills naming/frontmatter rules and keep `SKILL.md` bodies focused with detailed material in `references/`.
- [x] 5.10 Add Claude plugin packaging metadata, Codex plugin metadata, GitHub Copilot install guidance, Cursor/OpenCode compatibility notes, and a release process that preserves skill names.
- [x] 5.11 Link the skills repository from `/ai/`, `/ai/agents.md`, `/llms.txt`, MCP README, and relevant docs.

## 6. Publish agentic content clusters

- [x] 6.1 Create an intent-to-route map for agent sandbox, service-local-testing, workflow, comparison, glossary, and blog/demo content; reject duplicate or thin variants.
- [x] 6.2 Publish the first agent sandbox page for Claude Code only after it includes Claude-specific workflow details beyond the generic `/ai/` page.
- [x] 6.3 Draft Codex, Cursor, and Gemini CLI sandbox pages and hold them until each has platform-specific setup, examples, or caveats.
- [x] 6.4 Publish BigQuery and Pub/Sub agent-local-testing pages with SDK/env quickstart, prompt block, validation example, compatibility table, seed data where relevant, and production caveat.
- [x] 6.5 Prepare Firestore, Spanner, Cloud Storage, and Bigtable agent-local-testing pages only after source-backed compatibility details are ready.
- [x] 6.6 Publish workflow pages for GitHub Actions GCP emulator, Terraform GCP emulator, integration tests, and agentic CI with runnable YAML/script snippets and readiness checks.
- [x] 6.7 Publish balanced comparison pages for Google emulators, generic sandboxes such as E2B/Vercel, and BigQuery emulator alternatives with primary-source citations and “where the alternative is better” sections.
- [x] 6.8 Publish glossary pages for GCP emulator, AI agent sandbox, MCP server, agentic CI, credentialless cloud development, BigQuery emulator, service emulator, and localhost cloud API.
- [x] 6.9 Publish P0 blog/demo posts: Claude Code local GCP sandbox, Google emulators vs LocalCloud for agents, BigQuery locally for agent-written pipelines.
- [x] 6.10 Add copy-prompt CTAs and analytics labels for quickstart, project integration, CI, troubleshooting, and service-specific prompts.
- [x] 6.11 Run content-fact, static SEO, schema, accessibility, and responsive checks for every published agentic page.

## 7. Launch and community operations

- [x] 7.1 Build a launch kit with runnable demo, copyable prompt, CLI transcript, screenshots/video script, compatibility matrix, limitations page, Docker image reference, and GitHub links.
- [x] 7.2 Run a fresh-machine launch rehearsal: agent follows `/ai/agents.md`, starts LocalCloud, exports env vars, creates or tests one GCP resource locally, and proves no real GCP credentials are used.
- [x] 7.3 Prepare Show HN post that leads with runnable demo, technical tradeoffs, limitations, and maintainer availability for comments.
- [x] 7.4 Prepare Product Hunt launch assets: maker comment, categories, GIF/video, tagline, screenshots, and feedback-focused CTA.
- [x] 7.5 Prepare Reddit posts for r/googlecloud, r/devops, r/LocalLLaMA, r/ClaudeAI, and similar communities with community-specific rule checks and feedback framing.
- [x] 7.6 Prepare DEV.to/LinkedIn/Medium syndication posts that preserve technical commands, source links, and canonical local.cloud URLs.
- [x] 7.7 Create a community response playbook for compatibility, security, Docker/MCP permissions, LocalStack comparison, generic sandbox comparison, pricing/licensing, and production validation questions.
- [x] 7.8 Track all launch posts, comments, objections, removals, GitHub issues, Docker pulls, docs visits, quickstart interactions, and follow-up tasks in the measurement ledger.
- [x] 7.9 Convert repeated objections into docs, FAQs, compatibility notes, skills, MCP tool guardrails, or product backlog items before the next launch wave.

## 8. Measurement and governance

- [x] 8.1 Create `docs/operations/agentic-economy-measurement.md` with owner, cadence, query set, channels, metrics, and review process.
- [x] 8.2 Add a CSV/template ledger for search visibility, AI citation checks, directory submissions, community posts, Docker pulls, MCP package downloads, skill repo installs/stars, and quickstart activation proxies.
- [x] 8.3 Define monthly AI-citation prompts for ChatGPT search, Perplexity, Gemini, Claude, and other answer engines; record cited URLs, competitor mentions, and factual accuracy.
- [x] 8.4 Review robots/WAF policy for Googlebot, OAI-SearchBot, PerplexityBot, ChatGPT-User, GPTBot, and other identifiable bots; document separate search/citation vs training policy.
- [x] 8.5 Add content freshness review for service compatibility, agent platform install instructions, MCP registry metadata, and skills every quarter or when platform docs change.
- [x] 8.6 Add a release checklist that validates agentic docs, MCP package metadata, skill specs, directory assets, copy prompts, and measurement ledger before promotion.
- [x] 8.7 Run `openspec validate agentic-economy-platform --strict` and fix proposal/design/spec/task issues before implementation begins.
