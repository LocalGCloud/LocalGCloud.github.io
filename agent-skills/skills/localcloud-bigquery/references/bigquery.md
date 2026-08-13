# BigQuery LocalCloud Reference

## Local setup

```bash
localcloud start
eval "$(localcloud env)"
```

Confirm the generated environment contains `BIGQUERY_EMULATOR_HOST` and `GOOGLE_CLOUD_PROJECT=local-gcp-project`. Do not replace CLI-remapped values with hard-coded ports.

## Representative Python flow

```python
from google.auth.credentials import AnonymousCredentials
from google.cloud import bigquery

client = bigquery.Client(
    project="local-gcp-project",
    credentials=AnonymousCredentials(),
    client_options={"api_endpoint": "http://localhost:24087"},
)
client.create_dataset("analytics", exists_ok=True)
rows = list(client.query("SELECT 1 AS value"))
assert rows[0].value == 1
```

This source example is release-unverified because no qualified assembled image was available for end-to-end execution.

## Acceptance criteria

- The intended use is permitted by the governing proprietary license.
- The test uses generated local endpoints and cannot fall back to real BigQuery.
- It asserts query results, not only process exit.
- It records operation-level evidence and any unsupported SQL or API behavior.

## Feature boundary

BigQuery behavior is release-unverified and feature-specific. Do not publish coverage percentages, fixed test/function totals, blanket SDK compatibility, or production parity. See <https://local.cloud/docs/bigquery-emulator-features/>.
