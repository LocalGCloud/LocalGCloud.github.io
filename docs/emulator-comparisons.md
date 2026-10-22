# Service emulator comparisons

The public workspace is `/compare/emulators/`; `/compare/` redirects to it, and the page
also lists the other comparison pages. Service tabs on the left select a
shared detail pane on the right; on mobile the tabs sit above the content. Service
guides link to `?service=<slug>`, and Back/Forward restores the selection. Existing
standalone service comparison URLs remain available, including without JavaScript.
Use LocalCloud service names in the headings and table columns. Keep introductions
and configuration notes concise.

Each service lists its **categories**, the document's own sections, as rows of the one
comparison table, collapsed by default. Under LocalCloud's column a category row shows how
many of its features LocalCloud supports (green ✓ and a number); under the competitor's
column it shows how many the competitor lacks (red ✕ and a number); its Details cell stays
empty and "N features" sits under its name. Opening it lists its features beneath, each
with a green ✓ or red ✕ in both columns. The initial HTML and Markdown twin hold only the
category rows; the browser loads the selected service's build-hashed inventory and draws a
category's features when it opens. A search covers the complete
inventory and opens every category that has a match. The two filters are "Only in
LocalCloud" (the default) and "All features". The JSON comparison view appears in the
For agents audience only.

The header says "N features in total · M only available in LocalCloud (not in <the
emulator compared>)"; N counts the features listed, so it leaves out the ones neither side supports. Available and unavailable states use green checks and red crosses
with readable screen-reader and Markdown labels. **A limited result (◐) shows the same
green check as a supported one**: the mark says the feature works and the "Note:" line
says how far, so the site never labels a result "Partial" or "Scoped". Every row shows
what the production feature is, inline in Details, then a link to Google's own
documentation page for it, then, when the result differs from production, a "Note:" line.
Comparison notes appear as plain text below the groups. Firestore uses one mark when its
Compatibility and Extended profiles agree; show both labeled results only where they
differ. The raw JSON retains both profiles and the limited states.

A service whose document has no competitor column shows LocalCloud's own results with
no mode choice, no competitor column and no advantage counts. When its document gains a
competitor column, the next sync turns those on by itself. The competitor name and
baseline are in `src/data/emulatorComparisons.ts`; confirm them against the document's
baseline section.

**Only in LocalCloud** means the feature works locally (✓, or ◐ with a documented limit) and
the competitor explicitly lacks it (✗, or accepted with no effect). A competitor that
supports it only in part, an unknown result and a not-applicable one never imply a gap, so
none of them count. Firestore retains compatibility and
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
| Bigtable | `little_bigtable` | `EMULATOR_COMPARISON.md` | | Google Cloud Bigtable emulator (`cbtemulator`) |
| Spanner | `cloud-spanner-emulator` | `docs/emulator-comparison.md` | | Google emulator |
| BigQuery | `bigquery-emulator-on-duckdb` | `docs/comparison-features.csv` | `docs/COMPARISON.md` (totals) | goccy |

Builds consume the checked-in files only and never read sibling repositories. The
provenance file records, per service, the repository revision, each document's last
commit and SHA-256, the review date, the totals the document states about itself and
how many rows were left out; it is not imported by any page.

### What a visitor sees, and what they do not

- **Never published:** the production baseline column, repository and test links,
  revisions, branch names, evidence labels, file names and the source documents
  themselves. The one outbound link per feature is Google's own documentation (below). A leak scan stops the sync if any of it survives
  into a note, and `scripts/verify-emulator-comparisons.test.mjs` checks the data again.
- **Every row is described.** The documents carry a `Description` for each compared
  feature (the `description` column of the BigQuery CSV): one or two sentences on what the
  production feature is or does, with no mention of any emulator. It is the first thing
  Details shows, so the cell is never empty, and the filters search it. The contract is in
  `docs/prompts/upstream/descriptions.md`.
- **Every row links Google's documentation.** The documents carry an official reference per
  feature (`Official Google reference`, `Official production reference` or `Official Spanner
  reference`; the `google_documentation` column of the BigQuery CSV). The importer takes
  the first link in that cell, resolving reference-style links such as `[x][g-bi]` against
  the definitions at the end of the document, and keeps it only if it is `https` on
  `cloud.google.com`, `docs.cloud.google.com`, `firebase.google.com` or
  `developers.google.com`. Details shows it as "Google Cloud docs ↗" (or "Firebase docs").
- **Notes are rewritten for visitors.** Link labels, evidence phrases and engineering
  terms are removed, "fork"/"upstream" become the product or competitor name, and
  nothing is invented: if only evidence remains, the note is empty. Some services show
  notes only where the result is limited or unavailable (`NOTE_STATES` in the importer).
- **Features neither side supports are not listed.** A row that LocalCloud (both profiles)
  and the compared emulator all lack, or accept without effect, says nothing a visitor can
  use. It is counted in the provenance (`hidden.unavailable`) and reported by every sync.
  A feature only the competitor supports stays (a red ✕ under LocalCloud), as does one whose
  competitor result is not assessed.
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
- a compared row without an official Google documentation link, or whose only link is to a
  repository, a test, an unofficial page or a look-alike host;
- a compared row without a description, a description that only repeats the feature name,
  is too short or too long, or carries internal wording (rows the site hides included);
- any internal wording left in a note after rewriting.

The sync also warns when four or more differently named features share one description,
which usually means filler that should be rewritten upstream.

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
