# CI Sidecar LocalCloud Reference

## License gate

The proprietary Public Preview License permits non-production internal CI for individuals and organizations, including for-profit companies. Keep the workflow within the exact release license and validate the selected runner.

## Reviewed technical pattern

```bash
for i in $(seq 1 30); do
  if curl -fsS http://localhost:24080/health >/dev/null; then
    echo "LocalCloud is ready"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    docker logs localcloud || true
    exit 1
  fi
done

eval "$(curl -fsS http://localhost:24080/env?format=shell)"
```

## Ports and memory

- Canonical LocalCloud range: `24080-24092`.
- Publish only ports needed by the selected tests.
- Keep ports loopback-bound where the runner supports it.
- Reviewed CLI default memory: `4g`.
- Trust generated endpoint values rather than reconstructing them.

## Qualification boundary

Pin a qualified image digest. The mutable reviewed tag is release-unverified. No qualified assembled image was available to execute this template during the documentation remediation.

## Acceptance criteria

- License permission is recorded.
- Health failure terminates the job and prints diagnostics.
- The test process uses generated local endpoint values.
- No real GCP credentials are available to the local job.
- Real-GCP validation is separate and never an automatic fallback.
