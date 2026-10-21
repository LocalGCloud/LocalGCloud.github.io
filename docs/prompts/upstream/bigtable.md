# Prompt: Bigtable comparison, Google emulator column, unknowns and stable IDs

Paste into an agent session in the `little_bigtable` repository. Read `README.md` in this
folder first (the document contract and working rules).

---

You own `EMULATOR_COMPARISON.md`, which compares Little Bigtable (LocalCloud Bigtable) with
**production Google Cloud Bigtable**: 493 rows across RPCs, request fields, filters, GC rules,
mutations, read-modify-write operations, aggregate types, behaviors and SQL functions. Its
totals table reproduces exactly. Fix these:

## 1. Restore the Google emulator column

The previous version of the document (commit `dd3a724`, "EMULATOR_COMPARISON.md") compared
against Google's own emulator (`cbtemulator`, package `bttest` of
`googleapis/google-cloud-go` commit `3266de7c69fd3c05c921823bcfd92b0a8f0b1ffa`, with the Cloud SDK
emulator guide) with one assessed row per RPC. The rewrite onto the production baseline dropped
that column completely, so the site can no longer show where LocalCloud Bigtable goes beyond
Google's emulator (the old document supported 303 such rows).

- Add a column headed `Google emulator` next to `Local` in every feature table (RPC, Field,
  Capability, SQL), keeping `Production` first. Carry the old marks forward by mapping each old
  RPC and capability row onto its production row; re-inspect the pinned source for rows that
  changed meaning. Basis rules: `✗` only for an explicit absence (no handler, a documented
  limitation such as volatile storage); `?` where the source was not checked. The Google emulator
  has no GoogleSQL engine, so verify that and mark SQL rows accordingly.
- Add the Google emulator to the baselines table (pin the commit and review date), the legend,
  and the coverage metrics table (add `Google ✓ / ◐ / ✗ / ?` columns), so the totals stay
  verifiable against the rows.
- Keep one definition of each production row. Do not re-add emulator-only rows.

## 2. Assess the two unknown local rows

`Production-compatible multi-column CMV keys` ("encoding has not been verified against
production") and `Temporal table filters` ("not qualified in the local capability audit"). Test
both with the executable ledger and set `✓`, `◐` or `✗` with the limit stated.

## 3. Stable IDs and a machine-readable export

Add an `ID` column (for example `rpc.BigtableInstanceAdmin.CreateAppProfile`,
`sql.ABS`, `filter.chain`) that survives renames, and write `EMULATOR_COMPARISON.csv` with the same
rows and columns. If the document is currently edited by hand, add a small generator with a
`--check` mode and a unit test so the table, the totals and the CSV cannot drift apart.

## 4. Readability

Replace the link text "Google docs" and "Function reference" with the method, field or function
name each link defines.

## Done when

The totals table (now including the Google column) equals the rows, the two unknowns are resolved,
and the generator check and the repository tests pass. Commit with before and after totals. Do not
push.
