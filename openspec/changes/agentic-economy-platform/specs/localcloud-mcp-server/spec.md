## ADDED Requirements

### Requirement: Local-first MCP server transport

LocalCloud SHALL provide a local-first MCP server design whose initial supported transport is stdio and whose runtime never requires a LocalCloud account, GCP account, GCP billing project, or Google credentials for default local use.

#### Scenario: User installs MCP server through npm
- **WHEN** an MCP client starts the LocalCloud MCP server with `npx -y <localcloud-mcp-package>`
- **THEN** the server SHALL communicate over stdio using valid MCP JSON-RPC messages
- **AND** all diagnostic logs SHALL be written to stderr, not stdout.

#### Scenario: Remote HTTP is requested
- **WHEN** a future implementation exposes Streamable HTTP
- **THEN** it SHALL bind local development mode to `127.0.0.1` by default
- **AND** implement origin validation, authentication for non-local access, output limits, and documented threat boundaries.

### Requirement: MCP tool schema and structured outputs

Every LocalCloud MCP tool SHALL use stable namespaced tool names, JSON Schema-compatible input schemas, structured outputs, and human-readable text mirrors.

#### Scenario: Client lists LocalCloud tools
- **WHEN** an MCP client calls `tools/list`
- **THEN** every tool SHALL include a stable lowercase hyphenated name prefixed with `localcloud-`
- **AND** every tool SHALL include a clear description that says operations target LocalCloud/local emulator endpoints only.

#### Scenario: Client calls a tool
- **WHEN** an MCP client calls any LocalCloud tool
- **THEN** the result SHALL include structured content conforming to the documented output schema
- **AND** include a concise text summary suitable for clients that do not consume structured output.

### Requirement: Runtime lifecycle tool

The MCP server SHALL provide a `localcloud-runtime` tool for starting, stopping, restarting, checking status, and checking health of the LocalCloud Docker sandbox.

#### Scenario: Agent checks runtime status
- **WHEN** `localcloud-runtime` is called with `action=status`
- **THEN** it SHALL return whether the LocalCloud container exists, whether it is running, the container name, image/tag, mapped ports, health status, and next recommended action.

#### Scenario: Agent starts LocalCloud
- **WHEN** `localcloud-runtime` is called with `action=start`
- **THEN** it SHALL use `jaysen2apache/localcloud` as the default image unless a caller explicitly provides an allowed image override
- **AND** it SHALL return endpoint URLs and environment export guidance after readiness succeeds.

#### Scenario: Agent stops or restarts LocalCloud
- **WHEN** `localcloud-runtime` is called with `action=stop` or `action=restart`
- **THEN** the call SHALL require `confirm: true`
- **AND** return a before/after status summary.

### Requirement: Service discovery tool

The MCP server SHALL provide a `localcloud-services` tool that exposes service availability, endpoints, environment variables, documentation links, and known caveats.

#### Scenario: Agent lists all services
- **WHEN** `localcloud-services` is called without a service filter
- **THEN** it SHALL return every known LocalCloud service with display name, status (`supported`, `partial`, `planned`, or `unsupported`), endpoint/port if available, SDK env vars, docs URL, and a concise caveat.

#### Scenario: Agent requests one service
- **WHEN** `localcloud-services` is called with `service=bigquery`
- **THEN** it SHALL return BigQuery-specific endpoint/env configuration, docs links, support notes, and known gaps such as unsupported advanced SQL features where documented.

### Requirement: Safe GCP-local operation tool

The MCP server MAY provide a `localcloud-gcp-client` tool for safe local GCP operations, but it SHALL NOT expose arbitrary shell execution.

#### Scenario: Agent runs a local GCP operation
- **WHEN** `localcloud-gcp-client` is called
- **THEN** it SHALL accept structured arguments or allowlisted command groups rather than shell strings
- **AND** enforce LocalCloud endpoint variables and fake/local project defaults
- **AND** block real-cloud endpoints, credential mutation commands, auth flows, shell chaining, pipes, redirects, and environment expansion.

