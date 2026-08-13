# Security policy

Report vulnerabilities through GitHub Security Advisories for `LocalGCloud/LocalGCloud.github.io` or open a minimal issue that does not disclose exploit details publicly.

## Supported version

This package is pre-1.0. Security fixes target the latest published `0.x` release and the `packages/localcloud-mcp-server/` source directory.

## Security boundaries

- LocalCloud is a local-development runtime, not a production security control. Its use is governed by the proprietary license; technical CI or team capability does not grant legal permission.
- Default local workflows should not require a GCP account, Google credentials, service-account keys, or billing project.
- The server does not execute arbitrary shell strings; process execution uses fixed binaries plus argv arrays.
- Destructive runtime/state operations require explicit confirmation and, where implemented, an environment opt-in.
- The gcloud tool is dry-run only. Static SDK emulator variables are insufficient to guarantee local gcloud routing.
- LocalCloud IAM compatibility can be permissive or stubbed. Do not use it to validate production authorization.
- Validate against real Google Cloud before production after clearing emulator endpoints in a clean process.

## Docker socket risk

Mounting `/var/run/docker.sock` read-write grants broad control over the host Docker daemon and can amount to host compromise. The host CLI keeps this disabled by default. Mount it only in a trusted, isolated environment for workflows that require subordinate containers, and remove it when those tools are not needed.

## Logs and connected models

Log and diagnostics tools can return local runtime and application information to the connected MCP client. Masking environment-variable values does not guarantee that application logs contain no secrets or personal data. Review and minimize output before sending it to a remote model.

## Outbound runtime behavior

The MCP process has no analytics SDK, but starting LocalCloud may activate runtime telemetry, update checks, certificate probes, licensing, live IAM, or user-configured HTTP egress. Review [the privacy reference](https://local.cloud/docs/privacy/) and do not rely on a categorical offline or zero-egress guarantee.
