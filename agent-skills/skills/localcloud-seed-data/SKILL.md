---
name: localcloud-seed-data
description: "Create deterministic LocalCloud YAML fixtures, load them through root seed endpoints, and reset project-scoped local state."
---

# LocalCloud seed data

## When to use

Use this skill for deterministic local fixtures, seed YAML, startup seed mounts, or reset-to-known-state workflows. Do not use it for production migrations, backups, customer data, or real secrets.

## Contract to preserve

- Load YAML with `POST /seed`; `POST /import` is an alias and `POST /reseed` reads `LOCALCLOUD_SEED_FILE` (default `/etc/localcloud/seed.yaml`).
- Accepted envelopes are flat service keys, `services:`, or multi-project `projects:`.
- Use `gcs`, `secretmanager.secrets`, and top-level `bigquery.tables` entries that each name a dataset.
- Firestore has no implemented seed registrar. Create Firestore fixtures through the SDK.
- `mode=volatile` is for Pub/Sub and Bigtable. Do not claim Firestore seeding.
- `LOCALCLOUD_TERRAFORM_MODE=true` skips seed operations.
- Examples contain synthetic data and fake local secrets only.

## Workflow

1. Inspect application fixtures and identify the smallest required service set.
2. Confirm every seeded service is enabled and available at the current tier.
3. Create stable IDs and minimal fake records using [assets/sample-seed.yaml](assets/sample-seed.yaml).
4. Load through `/seed`, or mount a read-only seed at `/etc/localcloud/seed.yaml`.
5. Assert data through the application's normal SDK/API path.
6. Reset only the intended project with `POST /reset?project=...`; use `{"restore_seed":true}` only when the last loaded seed should be restored.
7. Report unavailable registrars instead of silently changing to real Google Cloud.

See [references/seed-data.md](references/seed-data.md).

## Verification and boundary

Record the envelope, services, fake values, load/reset response, and SDK assertions. Persistence is service-specific and not proof of production durability. Validate production migrations and recovery separately against real Google Cloud after removing all LocalCloud endpoint values.
