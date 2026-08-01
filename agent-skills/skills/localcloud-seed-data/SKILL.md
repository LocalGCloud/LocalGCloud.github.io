---
name: localcloud-seed-data
description: "LocalCloud seed data GCP emulator workflows: use when creating deterministic YAML seeds, admin API loads, startup mounts, reset flows, and fake local fixtures."
---

# LocalCloud Seed Data

## When to use

Use this skill when a task mentions LocalCloud seed data, deterministic fixtures, seed YAML, admin API loading, startup seed mounts, reset-to-known-state, or multi-service local test data.

Do not use it for production data migration, backups, real customer data, real secrets, or credential material.

## Inputs to inspect

- Existing test fixtures, factories, seed files, migrations, and reset helpers.
- Services used by the repo: storage, Pub/Sub, Firestore, BigQuery, Secret Manager, Memorystore, or others documented by LocalCloud.
- Test isolation requirements and naming conventions.
- LocalCloud docs linked in [references/seed-data.md](references/seed-data.md).

Ask only when the desired fixture shape or service set is not inferable.

## LocalCloud setup assumptions

- Seed data is loaded into LocalCloud, not real Google Cloud.
- The admin API accepts YAML at `http://localhost:24080/_localcloud/seed`.
- Startup seed files can be mounted at `/etc/localcloud/seed.yaml`.
- Reset with seed restore uses `http://localhost:24080/_localcloud/reset`.
- Examples must use fake local secrets and synthetic data only.

## Step-by-step workflow

1. Identify the services and entities tests need.
2. Create minimal deterministic seed records with stable IDs and names.
3. Use fake values such as `sk-local-test-key-12345`; never include production secrets or customer data.
4. Load seeds through the admin API for ad hoc tests or mount the seed file at startup for CI/repeatability.
5. Reset before tests that need a known state.
6. Assert seeded data through the app's SDK path where practical.

See [assets/sample-seed.yaml](assets/sample-seed.yaml) and [references/seed-data.md](references/seed-data.md).

## Verification

Verify that the seed load succeeds and that tests can read seeded data through LocalCloud-backed SDK/API clients. Reset flows should prove the same fixture can be restored deterministically.

## Known gaps / when to fall back to real GCP

Seed files are for local development, testing, CI, and demos. Do not use them as production migration proof. Validate production data migrations and secret handling against real Google Cloud separately after removing LocalCloud endpoint variables.

## Expected output

Return seed files changed, services seeded, fake values used, load/reset method, test assertions, and any service-specific limitations.

## References

- [Seed data workflow details](references/seed-data.md)
- [Sample seed file](assets/sample-seed.yaml)
- [Trigger prompt examples](references/triggers.md)
- Seed data docs: https://local.cloud/docs/seed-data/
- Services: https://local.cloud/services/
- Compatibility: https://local.cloud/compatibility/
