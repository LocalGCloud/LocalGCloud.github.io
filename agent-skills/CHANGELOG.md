# Changelog

## 0.1.0 - Initial LocalCloud Agent Skills package

### Added

- Repository-style `agent-skills/` package with README, license, security policy, contributor guidance, install matrix, and release process.
- Six canonical skills: `localcloud-bigquery`, `localcloud-pubsub`, `localcloud-terraform`, `localcloud-ci-sidecar`, `localcloud-seed-data`, and `localcloud-sdk-tests`.
- Per-skill references, trigger prompts, and reusable assets for CI and seed data.
- Claude and Codex plugin metadata that references canonical `skills/` content.
- GitHub Copilot, Cursor, and OpenCode install guidance.

### Safety review

- No broad tool permission or shell auto-approval configuration.
- No real GCP credentials required.
- LocalCloud mutable image identity is `jaysen2apache/localcloud:latest`; prefer CLI-generated values and a qualified digest for release work.
- Proprietary-license and production boundaries preserved: confirm permitted use, then validate authorized release behavior against real Google Cloud after clearing emulator variables.
