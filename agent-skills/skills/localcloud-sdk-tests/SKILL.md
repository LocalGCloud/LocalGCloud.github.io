---
name: localcloud-sdk-tests
description: "LocalCloud SDK test GCP emulator workflows: use when adapting Python, Node.js, Go, or Java Google Cloud SDK tests to localhost endpoints instead of mocks or real GCP."
---

# LocalCloud SDK Tests

## When to use

Use this skill when a task mentions LocalCloud SDK tests, Google Cloud client libraries, Python/Node.js/Go/Java integration tests, emulator endpoint env vars, replacing mocks with local behavior, or proving SDK routing to localhost.

Do not use it for production credential setup, client library version migration unrelated to LocalCloud, or tests for services LocalCloud does not support.

## Inputs to inspect

- Language, package manager, test framework, and existing GCP SDK usage.
- Service-specific clients and env vars already used by the repo.
- Existing mocks that can be replaced by LocalCloud-backed integration tests.
- LocalCloud docs linked in [references/sdk-tests.md](references/sdk-tests.md).

Ask only for information the repo and tools cannot provide.

## LocalCloud setup assumptions

- Start through the host CLI and load `eval "$(localcloud env)"` into the test process.
- The reviewed default project is `local-gcp-project`; trust all generated endpoint values because host ports may be remapped.
- SDK compatibility depends on service, client version, transport, and operation; there is no blanket language matrix.
- Confirm the governing proprietary license permits the intended use before running LocalCloud.

## Step-by-step workflow

1. Inspect the repo to identify SDK language, service clients, and test command.
2. Choose the narrowest service path LocalCloud supports.
3. Export localhost emulator variables inside the test process, not globally for unrelated jobs.
4. Prefer actual SDK calls to LocalCloud over mocks for supported services.
5. Create deterministic local resources and assert observable behavior.
6. Unset emulator variables in production instructions or after local-only tests when needed.
7. Document unsupported service behavior instead of reaching real GCP.

See [references/sdk-tests.md](references/sdk-tests.md) for language notes.

## Verification

A valid verification exercises the real SDK client against LocalCloud and asserts a behavior that can fail: created resource exists, message payload matches, query result rows match, object content round-trips, or document data is read back.

## Known gaps / when to fall back to real GCP

For an authorized production-readiness pass, unset emulator variables in a clean process and use intentionally supplied credentials and target configuration. Organization/team CI and commercial workflows are excluded by the reviewed proprietary license.

## Expected output

Return language/framework detected, SDK clients updated, env vars scoped, local resources created, assertions added, mocks removed or retained with rationale, and production-unset instructions.

## References

- [SDK test workflow details](references/sdk-tests.md)
- [Trigger prompt examples](references/triggers.md)
- SDK examples: <https://local.cloud/docs/sdk-examples/>
- Compatibility: <https://local.cloud/compatibility/>
- Services: <https://local.cloud/services/>
