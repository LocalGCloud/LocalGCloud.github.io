# Prompt: Bigtable comparison, unknowns and stable IDs

Paste into an agent session in the `little_bigtable` repository. Read `README.md` in this
folder first (the document contract and working rules).

---

You own `EMULATOR_COMPARISON.md`, which compares Little Bigtable (LocalCloud Bigtable) with
**production Google Cloud Bigtable**: 493 rows across RPCs, request fields, filters, GC rules,
mutations, read-modify-write operations, aggregate types, behaviors and SQL functions, with a
Google Cloud Bigtable emulator column and a description for each row. Its totals table reproduces
exactly. Fix these:

## 1. The Google emulator column (done)

Completed on 2026-10-21 in commit `96bbab6`: every feature table and the side-by-side table carry a
`Google Cloud Bigtable emulator` column (the `cbtemulator` server, package `bttest` of
`cloud.google.com/go/bigtable` v1.58.0), the coverage metrics table has `Google emulator ✓ / ◐ / ✗ / ?`
columns, and `tools/check_emulator_comparison.py` verifies the tables. Keep it current: when the
client library moves to a newer release, re-inspect `bttest` and `cmd/emulator`, update the marks
and the version in the baselines table, and re-run the check. Do not re-add emulator-only rows.

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

The totals table equals the rows, the two unknowns are resolved,
and the generator check and the repository tests pass. Commit with before and after totals. Do not
push.
