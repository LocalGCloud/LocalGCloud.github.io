# BigQuery coverage reference

The maintained public reference is the [coverage matrix](https://local.cloud/docs/bigquery-emulator-features/#coverage-matrix) section of the BigQuery emulator feature reference, sourced from `src/pages/docs/bigquery-emulator-features.mdx` and the synchronized contract.

`scripts/sync-upstream-docs.mjs` uses Python's CSV parser to project the dependency matrix counts and all partial development records. These are recorded source classifications, not assembled-image qualification. The public page links the full matrix at the recorded revision.
