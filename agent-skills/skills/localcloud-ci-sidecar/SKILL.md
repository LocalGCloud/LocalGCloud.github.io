---
name: localcloud-ci-sidecar
description: "LocalCloud CI sidecar evaluation: use when reviewing a Docker-based local GCP job after confirming the current proprietary license permits the intended use."
---

# LocalCloud CI Sidecar

## When to use

Use this skill only for a license-permitted evaluation of a LocalCloud service-container workflow. The reviewed proprietary license excludes employer/organization use and team CI; technical CI support is not a license grant.

## Inputs to inspect

- The governing LocalCloud license and intended user/purpose.
- Existing CI provider and workflow files.
- Package manager and the narrow integration-test command.
- Exact qualified LocalCloud image identity and required services.

## LocalCloud setup assumptions

- Prefer the host CLI for personal local workflows. A service-container job must pin a qualified image digest rather than relying on a mutable tag.
- Canonical container ports are `24080-24092`; publish only required ports and bind loopback where the runner permits it.
- Health is `/health`; generated shell environment is `/env?format=shell`.
- Allocate the reviewed CLI default `4g` unless measured evidence supports another value.
- Docker-socket and transparent-network access remain off unless explicitly required and trusted.

## Step-by-step workflow

1. Stop if the intended CI use is not permitted by the governing license.
2. Inspect the existing workflow and choose the narrowest job and service set.
3. Pin the qualified LocalCloud image digest and publish only required canonical ports.
4. Wait for `/health` with a fail-closed loop and print container logs on failure.
5. Export `/env?format=shell` values into the test process; do not hard-code ports that may differ.
6. Run only the selected local integration tests without real GCP credentials.
7. Keep real-GCP release validation separate, explicitly credentialed, and authorized.

See [assets/github-actions-localcloud.yml](assets/github-actions-localcloud.yml) and [references/ci-sidecar.md](references/ci-sidecar.md).

## Verification

Prove the job fails when health never becomes ready, uses only generated local endpoints, runs the intended tests, and never falls back to real Google Cloud.

## Known gaps / when to fall back to real GCP

No qualified assembled image was available during the documentation remediation, so the template is a reviewed pattern rather than an executed release fixture. Docker and networking restrictions vary by CI provider. Report blockers; never add real GCP secrets as an automatic fallback.

## Expected output

Return the license decision, pinned image identity, ports, readiness gate, environment export, test command, cleanup, and residual qualification gaps.

## References

- [CI sidecar details](references/ci-sidecar.md)
- [GitHub Actions template](assets/github-actions-localcloud.yml)
- [Trigger prompt examples](references/triggers.md)
- Licensing: <https://local.cloud/docs/licensing/>
- Privacy: <https://local.cloud/docs/privacy/>
