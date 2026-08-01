# SDK Tests LocalCloud Reference

## Common env vars

```bash
export GOOGLE_CLOUD_PROJECT=local-project
export STORAGE_EMULATOR_HOST=http://localhost:24081
export PUBSUB_EMULATOR_HOST=localhost:24082
export FIRESTORE_EMULATOR_HOST=localhost:24083
export BIGQUERY_EMULATOR_HOST=http://localhost:24087
```

Or use LocalCloud's generated shell env:

```bash
eval "$(curl -s http://localhost:24080/_localcloud/env?format=shell)"
```

## Python

Use `google-cloud-*` clients normally after env vars are set. Keep project IDs local and assert returned SDK objects.

## Node.js

Use `@google-cloud/*` clients with `projectId: "local-project"` when the repo does not already supply a local project. Assert promises resolve to expected resources or payloads.

## Go

Use standard Google Cloud Go clients and pass context timeouts. Keep tests bounded and clean up local resources where the SDK supports it.

## Java

Use standard Google Cloud Java clients with emulator env vars visible to the test JVM. Prefer test-scoped environment setup over developer-machine global state.

## Mock positioning

Mocks are acceptable for error branches or unsupported services. For services LocalCloud supports, add at least one SDK-backed test for the integration path that would otherwise be a fragile mock.

## Production unset reminder

Before real-GCP validation, unset emulator variables such as `PUBSUB_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, `BIGQUERY_EMULATOR_HOST`, `STORAGE_EMULATOR_HOST`, and `GOOGLE_*_CUSTOM_ENDPOINT`.
