# LocalCloud Agent Skills

Portable Agent Skills for using LocalCloud as a local Google Cloud sandbox. The canonical skill content lives in `skills/`; client-specific wrappers reference that content rather than maintaining separate copies.

LocalCloud runs 20+ Google Cloud service emulators in one Docker container (`jaysen2apache/localcloud`). Standard GCP SDKs and Terraform are pointed at localhost endpoints. Default workflows require no GCP account, no Google credentials, and no billing project. Validate production-critical behavior against real Google Cloud after unsetting emulator variables.

## Skills included

| Skill | Use when |
| --- | --- |
| `localcloud-bigquery` | Testing BigQuery SQL, datasets/tables, inserts, and SDK queries against LocalCloud. |
| `localcloud-pubsub` | Testing Pub/Sub topics, subscriptions, publish/pull/ack, and streaming pull locally. |
| `localcloud-terraform` | Validating existing `hashicorp/google` Terraform resources through LocalCloud endpoint overrides. |
| `localcloud-ci-sidecar` | Adding LocalCloud as a CI service/container with readiness and env export gates. |
| `localcloud-seed-data` | Creating deterministic seed data and reset flows for local tests. |
| `localcloud-sdk-tests` | Adapting Python, Node.js, Go, or Java GCP SDK tests to localhost endpoints. |

## Portable install

Copy or vendor the canonical skills into your project:

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

Then ask your agent to load the relevant skill by name, for example: `Use the localcloud-pubsub skill to add a local Pub/Sub integration test.`

## Client install guides

- Install overview: [`INSTALL.md`](INSTALL.md)
- Install matrix: [`install/matrix.md`](install/matrix.md)
- Claude plugin metadata: [`metadata/claude-plugin.json`](metadata/claude-plugin.json) and [`install/claude.md`](install/claude.md)
- Codex plugin metadata: [`metadata/codex-plugin.json`](metadata/codex-plugin.json) and [`install/codex.md`](install/codex.md)
- GitHub Copilot: [`install/github-copilot.md`](install/github-copilot.md)
- Cursor: [`install/cursor.md`](install/cursor.md)
- OpenCode: [`install/opencode.md`](install/opencode.md)
- Release notes: [`RELEASE_NOTES.md`](RELEASE_NOTES.md)

## LocalCloud references

- Compatibility: https://local.cloud/compatibility/
- Services: https://local.cloud/services/
- Docs: https://local.cloud/docs/
- SDK examples: https://local.cloud/docs/sdk-examples/
- Terraform: https://local.cloud/docs/terraform/
- Seed data: https://local.cloud/docs/seed-data/

## Safety rules for all skills

- Do not ask for or use real GCP credentials in local LocalCloud workflows.
- Do not fall back to production Google Cloud when LocalCloud is unavailable.
- Prefer existing project test commands and inspect the repo before asking the user.
- Keep detailed service claims tied to LocalCloud docs and compatibility pages.
- Before production deployment, unset emulator variables and validate against real Google Cloud.

## Release process

See [`RELEASE.md`](RELEASE.md). Release checks preserve skill folder names, frontmatter names, client wrapper links, and trigger prompt quality.
