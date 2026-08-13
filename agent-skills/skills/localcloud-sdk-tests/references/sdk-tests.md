# SDK Tests LocalCloud Reference

## Generated environment

```bash
localcloud start
eval "$(localcloud env)"
```

The reviewed default project is `local-gcp-project`. Use the endpoint values generated for the selected instance; the CLI can remap occupied host ports.

## Language guidance

- **Python:** use explicit anonymous credentials where a client would otherwise discover ADC.
- **Node.js:** pass the generated project and endpoint values when the SDK does not honor emulator variables automatically.
- **Go:** use standard clients with bounded contexts and generated environment values.
- **Java:** make emulator environment visible to the test JVM and prevent default credential discovery.

## Verification

Exercise an operation listed in the service contract and assert an observable result. SDK compatibility depends on service, client version, transport, and operation; there is no blanket four-language matrix.

## Production and license boundary

Unset all emulator/custom endpoints in a clean process before authorized real-GCP validation. LocalCloud use is governed by the proprietary license; organization/team CI and commercial workflows are excluded by the reviewed text.
