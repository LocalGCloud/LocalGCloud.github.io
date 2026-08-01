# Security Policy

Report vulnerabilities through GitHub Security Advisories for `LocalGCloud/LocalGCloud.github.io` or by opening a minimal issue that does not disclose exploit details publicly.

## Supported version

This package is pre-1.0. Security fixes target the latest published `0.x` release and the `packages/localcloud-mcp-server/` source directory.

## Security boundaries

- LocalCloud is for local development, testing, CI, and demos.
- Default workflows must not require a GCP account, Google credentials, service-account keys, or a billing project.
- The server does not execute arbitrary shell strings; process execution uses fixed binaries plus argv arrays.
- Destructive operations require `confirm: true`.
- Optional `localcloud-gcp-client` execution is disabled unless `LOCALCLOUD_MCP_ENABLE_GCP_CLIENT=1` is set and the call passes the argv allowlist.
- Validate against real Google Cloud before production deployment after unsetting emulator endpoint variables.

## Docker socket risk

Mounting the host Docker socket into any MCP server container grants broad host control. Prefer running the npm package directly during development. If using Docker, mount the socket only in trusted local environments and only when runtime management tools are needed.
