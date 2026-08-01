## ADDED Requirements

### Requirement: Portable LocalCloud Agent Skills repository

LocalCloud SHALL provide a standalone Agent Skills repository that packages reusable LocalCloud workflows as portable skills, with client-specific marketplace wrappers layered on top of the same canonical skill content.

#### Scenario: Repository is created
- **WHEN** the skills repository is published
- **THEN** it SHALL include a README, LICENSE, SECURITY.md, installation matrix, compatibility notes, and `skills/` directory
- **AND** it SHALL not require users to install a specific AI client to read or copy the skills.

#### Scenario: Client-specific wrapper is added
- **WHEN** Claude, Codex, Cursor, Copilot, or OpenCode packaging is added
- **THEN** it SHALL reference or package the canonical `skills/` content rather than maintaining divergent skill copies.

### Requirement: Agent Skills format compliance

Every LocalCloud skill SHALL follow the Agent Skills open standard.

#### Scenario: Skill is validated
- **WHEN** a skill directory is checked
- **THEN** it SHALL contain `SKILL.md`
- **AND** `SKILL.md` SHALL include YAML frontmatter with `name` and `description`
- **AND** `name` SHALL match the parent directory, use lowercase letters/numbers/hyphens only, avoid leading/trailing/consecutive hyphens, and be no more than 64 characters
- **AND** `description` SHALL be non-empty, no more than 1024 characters, and state what the skill does and when to use it.

#### Scenario: Supporting files are used
- **WHEN** a skill needs more context than the main instructions
- **THEN** detailed content SHALL be moved to `references/`, reusable snippets to `assets/`, and optional auditable helpers to `scripts/`
- **AND** `SKILL.md` SHALL link to those files by relative paths.

### Requirement: First six LocalCloud skills

The first release SHALL include six focused workflow skills: `localcloud-bigquery`, `localcloud-pubsub`, `localcloud-terraform`, `localcloud-ci-sidecar`, `localcloud-seed-data`, and `localcloud-sdk-tests`.

#### Scenario: BigQuery skill is present
- **WHEN** `skills/localcloud-bigquery/SKILL.md` is read
- **THEN** it SHALL teach agents to use LocalCloud's BigQuery emulator for local SQL, dataset/table setup, inserts, SDK query tests, and unsupported-feature checks
- **AND** it SHALL mention BigQuery coverage boundaries and link to LocalCloud BigQuery feature/coverage docs.

#### Scenario: Pub/Sub skill is present
- **WHEN** `skills/localcloud-pubsub/SKILL.md` is read
- **THEN** it SHALL teach agents to create topics/subscriptions, publish, pull or streaming-pull, ack messages, and verify payloads against `PUBSUB_EMULATOR_HOST=localhost:8085`
- **AND** it SHALL warn about documented gaps such as schema validation and BigQuery/GCS subscriptions where applicable.

#### Scenario: Terraform skill is present
- **WHEN** `skills/localcloud-terraform/SKILL.md` is read
- **THEN** it SHALL teach agents to validate existing Terraform GCP resources against LocalCloud using standard provider configuration and endpoint env vars
- **AND** it SHALL instruct agents not to introduce custom providers or real GCP credentials for local validation.

#### Scenario: CI sidecar skill is present
- **WHEN** `skills/localcloud-ci-sidecar/SKILL.md` is read
- **THEN** it SHALL teach agents to add LocalCloud as a CI service/container, wait for readiness, export env vars, run tests, and avoid real GCP secrets
- **AND** it SHALL document Docker/memory/port constraints.

#### Scenario: Seed data skill is present
- **WHEN** `skills/localcloud-seed-data/SKILL.md` is read
- **THEN** it SHALL teach agents to create deterministic seed data for supported services, load it through the admin API or startup mount, and reset tests to a known state
- **AND** it SHALL forbid production secrets and real customer data in examples.

#### Scenario: SDK tests skill is present
- **WHEN** `skills/localcloud-sdk-tests/SKILL.md` is read
- **THEN** it SHALL teach agents to adapt Python, Node.js, Go, or Java GCP SDK tests to LocalCloud endpoints
- **AND** it SHALL instruct agents to test actual SDK behavior rather than mocks where LocalCloud supports the service.

### Requirement: Skill body structure

Every LocalCloud skill SHALL use a consistent instruction structure that optimizes agent activation and safe execution.

#### Scenario: Agent activates a skill
- **WHEN** the full `SKILL.md` body is loaded
- **THEN** it SHALL include sections for When to use, Inputs to inspect, LocalCloud setup assumptions, Step-by-step workflow, Verification, Known gaps / when to fall back to real GCP, and Expected output.

#### Scenario: Agent lacks required context
- **WHEN** a skill requires project-specific test commands, language, CI provider, or service selection and the repo does not reveal it
- **THEN** the skill SHALL instruct the agent to inspect the repo first and ask only for information unavailable through tools/context.

### Requirement: Safety defaults for skills

LocalCloud skills SHALL be instruction-first and SHALL NOT pre-approve broad shell or filesystem tools by default.

#### Scenario: Skill includes executable script
- **WHEN** a `scripts/` helper is included
- **THEN** it SHALL be optional, source-visible, self-contained, and documented in `SKILL.md`
- **AND** it SHALL not require real GCP credentials.

#### Scenario: Host-specific allowed tools are configured
- **WHEN** any wrapper uses an `allowed-tools` or equivalent field
- **THEN** it SHALL list exact narrow commands/tools and document the security rationale.

### Requirement: Installation and discovery matrix

The skills repository SHALL document installation paths for major agent clients.

#### Scenario: User wants portable install
- **WHEN** a user follows the portable installation docs
- **THEN** the docs SHALL instruct copying or vendoring `skills/*` into `.agents/skills/` as the default cross-client path.

#### Scenario: User wants Claude install
- **WHEN** a user follows Claude installation docs
- **THEN** the docs SHALL explain Claude plugin/marketplace packaging and namespaced skill invocation.

#### Scenario: User wants GitHub Copilot install
- **WHEN** a user follows Copilot installation docs
- **THEN** the docs SHALL explain `.github/skills`, `.agents/skills`, and GitHub CLI skill workflows where applicable.

#### Scenario: User wants Cursor/Codex/OpenCode install
- **WHEN** a user follows Cursor, Codex, or OpenCode installation docs
- **THEN** the docs SHALL list the supported project/user skill roots and any compatibility caveats.

### Requirement: Skill quality and trigger testing

Every skill SHALL include activation and non-activation examples so maintainers can verify trigger quality.

#### Scenario: Skill release is prepared
- **WHEN** a skill is included in a release
- **THEN** it SHALL include at least one positive trigger prompt and one negative prompt in metadata or a reference file
- **AND** maintainers SHALL verify that the description front-loads the terms most likely to trigger the skill.

#### Scenario: LocalCloud claims change
- **WHEN** service support, endpoint, Docker image, or compatibility claims change
- **THEN** affected skill references SHALL be updated or flagged before release to avoid agent drift.
