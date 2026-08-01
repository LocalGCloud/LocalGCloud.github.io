## ADDED Requirements

### Requirement: Runnable-demo launch gate

LocalCloud SHALL NOT promote the agentic-economy campaign in public launch/community channels until a runnable demo proves the agent workflow end-to-end.

#### Scenario: Launch readiness is reviewed
- **WHEN** launch readiness is assessed
- **THEN** reviewers SHALL confirm one prompt can direct an agent to start LocalCloud, configure local GCP endpoints, run at least one SDK or Terraform smoke test, and avoid real GCP credentials
- **AND** the demo SHALL include observable proof such as container health, SDK result, Terraform output, console/log evidence, or test output.

#### Scenario: Demo cannot be reproduced
- **WHEN** the demo fails on a fresh developer machine with Docker available
- **THEN** public launch SHALL be delayed until setup docs or product behavior are corrected.

### Requirement: Launch asset checklist

LocalCloud SHALL prepare reusable assets before launch posts, directory submissions, and co-marketing outreach.

#### Scenario: Launch kit is prepared
- **WHEN** the launch kit is assembled
- **THEN** it SHALL include a 60–90 second demo script or clip, screenshot set, CLI transcript, copyable prompt, quickstart URL, service compatibility matrix, known limitations, Docker image reference, GitHub/repository links, and security/credentialless positioning.

#### Scenario: Marketplace assets are prepared
- **WHEN** marketplace submissions are planned
- **THEN** required icons, social/OpenGraph image, short tagline, long description, privacy/security URLs, tool inventory, and installation snippets SHALL be available.

### Requirement: Community launch channel rules

LocalCloud SHALL adapt launch messaging to each community's rules and norms rather than posting generic promotional copy.

#### Scenario: Hacker News Show HN post is prepared
- **WHEN** a Show HN post is drafted
- **THEN** it SHALL lead with a directly tryable product/demo, include technical tradeoffs and limitations, and have maintainers ready to answer questions.

#### Scenario: Product Hunt launch is prepared
- **WHEN** Product Hunt launch copy is drafted
- **THEN** it SHALL use concise demo-led messaging, maker comment, category alignment with developer tools/AI agents/infrastructure, and a feedback request rather than fake urgency.

#### Scenario: Reddit post is prepared
- **WHEN** posting to r/googlecloud, r/devops, r/LocalLLaMA, r/ClaudeAI, or similar communities
- **THEN** the post SHALL follow that community's self-promotion rules, lead with technical value, and ask for edge cases/feedback rather than presenting only an ad.

#### Scenario: DEV or blog syndication is prepared
- **WHEN** content is syndicated to DEV.to, LinkedIn, Medium, or similar sites
- **THEN** it SHALL preserve source links to local.cloud and include runnable commands or concrete lessons.

### Requirement: Directory and ecosystem outreach sequence

LocalCloud SHALL sequence registry/directory/community outreach based on product readiness and trust requirements.

#### Scenario: MCP server is not yet installable
- **WHEN** MCP server artifacts are incomplete
- **THEN** LocalCloud SHALL not submit to MCP directories that require runnable package artifacts
- **AND** SHALL instead promote `/ai/agents.md`, skills, or docs as the current agent workflow.

#### Scenario: MCP server is installable
- **WHEN** the MCP server has npm/stdin packaging, README, security docs, tool schemas, and examples
- **THEN** LocalCloud SHALL submit first to the official MCP Registry/GitHub MCP surface, then Docker MCP Catalog, Cline, Smithery, Claude/MCPB, and secondary directories as applicable.

#### Scenario: Early users report failures
- **WHEN** launch feedback identifies setup, compatibility, or agent misrouting failures
- **THEN** those failures SHALL be logged and converted into docs, product issues, skill updates, or MCP guardrails before the next promotion wave.

### Requirement: Community response playbook

LocalCloud SHALL maintain a response playbook for common technical objections in agentic cloud development.

#### Scenario: User asks about compatibility
- **WHEN** community feedback asks “how close is this to real GCP?”
- **THEN** the response SHALL link to compatibility/service docs, state known gaps, and recommend real-GCP validation before production.

#### Scenario: User asks about security
- **WHEN** community feedback asks about Docker, MCP, credentials, or local process access
- **THEN** the response SHALL explain LocalCloud's no-credential default, local endpoint model, Docker permissions, MCP tool boundaries, and security docs.

#### Scenario: User compares LocalCloud to LocalStack, E2B, or Vercel Sandbox
- **WHEN** comparisons arise
- **THEN** the response SHALL clarify that LocalStack is AWS-focused, E2B/Vercel are generic code/Linux sandboxes, and LocalCloud provides local GCP service APIs; it SHALL acknowledge where alternatives are better.

### Requirement: Measurement ledger

LocalCloud SHALL maintain a measurement ledger for agentic-economy growth and adoption.

#### Scenario: Campaign starts
- **WHEN** the first launch asset goes live
- **THEN** the ledger SHALL record launch date, URL, channel, target audience, CTA, owner, baseline Docker pulls, site traffic, quickstart interactions, and known caveats.

#### Scenario: Search visibility is reviewed
- **WHEN** monthly search review occurs
- **THEN** the ledger SHALL track impressions, clicks, average position, indexed state, canonical URL, and query cluster for agent, service, workflow, comparison, and glossary pages.

#### Scenario: AI visibility is reviewed
- **WHEN** monthly AI-citation checks occur
- **THEN** the ledger SHALL record prompts, answer engine, whether LocalCloud was mentioned/cited, cited URL, competing products cited, and factual accuracy of claims such as no credentials, service count, Docker image, and limitations.

#### Scenario: Community launch is reviewed
- **WHEN** a community post is evaluated
- **THEN** success SHALL be judged by qualified comments, GitHub issues, Docker pulls, docs visits, setup completions, and useful objections, not only upvotes or points.

### Requirement: Crawler and bot policy review

LocalCloud SHALL intentionally manage crawler/bot policy for search and answer-engine visibility.

#### Scenario: Robots policy is reviewed
- **WHEN** bot policy is updated
- **THEN** LocalCloud SHALL decide and document whether to allow search/citation bots such as Googlebot, OAI-SearchBot, PerplexityBot, and similar crawlers separately from training bots where distinguishable.

#### Scenario: Bot traffic is analyzed
- **WHEN** logs or analytics identify AI/search crawler traffic
- **THEN** measurement SHALL distinguish crawler fetches from human traffic and avoid treating crawler fetches as conversions.

### Requirement: Post-launch learning loop

LocalCloud SHALL convert repeated launch/community questions into durable product and content improvements.

#### Scenario: Same objection appears repeatedly
- **WHEN** an objection appears in three or more high-signal comments/issues/conversations
- **THEN** the team SHALL create or update a FAQ, compatibility note, troubleshooting section, skill guidance, or product backlog item.

#### Scenario: New use case emerges
- **WHEN** users demonstrate an unexpected agent workflow with LocalCloud
- **THEN** the team SHALL evaluate whether it belongs in skills, MCP prompts, docs, blog content, or product roadmap.
