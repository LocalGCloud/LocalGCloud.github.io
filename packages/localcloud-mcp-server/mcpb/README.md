# LocalCloud MCPB draft

This directory contains draft MCPB-style metadata for local distribution. The package is a stdio server that runs with:

```bash
npx -y @localcloud/localcloud-mcp-server
```

The bundle intentionally defaults to no real GCP credentials, no billing project, and no state reset or gcloud execution. Optional execution features require environment opt-ins and per-call `confirm: true`.

Use `../assets/icon.svg` as a placeholder until a final 400x400 registry icon is approved.
