## ADDED Requirements

### Requirement: Canonical distribution metadata

LocalCloud SHALL maintain a canonical metadata set for agent-platform distribution and reuse it across registries, directories, marketplaces, package manifests, README files, and local.cloud pages.

#### Scenario: Metadata is prepared
- **WHEN** a distribution package or listing is created
- **THEN** it SHALL use a consistent product name, short tagline, long description, repository URL, documentation URL, privacy/security URLs, icon assets, license, and keywords
- **AND** the tagline SHALL fit under 55 characters where a directory requires short labels.

#### Scenario: Metadata describes LocalCloud
- **WHEN** metadata describes the default product behavior
- **THEN** it SHALL say LocalCloud gives coding agents a local GCP-compatible sandbox with no Google account, no GCP credentials, and normal GCP SDKs pointed at localhost
- **AND** it SHALL avoid claiming production replacement or full GCP compatibility.

### Requirement: Official MCP Registry and GitHub MCP Registry readiness

LocalCloud SHALL prepare the MCP server for official MCP Registry submission and downstream GitHub MCP Registry discovery.

#### Scenario: Registry server file is created
- **WHEN** `server.json` is generated
- **THEN** it SHALL include the MCP server name, title, description, repository, version, package artifacts, transports, icons, environment variables if any, license, and security/privacy documentation links.

#### Scenario: npm package is used for registry distribution
- **WHEN** npm is listed as a package artifact
- **THEN** `package.json` SHALL include registry-required package metadata such as matching MCP package name where applicable.

#### Scenario: OCI package is used for registry distribution
- **WHEN** OCI is listed as a package artifact
- **THEN** the image SHALL include the required MCP server name label/annotation and a documented tag/digest.

#### Scenario: MCPB package is used for registry distribution
- **WHEN** MCPB is listed as a package artifact
- **THEN** the listing SHALL include the release URL and SHA-256 file checksum where required.

### Requirement: Docker MCP Catalog readiness

LocalCloud SHALL support Docker MCP Catalog submission once the MCP server is packaged as a container or Docker-compatible local server.

#### Scenario: Docker catalog PR is prepared
- **WHEN** a Docker MCP Catalog submission is created
- **THEN** it SHALL include a Dockerfile or published image, `server.yaml`, `tools.json` or equivalent tool listing, README, icon URL, source repository/commit, configuration variables, required mounts/volumes, and category/tags.

#### Scenario: Docker permissions are documented
- **WHEN** the Docker package needs to control or inspect LocalCloud
- **THEN** documentation SHALL state whether it uses the Docker CLI, Docker socket, sibling containers, volume mounts, host networking, or assumes LocalCloud is already running.

### Requirement: Claude Desktop and Claude Connector readiness

LocalCloud SHALL provide a Claude Desktop-compatible local installation path and SHALL only pursue remote Claude Connector listing if a hosted/remote MCP server exists.

#### Scenario: MCPB bundle is prepared
- **WHEN** a Claude Desktop MCPB bundle is built
- **THEN** it SHALL include `manifest.json`, 512x512 icon, server config, tool metadata, prompts/resources metadata where supported, privacy policy URL, license, compatibility, and user configuration schema.

#### Scenario: Claude directory submission is considered
- **WHEN** LocalCloud submits to Claude Connectors Directory
- **THEN** the submission SHALL include docs URL, privacy policy URL, security model, icon, test instructions, examples for each tool, and tool annotations such as read-only/destructive hints where supported.

#### Scenario: Remote connector is requested
- **WHEN** a remote Claude connector is proposed
- **THEN** it SHALL be deferred unless LocalCloud has a hosted HTTPS MCP endpoint with appropriate authentication and privacy controls.

### Requirement: VS Code and GitHub Copilot integration

LocalCloud SHALL provide installation and configuration artifacts for VS Code MCP support and GitHub Copilot MCP workflows.

