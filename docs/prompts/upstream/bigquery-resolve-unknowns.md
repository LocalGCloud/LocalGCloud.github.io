# Prompt: resolve BigQuery comparison unknowns, duplicates and references

Paste into an agent session in the `bigquery-emulator-on-duckdb` repository. Read
`README.md` in this folder first (the document contract and working rules).

---

You own `docs/comparison-features.csv`, `docs/COMPARISON_FEATURES.md`, `docs/COMPARISON.md` and
`docs/COMPARISON_RECONCILIATION.md`, which compare this emulator and goccy against **production
Google Cloud BigQuery**. They are generated: edit the sources and run
`python3 -m qualification.emulator_comparison`, then `--check`, then
`python3 -m unittest tests.test_emulator_comparison tests.test_capability_catalog`.

- Local capability source of truth: `docs/coverage-matrix.csv`, maintained through
  `qualification/capability_catalog.py` (see `COMPARISON_RECONCILIATION.md`, "Provenance and
  maintenance").
- Competitor evidence overlay: `qualification/goccy-support-snapshot.json`, pinned to goccy
  `cb8555bee739` and googlesqlite v0.3.1 `36f6275991c0`. Every mark has an S (reviewed source), D
  (documentation) or B (backend spec declaration) basis; keep that discipline.

The site publishes this comparison to developers. It shows only LocalCloud's own assessed rows,
so every `?` in the local column is a feature the site cannot show, and every goccy `?` is a
possible advantage left unproven. The current state is 1,453 rows: local 1,068 implemented / 10
partial / 66 unsupported / **309 unknown**; goccy 454 / 9 / 74 / **916 unknown**.

## Phase A: resolve the 309 unknown LocalCloud rows

List them with `local_development == unknown` in `docs/comparison-features.csv`. By group:

| Group | Rows (about) | Notes |
| --- | --- | --- |
| metadata / Advanced | 41 | |
| metadata / INFORMATION_SCHEMA | 32 | |
| sql / DDL | 30 | |
| sql / Function | 19 | |
| sql / Scripting, Scripting & Procedural | 30 | `sql.scripting.*` duplicates of `sql.script.*` |
| sql / Expressions | 17 | duplicates of `sql.function.*` / `sql.expression.*` |
| sql / Type | 14 | |
| sql / Clauses, SELECT, FROM, WHERE, JOIN, SetOps/Set Operations, Window Functions, Parameterized Queries, Other DQL | about 60 | core query language |
| rest_v2 (Datasets, Tables, Jobs, Routines, Projects, Tabledata, Upload, Row Access Policies) | 34 | core REST API (`datasets.insert`, `jobs.query`, ...) |
| storage_read_v1 / storage_write_v1 | 10 | |
| sql / DML, metadata / Enterprise, metadata / Schema | 16 | |

For each row decide, with evidence, one of:

1. **Superseded.** 19 of them share a name with a row that already has a known status (for
   example `sql.scripting.if-then-else-end-if` vs `sql.script.if`). Do not re-test; record the
   canonical row as the source of truth and either remove the stale row from the production
   baseline with a reason in `COMPARISON_RECONCILIATION.md`, or give it an alias to the canonical
   row so the CSV never lists both with different statuses.
2. **Assessable now.** Run the feature against the emulator (a runtime probe or an existing
   test, public API or SQL) and set `implemented`, `partial` or `unsupported` with the evidence
   path and, for partial, a one-sentence limitation. Prioritize in this order: the 34 REST rows
   (these are the basics every visitor expects; they almost certainly work and are simply
   unrecorded), then core SQL clauses, joins, set operations, window functions and parameters,
   then types and functions, then INFORMATION_SCHEMA and advanced metadata, then Storage APIs.
   Reuse `qualification/fixtures` and the existing first-pass cases before writing new probes.
3. **Genuinely unknown.** Leave `unknown` only when a probe is not feasible (for example a
   managed-cloud-only behavior); say why in the row's notes.

Do not promote a row to `implemented` on the strength of a similarly named row or an analyzer
accepting a statement. Do not demote one without a probe.

## Phase B: assess goccy where this emulator is implemented

608 rows are `implemented` locally and `unknown` for goccy (600 "No exact mapping reviewed"). They are
the only place new, real advantages can appear. For each, look the exact operation up in goccy
at the pinned revision (source first; then its `docs/feature-support.md`; then the pinned
googlesqlite backend spec) and record `implemented`, `partial` or `unsupported` with the basis
S, D or B and an immutable link in `qualification/goccy-support-snapshot.json`. If you can run
goccy's pinned image, a runtime probe is stronger than any of these: add a basis `R` (runtime)
and document it in the legend. `unsupported` requires an explicit gap (an error, a missing
handler or a documented absence), never merely the lack of a mapping. Skip rows where you cannot
find evidence; leave them `unknown`. Seven rows say "Implementation pending": follow the existing
rule and keep them `unknown`.

## Phase C: hygiene

1. **Duplicates.** 48 normalized-name groups cover 102 rows and 26 groups disagree on status
   (for example `COALESCE`, `VECTOR_SEARCH`, `CREATE MODEL`). Seven functions have a second row
   with a hash-suffixed ID (`sql.function.format-date.2490dc13`, `...format-datetime...`,
   `...format-time...`, `...format-timestamp...`, `...parse-bignumeric...`, `...parse-numeric...`,
   `...to-json-string...`). Give each production feature one canonical row; list the retired IDs
   under the existing exclusions section with the reason. Where the same name is two real features
   (the `DATE` function vs the `DATE` type), keep both and make the feature names distinct
   (`DATE (function)`, `DATE (type)`).
2. **Categories.** Merge the split categories (`Expression`/`Expressions`, `Scripting`/`Scripting &
   Procedural`, `SetOps`/`Set Operations`, `Row Access Policies`/`RowAccessPolicies`) and write
   `&` rather than `&amp;` in headings.
3. **Reference links.** One reference 404s: `sql.function.obj-get-access-url` links
   `.../standard-sql/objectref-functions`; find the current page. Eight anchors do not exist:
   `sql.function.aead-decrypt-bytes` (`#abs` on the AEAD page), `sql.function.bool`
   (`json_functions#bool`), `sql.function.format` (`string_functions#format`), `sql.function.is-first`
   (`graph-gql-functions#is_first`), `sql.select.select` (`query-syntax#select`),
   `sql.ddl.integrated-gradients-num-steps`, `sql.ddl.tf-version`, `sql.ddl.xgboost-version`
   (BigQuery ML option anchors). Six pages moved
   (`aead-encryption-concepts`, `loading-data-cloud-storage`, `loading-data-local`, `write-api`,
   `streaming-data-into-bigquery`, `data-manipulation-language`). Use `docs.cloud.google.com`
   everywhere (the CSV mixes it with `cloud.google.com`), and replace the 249 links to the
   `functions-all` index with the function's own page where one exists. Use descriptive link text
   in the Markdown instead of "Google docs".
4. **Stated totals.** After any change the metrics tables in `COMPARISON.md` and
   `COMPARISON_FEATURES.md` must still equal the CSV exactly.

## Done when

`python3 -m qualification.emulator_comparison --check` and both test modules pass; the local
`unknown` count is as low as the evidence allows with every remaining one explained; no name appears
twice with different statuses; every reference resolves. Commit with a message that gives before
and after counts (local and goccy: implemented / partial / unsupported / unknown). Do not push.
Report the counts, the rows that stay unknown and why, and any goccy finding that changes a
statement in `COMPARISON.md`'s prose.
