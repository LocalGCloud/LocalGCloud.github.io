---
name: localcloud-terraform
description: "LocalCloud Terraform GCP emulator workflows: use when validating existing hashicorp/google resources against localhost endpoint overrides without custom providers or real GCP credentials."
---

# LocalCloud Terraform

## When to use

Use this skill when a task mentions LocalCloud Terraform, Google provider endpoint overrides, local Terraform validation, GCP emulator resources, or checking existing `.tf` files without reaching real Google Cloud.

Do not use it to create custom Terraform providers, configure production credentials, or validate resources LocalCloud documents as unsupported.

## Inputs to inspect

- Terraform modules, provider blocks, variables, backend config, and test commands.
- CI files that already run `terraform init`, `plan`, `apply`, or test wrappers.
- Existing `GOOGLE_*_CUSTOM_ENDPOINT` and `GOOGLE_APPLICATION_CREDENTIALS` handling.
- LocalCloud docs linked in [references/terraform.md](references/terraform.md).

Ask only for workspace, variable, or command details unavailable from the repo.

## LocalCloud setup assumptions

- LocalCloud runs from Docker image `jaysen2apache/localcloud`.
- Use the standard `hashicorp/google` provider; do not introduce a custom provider for LocalCloud.
- `http://localhost:24080/_localcloud/env?format=terraform` exports endpoint overrides and `GOOGLE_APPLICATION_CREDENTIALS=/dev/null` for local auth bypass.
- Local validation uses no real GCP account, credentials, service-account key, or billing project.

## Step-by-step workflow

1. Inspect existing Terraform structure and supported resource types.
2. Preserve provider blocks unless the repo already needs local-only variables.
3. Export LocalCloud Terraform env vars in the shell or CI step that runs Terraform.
4. Use existing Terraform commands with local variables and a non-production backend.
5. Validate supported resources such as storage buckets, Pub/Sub topics/subscriptions, BigQuery datasets/tables, Spanner instances/databases, and documented partial resources.
6. Report unsupported resources instead of calling real GCP.

See [references/terraform.md](references/terraform.md) for endpoint and resource guidance.

## Verification

Use the narrowest Terraform validation path available in the repo. Prefer an isolated workspace, test module, or plan/apply/destroy flow that exercises supported resources against LocalCloud endpoints.

## Known gaps / when to fall back to real GCP

Do not claim IAM, service accounts, DNS, Cloud SQL, VPC networking, billing, or organization/project management are locally validated unless LocalCloud docs state support. Run real-GCP validation only as a separate production-readiness step after unsetting LocalCloud env vars and intentionally configuring real credentials.

## Expected output

Return provider/resource files reviewed, endpoint variables used, resources validated or skipped, commands identified, and any unsupported resource caveats.

## References

- [Terraform workflow details](references/terraform.md)
- [Trigger prompt examples](references/triggers.md)
- Terraform docs: https://local.cloud/docs/terraform/
- Compatibility: https://local.cloud/compatibility/
- Services: https://local.cloud/services/
