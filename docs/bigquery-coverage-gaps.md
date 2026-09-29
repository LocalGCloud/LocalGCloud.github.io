# BigQuery coverage reference

The maintained public reference is [BigQuery coverage and known boundaries](https://local.cloud/docs/bigquery-coverage-gaps/), sourced from `src/pages/docs/bigquery-coverage-gaps.mdx` and the synchronized contract.

`scripts/sync-upstream-docs.mjs` uses Python's CSV parser to project the dependency matrix counts and all partial development records. These are recorded source classifications, not assembled-image qualification. The public page links the full matrix at the recorded revision.
