# Prompt: Spanner comparison, persistence rows, baseline and stable IDs

Paste into an agent session in the `cloud-spanner-emulator` repository. Read `README.md` in
this folder first (the document contract and working rules).

---

You own `docs/emulator-comparison.md` (generated between `individual-feature-matrix:start/end`
from `docs/emulator-comparison-checklist.json`, with fork evidence in
`docs/feature-coverage.yaml`). To change it, edit the checklist, then run
`python3 -m tools.emulator_comparison generate`, `python3 -m tools.emulator_comparison check` and
`python3 -m unittest tools.emulator_comparison_test`. Never hand-edit the generated table.

The site publishes this comparison. It currently reads 757 rows (Google emulator v1.5.58 vs the
extended emulator), and the totals table reproduces exactly. Fix these:

## 1. One feature, one row: the persistence rows

The section "Emulator-specific capabilities" has 17 rows, 15 of them about `--data_dir`
persistence with an identical limit note ("Requires --data_dir; power-loss durability and type
limitations remain documented.") and the same generic production link. They count one
capability fifteen times (14 of the extended emulator's 177 advantages) and the section title
contradicts "local process flags are excluded from metrics".

- Express persistence as production behaviors, each with the production page that defines it
  (durability of committed data, backups, change streams, IAM policies, long-running operations).
  Keep a row only where production documents a distinct capability and the emulator's behavior
  differs by data class, and give each a distinct note (what persists, what does not).
- Keep the two real limits as their own rows: persistent non-NULL `PROTO` and `ENUM` values
  remain unavailable.
- Rename or remove the "Emulator-specific capabilities" heading so every remaining row sits in
  a production area. Update the checklist counts and the totals table (they are generated).

## 2. The Google baseline is no longer the latest

Three rows say the Google emulator v1.5.59 adds the feature ("INFORMATION_SCHEMA.PLACEMENTS",
"INFORMATION_SCHEMA.PLACEMENT_OPTIONS", "CREATE QUEUE statement") while the column is pinned to
v1.5.58. Check upstream's newest release tag. If it is newer than v1.5.58, re-assess every row
against it (release notes and the diff since v1.5.58 show what changed), repin the column
header, the commit link and the baseline paragraph, and re-run the generator. If v1.5.58 is
still the newest, remove the "adds this too" remarks.

## 3. Stable IDs and a machine-readable export

Give every checklist row a stable `id` (for example `data-api.list-sessions.label-filtering`) that
never changes when the title is reworded, show it in the table (first column, heading `ID`), and
write `docs/emulator-comparison.csv` with one line per row: `id, area, feature, google_emulator,
extended, limit`. Add both to the generator and its test. IDs let the site keep links and history
across wording changes.

## 4. Readability

Replace the link text "Google docs" (757 rows) with the name of the page or method it points
to, for example "Backups" or "ListSessions", so a reader can see where each row leads.

## Done when

The generator `check` and the tests pass, the totals table equals the rows, and no checklist row
describes only an emulator flag. Commit with before and after totals in the message. Do not push.
