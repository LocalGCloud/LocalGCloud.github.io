# AGENTS.md

Guidance for contributors and agents editing this skills repository.

## Non-negotiables

- Preserve each skill folder name and the matching `name` frontmatter value.
- Keep `SKILL.md` instruction-focused. Move long details to `references/` and reusable examples to `assets/`.
- Do not add broad tool permission lists or shell auto-approval.
- Do not require real GCP credentials, service-account JSON, billing projects, or production endpoints for LocalCloud validation.
- Link service claims to LocalCloud docs: `/compatibility/`, `/services/`, `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, and `/docs/seed-data/`.
- Prefer CLI-generated image/endpoints; the reviewed mutable image is `jaysen2apache/localcloud:latest` and remains release-unverified until a qualified digest is recorded.
- Preserve the proprietary-license boundary and do not turn technical CI/team examples into a legal grant.

## Required skill structure

Every `skills/<name>/SKILL.md` must include:

1. YAML frontmatter with `name` and `description`.
2. `## When to use`
3. `## Inputs to inspect`
4. `## LocalCloud setup assumptions`
5. `## Step-by-step workflow`
6. `## Verification`
7. `## Known gaps / when to fall back to real GCP`
8. `## Expected output`
9. References to any files in `references/` or `assets/`.
10. Positive and negative trigger prompts, either inline or in a linked reference.

## Release discipline

Before release, review `RELEASE.md`, confirm client metadata references `skills/`, and confirm all trigger descriptions front-load LocalCloud, GCP emulator, service name, and workflow terms.
