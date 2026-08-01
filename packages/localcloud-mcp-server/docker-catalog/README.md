# Docker MCP Catalog draft

This is draft submission material for a Docker MCP Catalog-style listing.

## Runtime modes

- **No socket:** docs, services, schema validation, and static safety metadata work; Docker runtime/log/state tools report Docker unavailable.
- **Host Docker socket mounted:** runtime, logs, diagnostics, and state inspection can manage or inspect the `localcloud` container. Mounting a Docker socket is powerful and should only be done in trusted local environments.

## Test evidence to attach before submission

- Package-scoped typecheck and tests.
- `npx -y @localcloud/localcloud-mcp-server` starts a stdio MCP server with logs on stderr.
- Tool list includes all `localcloud-*` tools.
- `localcloud-runtime` stop/restart and `localcloud-state` reset refuse without `confirm: true`.
- `localcloud-gcp-client` refuses unsafe argv and stays dry-run by default.
