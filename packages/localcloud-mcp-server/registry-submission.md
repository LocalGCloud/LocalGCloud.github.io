# MCP registry submission notes

Draft package name: `@localcloud/localcloud-mcp-server`

Primary registry file: [`server.json`](server.json).

Submission checklist:

- Confirm npm package is published and runnable with `npx -y @localcloud/localcloud-mcp-server`.
- Confirm Node minimum remains `>=22.12.0`.
- Confirm server stdout carries only MCP protocol traffic and operational logs go to stderr.
- Confirm `server.json` package version matches `package.json`.
- Confirm `SECURITY.md`, `PRIVACY.md`, and `README.md` links resolve from the public repository.
- Confirm icon URL is final, or keep `assets/icon.svg` marked as placeholder.
- Attach test evidence for schema/refusal/confirm/truncation/no-credentials behavior.

Do not claim marketplace availability until the registry accepts the submission.
