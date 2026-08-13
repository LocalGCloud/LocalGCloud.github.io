---
name: localcloud-bigquery
description: "LocalCloud BigQuery GCP emulator workflows: use when testing BigQuery SQL, datasets, tables, inserts, query jobs, or SDK behavior locally without real GCP credentials."
---

# LocalCloud BigQuery

## When to use

Use this skill when a task mentions LocalCloud BigQuery, BigQuery emulator, local SQL validation, dataset/table setup, insert rows, query jobs, SDK query tests, or BigQuery compatibility checks.

Do not use it for production BigQuery tuning, IAM setup, billing, reservations, or jobs that must run against real Google Cloud.

## Inputs to inspect

- Existing BigQuery client code, tests, schema files, migrations, SQL, and seed data.
- Project language and package scripts so verification uses the repo's narrowest relevant test.
- Existing emulator variables such as `BIGQUERY_EMULATOR_HOST` and `GOOGLE_CLOUD_PROJECT`.
- LocalCloud docs linked in [references/bigquery.md](references/bigquery.md).

Ask the user only for details unavailable from repo files or tool context.

## LocalCloud setup assumptions

- Start through the host CLI, then load the generated environment with `eval "$(localcloud env)"`.
- The reviewed default project is `local-gcp-project`; trust the generated BigQuery endpoint because host ports may be remapped.
- BigQuery behavior is feature-specific and release-unverified until an assembled image is qualified.
- Confirm the governing proprietary license permits the intended use before running LocalCloud.

## Step-by-step workflow

1. Inspect how the repo creates BigQuery clients and where tests live.
2. Start the selected CLI instance and load its generated BigQuery endpoint and project values into the test process.
3. Create or reuse deterministic local datasets and tables.
4. Insert small representative rows through the same SDK or API path the app uses.
5. Run representative queries, including edge cases that matter for the project.
6. If SQL or job features are unsupported, report the gap and link to LocalCloud coverage docs instead of falling back to real BigQuery.

See [references/bigquery.md](references/bigquery.md) for query examples and acceptance criteria.

## Verification

Verify actual SDK/API behavior against LocalCloud. Prefer the narrowest repo test that covers dataset/table creation, inserts, query execution, and result assertions. Do not replace this with mocks when LocalCloud supports the path.

## Known gaps / when to fall back to real GCP

Consult `/compatibility/` and BigQuery coverage docs before claiming support. Fall back to real Google Cloud only for an intentional production-readiness pass after unsetting emulator variables and after the user has configured real GCP credentials outside this LocalCloud workflow.

## Expected output

Return the files changed, emulator variables used, datasets/tables created, queries exercised, assertions made, and any unsupported BigQuery features found.

## References

- [BigQuery workflow details](references/bigquery.md)
- [Trigger prompt examples](references/triggers.md)
- LocalCloud compatibility: <https://local.cloud/compatibility/>
- LocalCloud services: <https://local.cloud/services/>
- SDK examples: <https://local.cloud/docs/sdk-examples/>
- BigQuery feature comparison: <https://local.cloud/docs/bigquery-feature-comparison/>
- BigQuery coverage gaps: <https://local.cloud/docs/bigquery-coverage-gaps/>
