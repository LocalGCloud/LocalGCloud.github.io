# Privacy Statement

The LocalCloud MCP server runs locally over stdio. It does not include telemetry, analytics, tracking pixels, or hosted control-plane calls.

Tool behavior:

- Runtime, diagnostics, logs, and state tools inspect Docker and localhost endpoints on the user's machine.
- Docs and service tools return bundled metadata plus canonical local.cloud URLs; they do not need network access to answer.
- Optional `localcloud-gcp-client` execution is dry-run by default and, when explicitly enabled, forces LocalCloud emulator environment variables and blocks credential-oriented argv.

The server may surface local container logs or environment-variable presence back to the connected MCP client because that is the requested tool output. It masks environment variable values in diagnostics. Do not paste secrets into prompts or tool arguments.
