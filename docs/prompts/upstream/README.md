# Prompts for the upstream comparison documents

Each service repository owns a comparison document that is the source of truth for feature
parity with production Google Cloud. The site imports them with
`scripts/sync-emulator-comparisons.py` (see `docs/emulator-comparisons.md`). These prompts
are meant to be pasted into an agent session **in the owning repository**, not in the site
repository. After an upstream change is committed, refresh the site with
`docs/prompts/refresh-emulator-comparisons.md`.

| Repository | Prompt | Main work |
| --- | --- | --- |
| `bigquery-emulator-on-duckdb` | [bigquery-resolve-unknowns.md](bigquery-resolve-unknowns.md) | Resolve the `?` rows, duplicates and bad references |
| `cloud-spanner-emulator` | [spanner.md](spanner.md) | Merge the persistence rows, re-check the Google baseline, stable IDs |
| `little_bigtable` | [bigtable.md](bigtable.md) | Restore the Google emulator column, assess two unknowns, stable IDs |
| `firestore-go` | [firestore.md](firestore.md) | Reconcile the two inventories, export the curated rows, assess Google unknowns |
| `localcloud-fake-gcs-server` | [gcs.md](gcs.md) | Machine-readable export, failing host-matching test |

## The document contract the site relies on

Keep these true in every comparison document; the importer fails closed when they are not,
so a change here is never silently dropped.

1. **One row per individual production feature**, defined by an official production
   reference, never by an emulator implementation detail. Rows are never merged into
   composite entries; a sub-feature that shares an implementation still gets its own row
   only if production documents it as a separate capability.
2. **Columns are identified by heading text.** Keep these headings (the importer matches them
   by pattern, so order may change but wording should not): a feature name column, the
   production reference column, one column per emulator, and a limit/difference column.
   Do not split one service's rows across tables with different column sets.
3. **Marks** are `✓` implemented, `◐` partial or limited, `✗` unavailable, `○` accepted
   without the described effect, `—` not applicable and `?` not established. `√ △ × X` are
   accepted aliases. Use `?` only when evidence is missing, and `✗` only for an explicit
   absence; an unknown competitor result must never read as a gap. Anything else is an error.
4. **The document states its own totals** in one table (per mark and per column) that equals
   the rows exactly. Regenerate it from the same data as the rows; never edit it by hand.
5. **Stable row IDs.** A row keeps its ID when its wording changes. Where the document is
   generated, add an ID column or a CSV with the same rows; the site prefers a document's own
   IDs over IDs derived from headings.
6. **The limit/difference column is written for people.** It states what differs from
   production in a sentence a developer can use. Evidence (test names, source files, review
   notes, internal inventory keys, "fork"/"upstream" wording) goes in a separate evidence
   column or in the evidence index, never in the limit column. The site publishes only the
   limit column, after removing anything that looks like evidence.
7. **Every LocalCloud mark is assessed.** A `?` in the LocalCloud column is an open task, and
   the site hides those rows until it is resolved. Competitor `?` rows are fine, but each is a
   missed chance to show a real advantage.
8. **Commit the document before syncing.** The importer reads the committed file and records
   its digest.

## Working rules for every prompt below

- Edit the source of truth and regenerate; never hand-edit a generated section.
- Evidence standard: a mark is a claim about behavior. Prefer a runtime probe or an existing
  passing test; otherwise source or documentation, labeled as such. Never promote a `?` or `◐`
  to make a comparison look better, and never invent evidence.
- Run the repository's own generator check and tests before committing.
- Commit with a message that says what changed in the comparison. Do not push.
