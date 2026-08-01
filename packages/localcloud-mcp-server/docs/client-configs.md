# LocalCloud MCP client configuration

All examples run the stdio package with:

```bash
npx -y @localcloud/localcloud-mcp-server
```

The server writes MCP JSON-RPC protocol messages to stdout and operational logs to stderr. Default workflows require no GCP account, no Google credentials, no service-account key, and no billing project. LocalCloud is for development, testing, CI, and demos; validate against real Google Cloud before production after unsetting emulator variables.

Canonical docs: [Compatibility](https://local.cloud/compatibility/), [Services](https://local.cloud/services/), [Docs](https://local.cloud/docs/), [SDK examples](https://local.cloud/docs/sdk-examples/), [Terraform](https://local.cloud/docs/terraform/), [Seed data](https://local.cloud/docs/seed-data/).

## Generic MCP JSON

```json
{
  "mcpServers": {
    "localcloud": {
      "command": "npx",
      "args": ["-y", "@localcloud/localcloud-mcp-server"],
      "env": {
        "LOCALCLOUD_MCP_ENABLE_GCP_CLIENT": "0",
        "LOCALCLOUD_MCP_ENABLE_STATE_RESET": "0"
      }
    }
  }
}
```

## Claude Code

CLI form commonly used by stdio MCP servers:

```bash
claude mcp add localcloud -- npx -y @localcloud/localcloud-mcp-server
```

If editing JSON directly, use the generic `mcpServers.localcloud` block above.

## Claude Desktop

Add to the local Claude Desktop MCP config file:

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

Use the MCPB draft in `../mcpb/manifest.json` when testing local bundle flows.

## Cursor

Project-level `.cursor/mcp.json`:

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

## VS Code and GitHub Copilot

Project-level `.vscode/mcp.json` for clients that use the VS Code MCP server schema:

```json
{
  "servers": {
    "localcloud": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@localcloud/localcloud-mcp-server"]
    }
  }
}
```

For Copilot cloud/coding-agent environments, allow only localhost LocalCloud endpoints and do not provide Google credentials unless a production-validation task explicitly requires real GCP outside LocalCloud.

## Cline

Use the same stdio server definition in Cline's MCP settings:

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

Marketplace issue assets are in `../server-card.json`, `../assets/icon.svg`, and `../README.md`.

## Zed

For Zed context server settings, use a stdio command entry equivalent to:

```json
{
  "context_servers": {
    "localcloud": {
      "command": {
        "path": "npx",
        "args": ["-y", "@localcloud/localcloud-mcp-server"]
      }
    }
  }
}
```

Check the current Zed documentation before publishing a marketplace-specific claim.

## OpenCode

If your OpenCode version accepts local MCP stdio servers, configure the command as:

```json
{
  "mcp": {
    "localcloud": {
      "type": "local",
      "command": ["npx", "-y", "@localcloud/localcloud-mcp-server"]
    }
  }
}
```

Otherwise run through the client's documented MCP bridge/proxy and use the generic stdio command.

## Codex-style clients

TOML-style local stdio config:

```toml
[mcp_servers.localcloud]
command = "npx"
args = ["-y", "@localcloud/localcloud-mcp-server"]
```

Keep Docker and LocalCloud available in the same environment as the MCP server process.

## Aider fallback

If native MCP is unavailable, run a bridge/proxy supported by your Aider setup and point it at:

```bash
npx -y @localcloud/localcloud-mcp-server
```

Do not ask the agent to use real GCP as a fallback for LocalCloud failures.

## Continue legacy fallback

For Continue versions without a native MCP server entry, use the documented MCP bridge for that Continue version and the generic stdio command. Prefer `localcloud-docs`, `localcloud-services`, and dry-run `localcloud-gcp-client` until Docker access is explicitly available.

## Docker usage

Run the MCP package in Docker without host Docker control:

```bash
docker build -t localcloud-mcp-server:0.1.0 .
docker run --rm -i localcloud-mcp-server:0.1.0
```

If you need runtime/log/state tools from inside the MCP container, mount the Docker socket only in a trusted local environment:

```bash
docker run --rm -i \
  -v /var/run/docker.sock:/var/run/docker.sock \
  localcloud-mcp-server:0.1.0
```

## Optional execution flags

Keep defaults unless you explicitly need these behaviors:

```json
{
  "env": {
    "LOCALCLOUD_MCP_ENABLE_GCP_CLIENT": "1",
    "LOCALCLOUD_MCP_ENABLE_STATE_RESET": "1"
  }
}
```

Even with those flags, tool calls still need `confirm: true` where required.
