# Release Notes

## v0.1.0

Initial LocalCloud Agent Skills package.

### Skills

- `localcloud-bigquery`
- `localcloud-pubsub`
- `localcloud-terraform`
- `localcloud-ci-sidecar`
- `localcloud-seed-data`
- `localcloud-sdk-tests`

### Packaging

- Portable install path: copy `skills/*` into `.agents/skills/`.
- Claude metadata: `metadata/claude-plugin.json`.
- Codex metadata: `metadata/codex-plugin.json`.
- Client install guidance: `install/`.

### Safety

- LocalCloud workflows route SDKs and Terraform to localhost.
- Default workflows require no GCP account, Google credentials, service-account key, or billing project.
- Production validation remains a separate real-GCP pass after emulator variables are unset.
