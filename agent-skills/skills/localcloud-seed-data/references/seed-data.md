# Seed Data LocalCloud Reference

## Admin API load

```bash
curl -X POST http://localhost:24080/_localcloud/seed \
  -H "Content-Type: application/yaml" \
  --data-binary @seed.yaml
```

## Startup mount

```bash
docker run -d \
  -v ./seed.yaml:/etc/localcloud/seed.yaml \
  -v ~/.localcloud/data:/var/lib/localcloud \
  -p 8080:24080 -p 4443:24081 \
  -p 8085-8087:24082-8087 \
  -p 9010:24085 -p 9020:24086 \
  -p 9050:24087 -p 9060:24088 \
  -p 6379:6379 \
  -m 4g --name localcloud \
  jaysen2apache/localcloud
```

## Reset and restore

```bash
curl -X POST http://localhost:24080/_localcloud/reset \
  -H "Content-Type: application/json" \
  -d '{"restore_seed": true}'
```

## Fixture rules

- Stable IDs, deterministic timestamps, and small datasets.
- Fake secrets only; no copied production tokens.
- No real customer names, emails, object contents, or event payloads.
- Keep examples small enough for agents to reason about and tests to reset quickly.
