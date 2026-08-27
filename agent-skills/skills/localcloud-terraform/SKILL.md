---
name: localcloud-terraform
description: "Configure supported hashicorp/google resources for LocalCloud endpoint or transparent-network routing."
---

# LocalCloud Terraform

## When to use

Use this skill for local Terraform validation with the standard `hashicorp/google` provider. Do not use it to configure production credentials, claim broad provider compatibility, or send unsupported resources to real Google Cloud.

## Contract to preserve

- Maintained examples use `hashicorp/google ~> 7.0` (including 7.34.0).
- Provider v7 needs a syntactically valid fake service-account JSON file. Generated `/dev/null` output must be overridden.
- Endpoint-only mode uses `localcloud env --format terraform` or `/env?format=terraform`.
- Transparent-network mode is required for BigQuery and other clients that ignore custom endpoints; it requires explicit DNS/HTTP/HTTPS routing, trusted LocalCloud CA, and `LOCALCLOUD_TERRAFORM_MODE=true`.
- Gate Terraform on `/terraform/readiness`, not generic health alone.
- Keep endpoint values, fake credentials, state, and backend isolated from production.

## Workflow

1. Inspect provider version, resources, backend, project, and existing endpoint handling.
2. Compare resources with the currently documented list; report anything else as unsupported or unverified.
3. Choose endpoint-only or transparent-network mode and document why.
4. Before starting, create or update `localcloud.yaml` with `host.environment.LOCALCLOUD_TERRAFORM_MODE: "true"`; for transparent mode also set `host.transparent_network: true` and enable `tls`.
5. Run `localcloud start` with the minimum service set.
6. Create a valid fake credential file and export generated Terraform values in the same process.
7. Verify `/terraform/readiness?mode=endpoint` or `?mode=transparent`.
8. Run the narrowest `init`, `plan`, and—only in an isolated local state—`apply`/`destroy` path.
9. Fail closed if any request reaches real Google Cloud.

See [references/terraform.md](references/terraform.md).

## Verification and boundary

Report provider version, routing mode, resource list, endpoint/readiness output, plan/apply/destroy results, and unqualified resources. Local success does not validate IAM, quotas, regions, networking, concurrency, or recovery. Perform real-Google-Cloud validation separately in a clean environment. Organization/team-CI use must comply with the governing proprietary license.
