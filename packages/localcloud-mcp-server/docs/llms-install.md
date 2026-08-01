# LocalCloud MCP install notes for agents

Use this path when an agent asks how to install the LocalCloud MCP server.

1. Prefer `npx -y @localcloud/localcloud-mcp-server` as the stdio command.
2. Do not request real GCP credentials for default LocalCloud workflows.
3. Ensure Docker is available only if runtime/log/state tools are needed.
4. Use `localcloud-docs` and `localcloud-services` first to learn supported services and gaps.
5. For destructive operations, require `confirm: true`.
6. For production readiness, unset emulator variables and validate against real Google Cloud outside LocalCloud.

Client examples live in [`client-configs.md`](client-configs.md).
