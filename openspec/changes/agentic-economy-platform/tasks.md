## 1. Establish agentic product facts and shared metadata

- [x] 1.1 Create an agentic-workflow fact inventory covering Docker image, service count, admin endpoints, env export formats, service statuses, ports, SDK env vars, Terraform env vars, known gaps, and production-validation boundary.
- [x] 1.2 Add or extend a shared service/endpoint metadata source used by `/ai/`, `/ai/agents.md`, `/llms.txt`, skill references, and agentic content pages.
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

## 3. Surface the canonical LocalCloud MCP integration

- [x] 3.1 Link agent-facing site content to the runtime repository’s canonical MCP integration guide.
- [x] 3.2 Describe the runtime-owned `/mcp` endpoint and `localcloud mcp` stdio bridge without copying protocol or tool catalogs into this site repository.
- [x] 3.3 Keep lifecycle, security, transport, and compatibility behavior authoritative in the LocalCloud runtime repository.

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
- [x] 5.11 Link the skills repository from `/ai/`, `/ai/agents.md`, `/llms.txt`, and relevant docs.

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
- [x] 7.9 Convert repeated objections into docs, FAQs, compatibility notes, skills, runtime MCP guidance, or product backlog items before the next launch wave.

## 8. Measurement and governance

- [x] 8.1 Create `docs/operations/agentic-economy-measurement.md` with owner, cadence, query set, channels, metrics, and review process.
- [x] 8.2 Add a CSV/template ledger for search visibility, AI citation checks, community posts, Docker pulls, skill repo installs/stars, and quickstart activation proxies.
- [x] 8.3 Define monthly AI-citation prompts for ChatGPT search, Perplexity, Gemini, Claude, and other answer engines; record cited URLs, competitor mentions, and factual accuracy.
- [x] 8.4 Review robots/WAF policy for Googlebot, OAI-SearchBot, PerplexityBot, ChatGPT-User, GPTBot, and other identifiable bots; document separate search/citation vs training policy.
- [x] 8.5 Add content freshness review for service compatibility, runtime MCP integration links, agent platform instructions, and skills every quarter or when platform docs change.
- [x] 8.6 Add a release checklist that validates agentic docs, runtime MCP links, skill specs, copy prompts, and the measurement ledger before promotion.
- [x] 8.7 Run `openspec validate agentic-economy-platform --strict` and fix proposal/design/spec/task issues before implementation begins.
