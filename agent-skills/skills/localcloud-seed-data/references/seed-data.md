# Seed data LocalCloud reference

## Load, reload, and reset

```bash
curl -fsS -X POST http://localhost:24080/seed \
  -H 'Content-Type: application/yaml' \
  --data-binary @seed.yaml

curl -fsS -X POST http://localhost:24080/reseed

curl -fsS -X POST 'http://localhost:24080/reset?project=local-gcp-project' \
  -H 'Content-Type: application/json' \
  -d '{"restore_seed":true}'
```

Canonical port `24080` applies to manual Docker. With the host CLI, use the actual gateway URL returned for the instance.

## Startup mount

```bash
docker volume create localcloud-data

docker run -d --name localcloud \
  -p 127.0.0.1:24080-24092:24080-24092 \
  -m 4g \
  -v "$PWD/seed.yaml:/etc/localcloud/seed.yaml:ro" \
  -v localcloud-data:/var/lib/localcloud \
  jaysen2apache/localcloud:latest
```

The mutable image is release-unverified; pin a qualified digest when one is available.

## Format rules

- Flat, `services:`, and `projects:` envelopes are accepted.
- Cloud Storage key: `gcs`.
- Secret Manager: `secretmanager.secrets`.
- BigQuery datasets: `bigquery.datasets`; tables: `bigquery.tables`, with `dataset` on each table.
- Firestore seeding is unsupported.
- `POST /seed?mode=volatile` seeds Pub/Sub and Bigtable only.
- `LOCALCLOUD_TERRAFORM_MODE=true` skips seed operations.

Use stable IDs, deterministic timestamps, small datasets, and fake secret payloads. Verify through the application SDK and validate production data workflows separately.
