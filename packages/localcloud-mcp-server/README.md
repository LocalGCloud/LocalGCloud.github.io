# LocalCloud MCP Server

TypeScript/npm MCP stdio server for LocalCloud, the local Google Cloud emulator. It helps agents start, inspect, diagnose, and document LocalCloud without requiring a GCP account, Google credentials, service-account keys, or a billing project for default local workflows.

LocalCloud public facts preserved here:

- Docker image: `jaysen2apache/localcloud:latest` remains release-unverified; prefer the host CLI and pin a qualified digest for release work.
- Runtime: one Docker container selected through the host CLI.
- License: limited personal, non-commercial Individual Developer use; employer/organization, commercial, internal-tool, cost-saving, and team-CI use is excluded by the current proprietary license.
- Service catalog: 27 registry services with operation-level evidence and limitations.
- SDK posture: compatibility depends on service, client version, transport, and generated local endpoint values.

Useful docs: [Compatibility](https://local.cloud/compatibility/), [Services](https://local.cloud/services/), [Docs](https://local.cloud/docs/), [SDK examples](https://local.cloud/docs/sdk-examples/), [Terraform](https://local.cloud/docs/terraform/), [Seed data](https://local.cloud/docs/seed-data/), and [agent instructions](https://local.cloud/ai/agents.md).

Related package: [LocalCloud Agent Skills](../../agent-skills/) for service-specific agent workflows.

## Install

```bash
npm install -g @localcloud/localcloud-mcp-server
localcloud-mcp-server
```

Or run with `npx`:

```bash
npx -y @localcloud/localcloud-mcp-server
```

Requires Node.js `>=22.12.0`. Docker is needed for runtime management tools. The MCP server itself uses stdio; MCP protocol messages are written to stdout and operational logs are written only to stderr.

## Client config

Generic MCP stdio JSON:

```json
{
  "mcpServers": {
    "localcloud": {
      "command": "npx",
      "args": ["-y", "@localcloud/localcloud-mcp-server"]
    }
  }
}
```

See [`docs/client-configs.md`](docs/client-configs.md) for Claude, Cursor, VS Code/GitHub Copilot, Cline, Zed, OpenCode, Codex, Aider, Continue, Docker, and fallback examples.

## Tools

| Tool | Purpose | Safety behavior |
| --- | --- | --- |
| `localcloud-runtime` | Status, health, start, stop, restart, readiness for the Docker runtime | `stop` and `restart` require `confirm: true`; default image is `jaysen2apache/localcloud` |
| `localcloud-services` | Service metadata, ports, protocols, SDK env vars, docs URLs, supported behavior, known gaps | Uses a synchronized snapshot from `src/data/agenticFacts.ts` and `src/data/services.ts` |
| `localcloud-diagnostics` | Docker availability, container state, port checks, health endpoint, emulator env vars, routing pitfalls | Warns agents to stop rather than fall back to real GCP |
| `localcloud-logs` | Summary, errors, requests, or raw Docker logs | Bounds tail lines and bytes; returns truncation metadata |
| `localcloud-state` | Inspect container/admin state; optional reset | `reset` requires `confirm: true` and `LOCALCLOUD_MCP_ENABLE_STATE_RESET=1` |
| `localcloud-docs` | Canonical docs links, service-specific docs, prompts, safety boundaries | Uses local.cloud URLs as the primary corpus |
| `localcloud-gcp-client` | Dry-run planning for constrained `gcloud` argv | No shell; allowlisted command groups; blocks credential/project/billing/auth flags; execution remains disabled until runtime-generated `CLOUDSDK_API_ENDPOINT_OVERRIDES_*` values can be validated safely |

## Prompts

- `gcp-sandbox-tester`
- `write-localcloud-integration-test`
- `terraform-local-gcp-validation`
- `debug-localcloud-sdk-routing`

Each prompt repeats the no-credentials default, localhost routing requirement, licensing boundary, and real-GCP validation requirement.

## Safety model

- No arbitrary shell strings. Runtime and optional client operations use fixed binaries with argv arrays and `shell: false`.
- Destructive actions require explicit confirmation.
- Real GCP credentials are neither required nor requested for default workflows.
- The constrained `gcloud` tool is dry-run only. Static SDK emulator variables are insufficient to force gcloud routing; execution remains disabled until runtime-generated gcloud overrides can be validated.
- stdout is reserved for MCP protocol traffic; diagnostics go to stderr.
- LocalCloud is not a production replacement. Validate against real Google Cloud before production deployment.
- Technical tool availability does not grant permission under the proprietary LocalCloud license; review `LICENSE` before use.
- A read-write Docker socket grants broad host control. Mount it only in a trusted isolated environment when runtime-management tools require it.

## Docker

The package includes a Dockerfile for running the MCP server in a container. Runtime management requires access to Docker on the host. If you do not mount a Docker socket, docs/services/diagnostic schema tools still run, but container start/stop/log/state operations will report Docker unavailable.

## Development

```bash
pnpm install
pnpm --dir packages/localcloud-mcp-server build
pnpm --dir packages/localcloud-mcp-server test
```

Tests cover schemas, refusals, destructive confirmations, output truncation, endpoint enforcement, no-credential defaults, and stdout/stderr separation. Do not publish capability claims unless they are backed by the shared LocalCloud fact source and reviewed evidence.
