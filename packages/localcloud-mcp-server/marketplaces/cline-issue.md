# Cline marketplace draft

Repository: https://github.com/LocalGCloud/LocalGCloud.github.io/tree/main/packages/localcloud-mcp-server

Package: `@localcloud/localcloud-mcp-server`

Run command:

```bash
npx -y @localcloud/localcloud-mcp-server
```

Logo: `assets/icon.svg` placeholder; final listing should use an approved 400x400 LocalCloud mark.

Stability statement: pre-1.0 draft MCP server. Tools are intentionally conservative: no arbitrary shell strings, no real GCP credentials by default, bounded output, and confirmation gates for destructive operations.

Setup path: `README.md` and `docs/llms-install.md`.

Demo prompt:

> Use the LocalCloud MCP server to inspect my local GCP emulator setup, list available services, run diagnostics, and tell me what SDK environment variables I should set. Do not ask for or use real GCP credentials.
