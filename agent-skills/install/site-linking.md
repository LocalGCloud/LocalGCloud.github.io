# Site Link Targets

These link targets are for LocalCloud site surfaces that want to advertise the skills package while keeping `skills/` as the canonical source.

## Suggested links

- `/ai/`: "Agent Skills package" -> repository path `agent-skills/README.md` or the published skills repository URL.
- `/ai/agents.md`: include a machine-readable note: `Portable skills: copy agent-skills/skills/* into .agents/skills/ and invoke localcloud-bigquery, localcloud-pubsub, localcloud-terraform, localcloud-ci-sidecar, localcloud-seed-data, or localcloud-sdk-tests.`
- `/llms.txt`: add an agent resources entry for the published skills repository and the portable install path.
- MCP README: link to `agent-skills/README.md` as the companion skill pack for agents that do not use MCP.
- Relevant docs: add contextual links from `/docs/sdk-examples/`, `/docs/terraform/`, and `/docs/seed-data/`.

## Link wording

Use wording that preserves the safety boundary: LocalCloud skills route SDKs and Terraform to localhost by default, require no GCP account or credentials, and require real-GCP validation before production.
