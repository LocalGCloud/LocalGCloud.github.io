# LocalCloud MCPB draft

This directory contains draft MCPB-style metadata for local distribution. The package is a stdio server that runs with:

```bash
npx -y @localcloud/localcloud-mcp-server
```

The bundle intentionally defaults to no real GCP credentials, no billing project, and no state reset. The gcloud tool is dry-run only until runtime-generated endpoint overrides can be validated safely. State reset remains opt-in and requires per-call `confirm: true`.

LocalCloud use remains governed by the bundled proprietary `LICENSE`. Technical MCP functionality does not grant employer/organization, commercial, internal-tool, cost-saving, or team-CI permission. A Docker socket mount grants broad host control and should be enabled only in trusted isolated environments.

Use `../assets/icon.svg` as a placeholder until a final 400x400 registry icon is approved.
