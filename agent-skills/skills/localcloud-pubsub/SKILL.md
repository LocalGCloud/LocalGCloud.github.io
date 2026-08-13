---
name: localcloud-pubsub
description: "LocalCloud Pub/Sub GCP emulator workflows: use when testing topics, subscriptions, publish, pull, streaming pull, ack, or event payloads locally without real GCP credentials."
---

# LocalCloud Pub/Sub

## When to use

Use this skill when a task mentions LocalCloud Pub/Sub, Pub/Sub emulator, topics, subscriptions, publishing, pulling, streaming pull, acknowledgements, or local event-driven integration tests.

Do not use it for real Pub/Sub IAM, production subscriptions, schema registry enforcement, or cloud delivery integrations that LocalCloud documents as unsupported.

## Inputs to inspect

- Existing publisher/subscriber code, handlers, tests, schemas, and fixtures.
- Project language and scripts for the narrowest relevant test.
- Existing `PUBSUB_EMULATOR_HOST` and project ID configuration.
- LocalCloud docs linked in [references/pubsub.md](references/pubsub.md).

Ask only for unavailable project-specific details.

## LocalCloud setup assumptions

- Start through the host CLI, then load the generated environment with `eval "$(localcloud env)"`.
- The reviewed default project is `local-gcp-project`; trust the generated Pub/Sub endpoint because host ports may be remapped.
- Pub/Sub is partial and volatile across restart; review operation-level evidence before testing.
- Confirm the governing proprietary license permits the intended use before running LocalCloud.

## Step-by-step workflow

1. Inspect the repo's publisher/subscriber paths and test harness.
2. Load the generated `PUBSUB_EMULATOR_HOST` and project values into the test process.
3. Create deterministic topic and subscription names.
4. Publish a small test message with attributes that exercise the app's handler.
5. Pull or streaming-pull the message through the same SDK path used by the app.
6. Ack the message and assert payload, attributes, ordering assumptions, and handler side effects that matter.
7. Document unsupported features instead of silently using real Google Cloud.

See [references/pubsub.md](references/pubsub.md) for examples and known gaps.

## Verification

Verify through actual Pub/Sub SDK or API behavior. A valid check creates resources, publishes at least one message, consumes it, acknowledges it, and asserts the payload or side effect.

## Known gaps / when to fall back to real GCP

Review `/compatibility/` and `/services/` for current Pub/Sub support. Treat schema validation, BigQuery subscriptions, GCS subscriptions, and other cloud delivery integrations as gaps unless LocalCloud docs state support. Fall back to real GCP only for explicit production validation after LocalCloud variables are unset.

## Expected output

Return topics/subscriptions created, env vars used, message payloads or fixtures, test command identified, assertions made, and any documented Pub/Sub gaps.

## References

- [Pub/Sub workflow details](references/pubsub.md)
- [Trigger prompt examples](references/triggers.md)
- LocalCloud compatibility: <https://local.cloud/compatibility/>
- LocalCloud services: <https://local.cloud/services/>
- SDK examples: <https://local.cloud/docs/sdk-examples/>
