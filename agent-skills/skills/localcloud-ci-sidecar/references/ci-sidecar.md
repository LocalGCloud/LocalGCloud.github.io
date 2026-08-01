# CI Sidecar LocalCloud Reference

## Readiness gate

```bash
for i in $(seq 1 30); do
  if curl -sf http://localhost:24080/_localcloud/health > /dev/null; then
    echo "LocalCloud is ready"
    exit 0
  fi
  sleep 2
done

echo "LocalCloud did not become ready" >&2
exit 1
```

## Env export

For shell-based jobs:

```bash
eval "$(curl -s http://localhost:24080/_localcloud/env?format=shell)"
```

For GitHub Actions, append exported values to `$GITHUB_ENV` only after reviewing the endpoint output in the job context.

## Port and memory constraints

- Admin/console/health: `8080`
- Cloud Storage: `4443`
- Pub/Sub, Firestore, Bigtable range: `8085-8087`
- Spanner/other service ports: `9010`, `9020`, `9050`, `9060`
- Memorystore: `6379`
- Recommended memory: `4g`

## Acceptance criteria

- The job cannot reach real GCP by default.
- The health wait fails closed if LocalCloud is unavailable.
- Test command is repo-specific and narrow.
- Real secrets are not added to the LocalCloud job.
