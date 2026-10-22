# Prompt: refresh the site's emulator comparisons from the upstream documents

Paste this into an agent session in the `localcloud-site` repository whenever a comparison
document (feature or compatibility metrics) has changed upstream. The upstream documents
are the source of truth; the site must follow them without publishing their internal detail.

---

You are refreshing the `/compare/emulators/` tables on local.cloud from the upstream
comparison documents. Read `docs/emulator-comparisons.md` first: it defines the pipeline,
what visitors may see, and what the importer refuses. Follow the repository instructions
(`AGENTS.md`, `docs/site-marketing-principles.md`) and the global worktree workflow: work in
a git worktree on a named branch, commit, rebase onto `main`, fast-forward `main`, test on
`main`, remove the worktree. Do not push; a push to `main` deploys the site, so ask first.

## 1. Preconditions

- The sibling repositories are in `../local_cloud_dependencies` (override with the first
  argument). Each document must be committed; the importer rejects uncommitted files. If one
  is not, stop and report which, rather than committing in another repository.
- Use the repository state as it is now. Other agents may be committing upstream; do not
  chase newer commits mid-run. The provenance records exactly which document digests you used.

## 2. See what changed

```sh
python3 scripts/sync-emulator-comparisons.py --check ../local_cloud_dependencies
```

It prints, per service, documented rows, rows shown, advantages, broader behaviors, rows
hidden as unassessed or repeated, and whether the document has a competitor column, and it
lists what is out of date. If nothing is out of date, say so and stop.

## 3. Sync

```sh
python3 scripts/sync-emulator-comparisons.py ../local_cloud_dependencies
```

It writes `src/data/emulator-comparisons/*.json`, `index.json` and
`src/data/emulator-comparison-provenance.json`. Never edit those by hand. If the sync fails,
fix the cause in the importer, never by weakening a check:

| Message | Meaning | Fix |
| --- | --- | --- |
| `has uncommitted changes` | document not committed upstream | stop; report |
| `unrecognized comparison mark` | a new glyph or a marker with a suffix | read the document's legend; add it to `STATES`/`MARK` only if its meaning is clear, otherwise report |
| `has N cells under M headings` | a table row is malformed (often an unescaped `\|`) | report upstream; do not skip the row |
| `parsed rows do not match the document's own totals` | a table was renamed, split, or its columns changed, so rows were skipped or misread | open the document, update that service's role patterns (`spec`) in its adapter, re-run; the totals must then match exactly |
| `no longer states its totals where the importer looks` | the metrics table moved or was reworded | update `stated()` for that service |
| `the document repeats the row ID` | duplicate IDs upstream | report upstream |
| `rows have no description` / `unusable descriptions` | a feature was added without its `Description`, or it is blank filler, too short or leaks internal wording | report upstream with the feature names; never write descriptions on the site |
| `notes still carry internal wording` | new evidence phrasing leaked into notes | extend `DROP` or `TERMS` for that service; never edit `LEAKS` to let it pass |
| `lacks columns` (BigQuery CSV) | the generator changed its columns | update `BIGQUERY_COLUMNS` and the adapter |

Add or adjust a unit test in `scripts/test_sync_emulator_comparisons.py` for every importer
change, using a small inline document that reproduces the new shape.

## 4. Review the result like an editor

Compare the new inventories with the previous ones (`git diff --stat`, then by row ID) and
write a short summary per service:

- documented vs shown rows; advantages and broader behaviors before and after;
- rows added, removed, renamed (ID changes) and whose status changed, with the largest swings;
- `hidden.unassessed` and `hidden.repeated`: each hidden unassessed LocalCloud row is a gap in
  the document, so list the biggest groups for the upstream owners;
- any service whose `hasCompetitor` flipped (a document that gains or loses its competitor column).
  The site then shows or hides the competitor column and advantage counts by itself; confirm that
  service's `competitor`, `baseline` and `baselineUrl` in `src/data/emulatorComparisons.ts` against
  the document's own baseline section;
- descriptions: read about 20 new or changed ones per service against the feature they describe,
  and look at the `sharedDescriptions` warnings the sync prints. A wrong or filler description is
  an upstream defect; report it, do not edit the inventory;
- a change of baseline (emulator version or commit, production reference date). Update the
  `baseline`, `baselineUrl` and `scope` text so it still matches the document.

A swing above roughly 10% in rows or advantages for one service is a signal to re-read that
document before accepting it; say so in your report rather than assuming it is right.
Do not "fix" a surprising count by changing a rule in the importer; explain it.

## 5. Keep the editorial layer true

`src/data/emulatorComparisons.ts` (summary, scope, baseline) and the copy on the comparison
pages are editorial. Check them against the changed documents. Rules:

- Positive, capability-oriented wording; follow `docs/site-marketing-principles.md`. Two
  categories only: never label anything "Partial" (limited results read "Scoped").
- Name only what the naming policy allows: the competitor emulators on the comparison pages
  are already exempt in `scripts/verify-content-facts.mjs`; do not name any other project.
- No person or branch names, no private-repository links, no official reference links and no
  commit hashes in anything a visitor can see.
- Firestore: the Extended profile drives advantages and requires its documented
  configuration; keep that stated.
- Counts are inventory rows, not a feature count or a benchmark; keep the existing caveat.

## 6. Verify

```sh
python3 -B -m unittest scripts/test_sync_emulator_comparisons.py
node --test scripts/verify-emulator-comparisons.test.mjs
pnpm run build
pnpm run test:comparisons     # needs Chrome; counts come from the inventories
pnpm run test:installer
graft build                   # only if symbols or files changed
```

Everything must pass. If a Chrome test fails because a layout assumption changed, fix the test
for the new behavior only after checking the page in a browser. Never delete an assertion to
make it pass.

## 7. Report

Finish with: what changed per service (the table from step 4), importer changes and tests
added, the upstream follow-ups (unassessed groups, duplicate IDs, documents that disagree with
their own totals) and the exact commands you ran with their results. Mention anything you
chose not to do and why.
