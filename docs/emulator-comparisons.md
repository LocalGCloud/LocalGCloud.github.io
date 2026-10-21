# Service emulator comparisons

The public workspace is `/compare/emulators/`. Service tabs on the left select a
shared detail pane on the right; on mobile the tabs sit above the content. Service
guides link to `?service=<slug>`, and Back/Forward restores the selection. Existing
standalone service comparison URLs remain available, including without JavaScript.
Use LocalCloud service names in the headings and table columns. Keep introductions
and configuration notes concise.

The initial HTML and Markdown twin contain a small preview. On entry, the browser
loads only the selected service's build-hashed inventory and displays every matching
row on one page. The existing filters search the complete inventory without
pagination. The JSON comparison view appears in the For agents audience only.

Keep the detail header, metric counts and filters compact so feature rows are
visible on entry. Available and unavailable states use green checks and red crosses
with readable screen-reader and Markdown labels. Other states keep their text; the
site never labels a result "Partial" (a limited result reads "Scoped"). Every row
shows its complete note inline. Comparison notes appear as plain text below the
table. Apply the same presentation to server previews and loaded rows. Firestore
uses one mark when its Compatibility and Extended profiles agree; show both labeled
results only where they differ. The raw JSON retains both profiles.

A service whose document has no competitor column (Bigtable today) shows LocalCloud's
own results with no mode choice, no competitor column and no advantage counts. When
its document gains a competitor column, the next sync turns those on by itself. The
competitor name and baseline are already in `src/data/emulatorComparisons.ts`; confirm
them against the document's baseline section.

Only **Available locally + Not available/Accepted, no effect in the competitor** qualifies
for the advantages filter. Scoped competitor behavior has a separate filter. Unknown and
not-applicable values never imply a competitor gap. Firestore retains compatibility and
extended-profile values; the latter requires its documented configuration and is not a
production-deployment claim.

## Where the data comes from

The upstream comparison documents are the source of truth for feature parity. Each
compares an emulator with **production Google Cloud** features; the site derives its
tables from them and shows none of the production-side evidence.

```
upstream repository document ──► scripts/sync-emulator-comparisons.py ──► src/data/emulator-comparisons/<service>.json   (published, visitor-facing)
(committed, production baseline)                                      ├─► src/data/emulator-comparisons/index.json       (counts, hasCompetitor)
                                                                      └─► src/data/emulator-comparison-provenance.json   (internal, never published)
```

| Service | Repository | Document read for rows | Also read | Competitor column |
| --- | --- | --- | --- | --- |
| Cloud Storage | `localcloud-fake-gcs-server` | `docs/upstream-comparison.md` | | fake-gcs-server |
| Firestore | `firestore-go` | `docs/emulator-comparison.md` | `docs/emulator-comparison-metrics.md` (totals) | Google emulator; two LocalCloud profiles |
| Bigtable | `little_bigtable` | `EMULATOR_COMPARISON.md` | | none yet (Google emulator, once added) |
| Spanner | `cloud-spanner-emulator` | `docs/emulator-comparison.md` | | Google emulator |
| BigQuery | `bigquery-emulator-on-duckdb` | `docs/comparison-features.csv` | `docs/COMPARISON.md` (totals) | goccy |

Builds consume the checked-in files only and never read sibling repositories. The
provenance file records, per service, the repository revision, each document's last
commit and SHA-256, the review date, the totals the document states about itself and
how many rows were left out; it is not imported by any page.

### What a visitor sees, and what they do not

- **Never published:** the production baseline column, official reference links,
  repository and test links, revisions, branch names, evidence labels, file names and
  the source documents themselves. A leak scan stops the sync if any of it survives
  into a note, and `scripts/verify-emulator-comparisons.test.mjs` checks the data again.
- **Notes are rewritten for visitors.** Link labels, evidence phrases and engineering
  terms are removed, "fork"/"upstream" become the product or competitor name, and
  nothing is invented: if only evidence remains, the note is empty. Some services show
  notes only where the result is limited or unavailable (`NOTE_STATES` in the importer).
- **Unassessed LocalCloud rows are not shown.** A feature whose LocalCloud result is
  unknown says nothing a visitor can use. It stays in the document, is counted in the
  provenance (`hidden.unassessed`) and is reported by every sync so it can be assessed
  upstream (`HIDE_UNASSESSED_LOCAL`).
- **Repeated features appear once (BigQuery only).** Its inherited catalog lists some
  features under two categories; rows with the same name and the same result collapse
  to one, preferring the SQL, REST and Storage entries (`COLLAPSE_REPEATS`).
- **Area names are normalized** (for example BigQuery's `Expression`/`Expressions`).
- **IDs are stable.** GCS and BigQuery keep the document's own IDs; the others use a
  slug of area and name, numbered on collision. Upstream IDs are used as soon as a
  document provides them.

### What the importer refuses

The sync is fail-closed, so a changed document layout stops it instead of dropping data:

- uncommitted documents;
- tables whose columns it cannot identify by heading, rows with the wrong number of
  cells, duplicate document IDs and unknown marks;
- parsed counts that differ from the totals the document states (per column and state);
- a document that no longer states its totals where the importer looks;
- any internal wording left in a note after rewriting.

## Updating

Commit comparison documents in their owning upstream repositories first (see
`docs/prompts/upstream/` for the prompts that fix and extend them), then run:

```sh
python3 scripts/sync-emulator-comparisons.py /path/to/local_cloud_dependencies   # --check reports drift without writing
python3 -B -m unittest scripts/test_sync_emulator_comparisons.py
node --test scripts/verify-emulator-comparisons.test.mjs
pnpm run build && pnpm run test:comparisons
```

`docs/prompts/refresh-emulator-comparisons.md` is the prompt for an agent that does all of
this, including what to do when a document changes shape. After building,
`pnpm run test:comparisons` also exercises the tables in Chrome; its counts come from
the inventories, so a refresh needs no test edits.

Inventory counts have different denominators and overlapping facets. Do not sum
them into a product feature count or present them as a benchmark. A count describes the
rows shown after the rules above, and a ✓ is evidence for the named behavior, not a
released-image qualification.
