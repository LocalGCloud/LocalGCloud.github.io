## ADDED Requirements

### Requirement: Canonical agent landing page

LocalCloud SHALL provide an indexable `/ai/` page that presents LocalCloud as an agent-safe local GCP sandbox and gives humans a copyable prompt that directs agents to the authoritative machine-readable setup guide.

#### Scenario: Human developer opens the agent page
- **WHEN** a user visits `/ai/`
- **THEN** the page SHALL explain that LocalCloud lets AI agents test GCP code locally with no GCP account, no credentials, and no cloud spend
- **AND** the page SHALL include a primary copyable prompt: `Fetch https://local.cloud/ai/agents.md and follow the instructions to start LocalCloud on my machine.`
- **AND** the page SHALL link to the quickstart, services, SDK examples, Terraform docs, compatibility/limitations, GitHub, `/llms.txt`, and `/ai/agents.md`.

#### Scenario: Agent page is crawled
- **WHEN** `/ai/` is rendered during static build
- **THEN** it SHALL have a visible H1, meta title, meta description, self-canonical URL, `robots: index, follow`, and sitemap membership
- **AND** it SHALL expose a Markdown alternate link to `/ai/agents.md`.

### Requirement: Agent-executable Markdown guide

LocalCloud SHALL serve `/ai/agents.md` as the authoritative execution guide written directly to AI agents.

#### Scenario: Agent fetches setup guide
- **WHEN** an agent reads `/ai/agents.md`
- **THEN** the first section SHALL state that LocalCloud is a local Google Cloud emulator for development/testing/CI/demos, not real GCP
- **AND** it SHALL instruct the agent not to request or use real GCP credentials for the default local workflow
- **AND** it SHALL include exact Docker setup commands using `jaysen2apache/localcloud`
- **AND** it SHALL include the environment export command `eval "$(curl -s http://localhost:8080/_localcloud/env?format=shell)"`.

#### Scenario: Docker is missing or unavailable
- **WHEN** an agent follows `/ai/agents.md` and Docker is unavailable
- **THEN** the guide SHALL instruct the agent to stop and ask the user to install/start Docker rather than falling back to real GCP.

#### Scenario: Existing LocalCloud container is present
- **WHEN** the container named `localcloud` already exists
- **THEN** the guide SHALL instruct the agent how to check status, reuse it if healthy, or ask before replacing/removing it.

#### Scenario: LocalCloud readiness is uncertain
- **WHEN** the agent starts or reuses LocalCloud
- **THEN** the guide SHALL require a bounded health/readiness check against the LocalCloud admin endpoint before running SDK, Terraform, or seed-data workflows.

### Requirement: Machine-readable site discovery

LocalCloud SHALL maintain `/llms.txt` as a concise, spec-shaped LLM-readable site map and MAY add `/llms-full.txt` as a large-context bundle.

#### Scenario: Agent reads llms.txt
- **WHEN** `/llms.txt` is fetched
- **THEN** it SHALL start with `# LocalCloud`
- **AND** include a blockquote summary
- **AND** group links under H2 sections such as Start Here, Agent Setup, Core Docs, Services, Integrations, Reference, Comparisons, and Optional
- **AND** list `/ai/` and `/ai/agents.md` in the top-priority section with annotations explaining when to fetch them.

#### Scenario: Full context bundle exists
- **WHEN** `/llms-full.txt` is published
- **THEN** it SHALL include a table of contents, source URL before each included page, and a warning that `/llms.txt` is preferred for targeted fetching
- **AND** it SHALL be regenerated or validated when source docs materially change.

### Requirement: Per-page Markdown and copy controls

LocalCloud SHALL expose Markdown variants for core docs and service pages so agents can fetch clean content without parsing rendered HTML.

#### Scenario: Markdown variant is available
- **WHEN** a supported page has a Markdown alternative
- **THEN** the HTML page SHALL expose a visible or discoverable “Copy Markdown” or “Copy Markdown Link” affordance
- **AND** the Markdown output SHALL include title, canonical HTML URL, source page path, and last material update where available.

#### Scenario: Markdown indexing policy is configured
- **WHEN** Markdown variants are added to sitemap or robots policy
- **THEN** the implementation SHALL intentionally decide whether each Markdown route is indexable or canonicalized to the HTML route to avoid accidental duplicate-content drift.

### Requirement: Project AGENTS.md template

LocalCloud SHALL provide a downloadable or copyable AGENTS.md template for users to place in their own application repositories.

#### Scenario: User copies project agent instructions
- **WHEN** a user copies the LocalCloud AGENTS.md template
- **THEN** the template SHALL instruct coding agents to use LocalCloud for GCP integration tests by default
- **AND** it SHALL instruct agents not to use real GCP credentials or production endpoints unless the user explicitly asks
- **AND** it SHALL include placeholders for project-specific test commands and service caveats.

#### Scenario: User confuses `/ai/agents.md` with `AGENTS.md`
- **WHEN** the `/ai/` page explains both files
- **THEN** it SHALL distinguish remote product setup instructions (`/ai/agents.md`) from repo-local project instructions (`AGENTS.md`).

### Requirement: Agent prompt library

The `/ai/` page SHALL include copyable prompts for common agent workflows.

#### Scenario: User wants quick setup
- **WHEN** a user chooses the quick setup prompt
- **THEN** the prompt SHALL direct the agent to fetch `/ai/agents.md`, start LocalCloud, export emulator environment variables, and verify one local GCP SDK call.

#### Scenario: User wants project integration
- **WHEN** a user chooses the existing-repo prompt
- **THEN** the prompt SHALL instruct the agent to inspect the project, configure emulator environment variables, run a narrow integration test, and avoid real GCP credentials.

#### Scenario: User wants CI setup
- **WHEN** a user chooses the CI prompt
- **THEN** the prompt SHALL instruct the agent to propose the smallest CI change that starts LocalCloud, waits for readiness, exports env vars, and runs existing integration tests locally.

### Requirement: Safety and compatibility boundaries in agent docs

Every agent-facing entry point SHALL preserve LocalCloud's development-only boundary and service-compatibility caveats.

#### Scenario: Agent docs mention a service
- **WHEN** `/ai/`, `/ai/agents.md`, `/llms.txt`, or AGENTS.md template mentions a LocalCloud service
- **THEN** it SHALL link to the service catalog or relevant service docs
- **AND** it SHALL avoid claiming production parity unless backed by reviewed compatibility evidence.

#### Scenario: Agent docs mention production
- **WHEN** agent-facing docs describe switching to real GCP
- **THEN** they SHALL say to unset emulator environment variables and validate against real Google Cloud before production deployment.
