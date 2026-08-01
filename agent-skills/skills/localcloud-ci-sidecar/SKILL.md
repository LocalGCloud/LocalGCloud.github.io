---
name: localcloud-ci-sidecar
description: "LocalCloud CI sidecar GCP emulator workflows: use when adding Docker service containers, readiness checks, env export, and local integration tests in CI without real GCP secrets."
---

# LocalCloud CI Sidecar

## When to use

Use this skill when a task mentions LocalCloud in CI, GCP emulator sidecar, GitHub Actions service container, readiness checks, Docker memory/ports, env export, or agentic CI validation.

Do not use it to add production GCP secrets, deploy infrastructure, or run broad project-wide gates unrelated to the requested LocalCloud workflow.

## Inputs to inspect

- Existing CI provider and workflow files.
- Package manager, test scripts, and integration-test naming conventions.
- Docker availability, service port assumptions, and any existing emulator setup.
- LocalCloud docs linked in [references/ci-sidecar.md](references/ci-sidecar.md).

Ask only for the test command or CI provider if the repo does not reveal them.

## LocalCloud setup assumptions

- CI uses Docker image `jaysen2apache/localcloud`.
- Expose required ports: `8080`, `4443`, `8085-8087`, `9010`, `9020`, `9050`, `9060`, and `6379` when services need them.
- Allocate about `4g` memory where the CI provider supports container memory options.
- No GCP account, Google credentials, service-account key, or billing project is required.

## Step-by-step workflow

1. Inspect existing CI workflows and identify the narrow integration test command.
2. Add LocalCloud as a service/container using the provider's native service mechanism where possible.
3. Wait for `http://localhost:24080/_localcloud/health` before tests.
4. Export shell env vars from `http://localhost:24080/_localcloud/env?format=shell` into the test process.
5. Run only the relevant integration tests unless the user asked for broader coverage.
6. Add cleanup only where CI resources persist beyond the job.
7. Keep real cloud secrets out of the LocalCloud job.

See [assets/github-actions-localcloud.yml](assets/github-actions-localcloud.yml) and [references/ci-sidecar.md](references/ci-sidecar.md).

## Verification

Verification should prove the CI job starts LocalCloud, waits for readiness, exports localhost env vars, and runs the chosen test command. Do not verify by merely checking YAML syntax.

## Known gaps / when to fall back to real GCP

Some CI providers restrict Docker-in-Docker, service port ranges, or memory settings. If LocalCloud cannot start in the chosen CI environment, report the blocker and do not switch to real GCP secrets. Real-GCP validation belongs in a separate, explicitly credentialed production-readiness job.

## Expected output

Return CI files changed, ports exposed, readiness gate, env export method, test command, cleanup behavior, and any CI provider constraints.

## References

- [CI sidecar details](references/ci-sidecar.md)
- [GitHub Actions template](assets/github-actions-localcloud.yml)
- [Trigger prompt examples](references/triggers.md)
- LocalCloud docs: https://local.cloud/docs/
- SDK examples: https://local.cloud/docs/sdk-examples/
- Terraform docs: https://local.cloud/docs/terraform/