#### Scenario: VS Code user wants local MCP
- **WHEN** a user follows VS Code instructions
- **THEN** docs SHALL provide `.vscode/mcp.json` and user-profile configuration examples for stdio and, if available, HTTP transport
- **AND** mention VS Code trust prompts, sandboxing where supported, and tool enable/disable controls.

#### Scenario: GitHub Copilot cloud agent configuration is documented
- **WHEN** repository-level MCP config examples are provided for Copilot cloud agent or code review
- **THEN** examples SHALL use explicit tool allowlists and avoid destructive tools by default.

### Requirement: Cline marketplace readiness

LocalCloud SHALL prepare a Cline MCP Marketplace submission after the MCP server is stable and installable from public docs.

#### Scenario: Cline submission issue is prepared
- **WHEN** LocalCloud submits to Cline marketplace
- **THEN** the issue SHALL include repository URL, 400x400 PNG logo, reason for addition, stability confirmation, and confirmation that setup works from README and/or `llms-install.md`.

#### Scenario: Cline docs are added
- **WHEN** Cline-specific docs are published
- **THEN** they SHALL include local stdio config, optional remote config if supported, safety notes, and a runnable demo prompt.

### Requirement: Smithery and secondary MCP directory readiness

LocalCloud SHALL use secondary MCP directories as discovery multipliers after primary package metadata is stable.

#### Scenario: Smithery listing is prepared
- **WHEN** LocalCloud publishes on Smithery
- **THEN** it SHALL use MCPB for local stdio distribution or Streamable HTTP only if a hosted endpoint exists
- **AND** provide static server-card metadata where supported for predictable scanning.

#### Scenario: PulseMCP or Glama listing is prepared
- **WHEN** LocalCloud submits to PulseMCP, Glama, or similar directories
- **THEN** listing metadata SHALL point back to the official registry/repository/local.cloud docs and SHALL not become the canonical source of package truth.

### Requirement: Cursor and Zed integration paths

LocalCloud SHALL support Cursor and Zed through official registry metadata, client configuration snippets, and optional marketplace/deep-link paths only where source-confirmed.

#### Scenario: Cursor docs are published
- **WHEN** LocalCloud publishes Cursor setup docs
- **THEN** they SHALL include `.cursor/mcp.json`, global config examples, and optional install deep link only if the supported URL scheme/config source is confirmed.

#### Scenario: Zed docs are published
- **WHEN** LocalCloud publishes Zed setup docs
- **THEN** they SHALL include a custom context-server configuration snippet and explain that official MCP Registry listing is the preferred forward-compatible discovery path.

### Requirement: Fallback recipes for non-native clients

LocalCloud SHALL provide recipe pages for clients that do not have stable native MCP marketplace support.

#### Scenario: Aider user wants LocalCloud
- **WHEN** an Aider user opens the recipe
- **THEN** it SHALL show how to start LocalCloud separately, export SDK env vars, add relevant docs/context to the prompt, and test against localhost endpoints without claiming native MCP support.

#### Scenario: Continue legacy user wants LocalCloud
- **WHEN** a Continue user opens the recipe
- **THEN** it SHALL provide compatibility configuration only and state that Cursor is the active successor channel where appropriate.

### Requirement: GitHub repository discovery

Every public LocalCloud agent-tool repository SHALL be optimized for high-trust GitHub discovery.

#### Scenario: Repository is made public
- **WHEN** the MCP server or skills repository is published
- **THEN** it SHALL include a clear repository description, topics such as `mcp`, `model-context-protocol`, `gcp`, `google-cloud`, `emulator`, `local-development`, `docker`, `testing`, `integration-testing`, `ai-agents`, and `coding-agents` where relevant
- **AND** include README, LICENSE, SECURITY.md, CONTRIBUTING.md, issue templates, release notes, and install examples.

#### Scenario: Repository README is crawled
- **WHEN** GitHub search or registry reviewers inspect the README
- **THEN** the first 200 words SHALL communicate local GCP emulator, no credentials/account, Docker, SDK-compatible localhost endpoints, and agent-safe testing.
