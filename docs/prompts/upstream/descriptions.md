# Feature descriptions, and the Bigtable Google-emulator column

Run this in the **owning repository** (see the table in [README.md](README.md)). It adds two
things the site needs to show a useful comparison matrix:

1. **A description for every compared feature** in every service document.
2. **Bigtable only:** the comparison column for the Google Cloud Bigtable emulator.

Do not change any existing mark, ID, reference or limit text while doing this, and do not take
on other clean-up (unknown results, duplicates, reference fixes). Those have their own prompts.

## 1. The Description column

The site shows, for each feature, the LocalCloud result, the competitor result and a **Details**
cell. Today Details is empty for most rows, because the limit column is blank when nothing
differs from production. Each row must carry a **description of the feature itself** so Details
is always meaningful; the limit text, when there is one, is shown after it.

### Where it lives

| Repository | Where the description goes |
| --- | --- |
| `localcloud-fake-gcs-server` | A `Description` column right after `Production GCS capability` in every ID matrix table |
| `firestore-go` | A `Description` column right after `Individual production feature` in every feature table; update `tools/emulator-comparison.py` and its tests, which assume the current column count |
| `little_bigtable` | A `Description` column right after the name column (`RPC`, `Field`, `Capability`, `SQL name`) in every feature table |
| `cloud-spanner-emulator` | A sixth element in every `checks` entry of `docs/emulator-comparison-checklist.json`; `tools/emulator_comparison.py` validates it and renders a `Description` column |
| `bigquery-emulator-on-duckdb` | A sidecar `docs/feature-descriptions.csv` (`capability_id,description`) read by `qualification/emulator_comparison.py`, which writes a `description` column into `docs/comparison-features.csv` and a `Description` column into `docs/COMPARISON_FEATURES.md`. A sidecar keeps the strict catalog schema untouched |

Whatever the mechanism, the generator or a check script must **fail when a compared row has no
description** (or an orphan description has no row), so the document stays complete as rows are
added. Edit the source of truth and regenerate; never hand-edit generated tables.

### How to write one

- **What the feature is, in one or two sentences (50-220 characters).** Plain words for a
  developer who has never used it. Say what it does, takes or returns, or what it is for.
- **About the production Google Cloud feature, not the emulator.** Never say whether or how
  well anything is supported, and never mention LocalCloud, the emulator, the fork, upstream,
  goccy, tests, evidence, files, commits or branches. Limits and differences stay in the
  existing limit column.
- **Specific to the row.** Do not restate the name ("Create bucket" is not a description of
  create bucket). Siblings differ in verb and object (`GetSession` reads one, `ListSessions`
  lists them, `DeleteSession` ends one). Do not reuse one sentence across many rows; a family of
  functions needs one correct sentence per function.
- **Accurate or absent of detail.** Do not invent numbers, limits or defaults. When you are not
  sure what a field, option or function does, open the official reference linked from that row
  and read it. A generic but true sentence beats a specific wrong one.
- **Plain text.** No markdown, links, backticks, HTML or `|` characters (name an operator in
  words: "the string concatenation operator"). Sentence case, ends with a period. Write
  identifiers bare (`SELECT DISTINCT`, `rows_limit`) when they are needed.

| Row | Good | Bad |
| --- | --- | --- |
| GCS `Create bucket` | Creates a bucket in a project with its location, storage class and default access settings. | Create bucket. |
| Firestore `Get one document` | Reads a single document by its path and returns its fields and metadata. | Supported by the emulator for local reads. |
| Bigtable `CheckAndMutateRow` | Applies one of two sets of mutations to a row depending on whether a filter matches it, in one atomic step. | Local RPC behavior. |
| Spanner `GoogleSQL TO_JSON_STRING()` | Converts a value of any supported type to its JSON text form. | Spanner allowlist and shared evaluator. |
| BigQuery `IEEE_DIVIDE` | Divides two numbers and returns infinity or NaN instead of raising an error when the divisor is zero. | Named backend spec only. |

### Done when

- Every compared row (including rows the site hides, such as BigQuery rows whose LocalCloud
  result is unknown) has a description that follows the rules above.
- The repository's own generator/check passes and rejects a row with a missing description
  (prove it once by blanking one and running the check, then restore it).
- Counts in the document's metrics tables are unchanged.
- Spot-check at least 40 descriptions spread across sections against the official reference
  and fix any that are wrong. Report how many you checked and what you changed.
- Commit with a message such as `docs: describe each compared production feature`.

## 2. Bigtable: compare with the Google Cloud Bigtable emulator

*Done on 2026-10-21 (little_bigtable `96bbab6`); kept as the specification of the column.*

The comparison for Bigtable is between LocalCloud's Bigtable emulator (Little Bigtable) and the
**Google Cloud Bigtable emulator**, also called the **CBT emulator**: the `cbtemulator` server
started by `gcloud beta emulators bigtable start`, implemented by the Go package
`cloud.google.com/go/bigtable/bttest`. (`cbt` is the client CLI, not the emulator.) Restore the
column the document had in commit `dd3a724` and bring it up to the current inventory.

1. **Heading.** Exactly `Google Cloud Bigtable emulator` in every feature table, and in the
   side-by-side table at the top. In prose call it "the Google Cloud Bigtable emulator
   (`cbtemulator`)".
2. **Baseline.** Pin the emulator source to a released `cloud.google.com/go/bigtable` version:
   the newest reachable (`go list -m -versions cloud.google.com/go/bigtable`), otherwise the
   `v1.58.0` already in the module cache that matches this repository's `go.mod`. Inspect every
   non-test file under `bttest/` (and `cmd/emulator`), record the version in the
   "Baselines and evidence" table, and say that the result describes that source, not a
   particular Cloud SDK bundle unless you tested one.
3. **Marks, one per row.** `✓` the emulator implements the RPC, field, filter, rule, mutation,
   aggregate or behavior; `◐` it does but with a material simplification (no per-row limit
   column is needed for the Google emulator); `✗` no handler, an explicit `Unimplemented`, rejected or ignored; `?` only when
   the source cannot settle it, which should be rare. The production column stays `✓` and no
   existing LocalCloud mark changes. Where a quick runtime probe with the Go client settles a
   doubtful row, prefer it over reading source.
4. **SQL.** If the emulator does not implement `PrepareQuery`/`ExecuteQuery`, every SQL
   function/syntax row is `✗` and the document must say so once, not per row.
5. **Metrics table.** Extend "Coverage metrics" with `Google emulator ✓`, `Google emulator ◐`,
   `Google emulator ✗` and `Google emulator ?` columns computed from the rows, and add a
   sentence that states the Google emulator's totals in the same plain terms as the LocalCloud
   ones. The columns must sum to each row's `Documented rows`.
6. **Prose.** Update the title paragraph, scope and legend so the document says what is being
   compared. Keep the production baseline wording: the marks still describe coverage of
   production Bigtable features.
7. **Check.** Add a small repeatable check (for example `tools/check_emulator_comparison.py`)
   that parses the feature tables and verifies: every table has the same column set, every
   mark is valid, every row has a description, and the metrics table equals the rows.

After this, the site imports the new column with no further change.

## Report back

Reply with: what changed (files, row counts per table), the check output, the verification of
the descriptions (how many spot-checked, what was corrected), the commit hash on the base
branch, and anything you could not settle. For Bigtable also list the total Google emulator
✓/◐/✗/? and any row you marked `?`.