#### Scenario: Operation would hit real Google Cloud
- **WHEN** a requested operation lacks emulator endpoint configuration or attempts to use production Google APIs
- **THEN** the tool SHALL refuse to run and return remediation instructions.

### Requirement: Logs and diagnostics tools

The MCP server SHALL provide tools for logs and diagnostics that help agents debug LocalCloud failures without asking users to paste raw terminal output.

#### Scenario: Agent analyzes logs
- **WHEN** `localcloud-logs` is called with `analysisType=errors`
- **THEN** it SHALL return grouped recent errors, service hints, bounded excerpts, truncation metadata, and next debugging steps.

#### Scenario: Agent checks prerequisites
- **WHEN** `localcloud-diagnostics` is called
- **THEN** it SHALL check Docker availability, container status, port conflicts, LocalCloud health endpoint, env var configuration, and likely SDK misrouting issues.

### Requirement: State and seed tools

The MCP server SHALL expose local state/reset/seed workflows only with explicit destructive-operation safeguards.

#### Scenario: Agent inspects state
- **WHEN** `localcloud-state` is called with `action=inspect`
- **THEN** it SHALL return a service-level state/resource summary where supported.

#### Scenario: Agent resets state
- **WHEN** `localcloud-state` is called with `action=reset`
- **THEN** it SHALL require `confirm: true`
- **AND** allow the caller to target all services or a documented subset
- **AND** return the affected services and post-reset health status.

#### Scenario: Agent loads seed data
- **WHEN** `localcloud-fixtures` or seed functionality is called
- **THEN** it SHALL accept only local fixture data or file paths explicitly provided by the user/project
- **AND** reject real secrets or production data patterns where detectable.

### Requirement: Docs and prompt capabilities

The MCP server SHALL expose LocalCloud documentation context and reusable prompts for common workflows.

#### Scenario: Agent searches docs
- **WHEN** `localcloud-docs` is called with a query
- **THEN** it SHALL return focused snippets with source URLs, section titles, and confidence/coverage notes
- **AND** prefer local.cloud docs, service catalog, `/llms.txt`, and `/ai/agents.md` as primary sources.

#### Scenario: Client lists prompts
- **WHEN** the MCP client supports prompts
- **THEN** the server SHOULD expose prompts such as `gcp-sandbox-tester`, `write-localcloud-integration-test`, `terraform-local-gcp-validation`, and `debug-localcloud-sdk-routing`.

### Requirement: Packaging and registry metadata

The LocalCloud MCP server SHALL be packaged for broad discovery and installation.

#### Scenario: npm package is published
- **WHEN** the package is published to npm
- **THEN** `package.json` SHALL include the MCP package metadata required by the official MCP Registry where applicable
- **AND** README SHALL include Claude, Cursor, VS Code/Copilot, Cline, and generic MCP client snippets.

#### Scenario: MCP Registry submission is prepared
- **WHEN** registry metadata is created
- **THEN** `server.json` SHALL include name, title, description, repository, version, package metadata, transports, environment variables, icon, license, and security/privacy URLs.

#### Scenario: OCI or MCPB packaging is added
- **WHEN** an OCI image or MCPB bundle is published
- **THEN** it SHALL include required MCP package labels/checksums, icon assets, and documented permissions/mounts.

### Requirement: Security and trust documentation

The MCP server repository SHALL include security, privacy, and threat-model documentation before directory submissions.

#### Scenario: Marketplace reviewer inspects repository
- **WHEN** a reviewer opens the repository
- **THEN** README, SECURITY.md, privacy policy, LICENSE, tool inventory, Docker permission explanation, and examples SHALL be present
- **AND** destructive tools SHALL be marked and documented.

#### Scenario: User asks whether GCP credentials are needed
- **WHEN** MCP installation docs describe setup
- **THEN** they SHALL state that default LocalCloud use requires no GCP account, no GCP credentials, and no billing project.
