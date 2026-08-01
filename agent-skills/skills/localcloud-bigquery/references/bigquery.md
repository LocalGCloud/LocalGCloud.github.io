# BigQuery LocalCloud Reference

## Local setup

```bash
export BIGQUERY_EMULATOR_HOST=http://localhost:24087
export GOOGLE_CLOUD_PROJECT=local-project
```

If LocalCloud is not running, start or reuse `jaysen2apache/localcloud` according to the project docs and wait for `http://localhost:24080/_localcloud/health`.

## Representative Python flow

```python
from google.cloud import bigquery

client = bigquery.Client(project="local-project")
client.create_dataset("analytics", exists_ok=True)

table = bigquery.Table(
    "local-project.analytics.events",
    schema=[
        bigquery.SchemaField("event_id", "STRING"),
        bigquery.SchemaField("amount", "INTEGER"),
    ],
)
client.create_table(table, exists_ok=True)
client.insert_rows_json(
    "local-project.analytics.events",
    [{"event_id": "evt-local-1", "amount": 42}],
)
rows = list(client.query("SELECT event_id, amount FROM analytics.events WHERE amount > 0"))
assert rows[0].event_id == "evt-local-1"
```

## Acceptance criteria

- The test uses the real project BigQuery client path where practical.
- It asserts rows or query results, not just successful process exit.
- It documents unsupported SQL, job configuration, or metadata behavior instead of hiding failures.
- It does not use real GCP credentials or production datasets.

## Unsupported feature handling

When a query or feature fails due to emulator coverage, report:

1. the exact SQL or API call,
2. why it matters to the project,
3. the LocalCloud docs link reviewed,
4. whether a real-GCP production validation pass is needed later.
