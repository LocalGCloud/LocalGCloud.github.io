# Contributing

Keep MCP server changes focused under `packages/localcloud-mcp-server/`.

## Fact policy

Public claims about Docker image, service count, credentials, billing, service compatibility, ports, endpoints, or production boundaries must come from the shared LocalCloud fact sources (`src/data/agenticFacts.ts`, `src/data/services.ts`, and `src/data/productFacts.ts`) or a synchronized snapshot in this package.

## Code policy

- Use TypeScript and the official `@modelcontextprotocol/sdk` stdio server patterns.
- Keep stdout reserved for MCP protocol messages; write operational logs to stderr only.
- Do not add arbitrary shell execution. Use fixed binaries with argv arrays.
- Require `confirm: true` for destructive operations.
- Bound tool output and return truncation metadata.
- Do not require real GCP credentials for default development or CI workflows.

## Local checks

Package-scoped commands:

```bash
pnpm --dir packages/localcloud-mcp-server build
pnpm --dir packages/localcloud-mcp-server test
```

Avoid project-wide gates when making package-only changes unless a maintainer asks for them.
