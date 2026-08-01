# Release Process

## Versioning

Use semantic versions for the skills package. Patch releases fix instructions, links, examples, or safety wording. Minor releases add skills or client wrappers. Major releases may rename or remove skills and must include a migration note.

## Pre-release checklist

1. Confirm every folder under `skills/` has a matching `SKILL.md` frontmatter `name`.
2. Confirm every `description` starts with high-signal trigger terms: LocalCloud, GCP emulator, service/workflow name, and the action.
3. Confirm `SKILL.md` bodies include the required sections listed in `AGENTS.md`.
4. Confirm positive and negative trigger prompts exist for every skill.
5. Confirm no skill or wrapper grants broad allowed tools or broad shell pre-approval.
6. Confirm no examples require real GCP credentials, service-account keys, billing projects, or production data.
7. Confirm LocalCloud facts still match the public docs: Docker image `jaysen2apache/localcloud`, 20+ services, localhost SDK/Terraform routing, no credentials by default, and real-GCP validation before production.
8. Confirm Claude, Codex, Copilot, Cursor, and OpenCode guidance references canonical `skills/` content.

## Release notes template

```markdown
# LocalCloud Agent Skills vX.Y.Z

## Added
- 

## Changed
- 

## Safety review
- No real GCP credentials required for LocalCloud workflows.
- No broad allowed-tool or shell permissions added.
- Skill names preserved: localcloud-bigquery, localcloud-pubsub, localcloud-terraform, localcloud-ci-sidecar, localcloud-seed-data, localcloud-sdk-tests.

## Docs reviewed
- https://local.cloud/compatibility/
- https://local.cloud/services/
- https://local.cloud/docs/
- https://local.cloud/docs/sdk-examples/
- https://local.cloud/docs/terraform/
- https://local.cloud/docs/seed-data/
```

## Publishing

Publish the repository or archive with `skills/` as the source of truth. Client metadata in `metadata/` may be copied into marketplace submissions, but submissions must not fork skill text into divergent copies.
