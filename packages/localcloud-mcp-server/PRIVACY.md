# Privacy and local-data boundary

The LocalCloud MCP server itself runs locally over stdio and does not initialize an analytics or telemetry SDK. Its tools can still access or disclose local information when requested, and linked LocalCloud runtime behavior has separate outbound paths.

## MCP server behavior

- Runtime, diagnostics, logs, and state tools inspect host Docker and loopback LocalCloud endpoints.
- Tool results can return container names/status, bounded logs, service state, endpoint values, and environment-variable **presence** to the connected MCP client.
- Diagnostic output masks environment-variable values, but local logs can contain application data. Review output before sharing it with a remote model or third party.
- Documentation and service tools return bundled metadata and URLs. The gcloud tool is planning-only; execution is disabled until runtime-generated endpoint overrides can be validated safely.
- The MCP package does not promise that the connected MCP host, model provider, npm client, Docker registry, or LocalCloud runtime performs no network requests. Those systems have separate behavior and policies.

## LocalCloud runtime behavior

Starting or managing LocalCloud can activate runtime telemetry, update checks, certificate probes, online license validation, live-IAM token validation, or user-configured scheduler HTTP egress. Runtime telemetry can send pseudonymous identifiers and usage/health fields to PostHog, persist failed events, and emit a `telemetry_disabled` event when normal telemetry is disabled but an event key is present.

See [the LocalCloud privacy reference](https://local.cloud/docs/privacy/) for destinations, event fields, activation conditions, and controls.

## Safety guidance

- Do not paste credentials, personal data, customer data, or secrets into prompts or tool arguments.
- Treat a read-write Docker socket as broad host control.
- Review logs before returning them to an MCP client.
- Keep live-cloud IAM and external scheduler targets disabled unless explicitly intended.
