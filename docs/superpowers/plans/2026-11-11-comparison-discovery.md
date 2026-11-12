# Comparison Discovery Implementation Plan

> Steps use checkbox (`- [x]`) syntax so an executor can track progress task by task.

**Goal:** Show LocalCloud's complete breadth by default, include unassessed competitor features as provisional advantages, and explain each category.

**Architecture:** Keep imported row assessment states and provenance intact. Apply the requested provisional policy in the Python count generator and shared browser filtering; publish an explicit caveat and distinguish unassessed marks. Keep category explanations in one editorial data map used by the shared table.

**Tech Stack:** Astro 7, JavaScript, TypeScript, Python 3; Node 24.21.0 and pnpm 12.9.1.

**Spec:** User's current request: All features by default; unknown competitor results provisionally count as unavailable and appear in Only in LocalCloud; warn that assessments may be incomplete/outdated; summarize every category.

## Global Constraints

- Preserve source `unknown` states in downloads and provenance. Do not assert newly verified competitor absence.
- Preserve existing routes, explicit `features=advantages` links, search, lazy loading and Back/Forward across Desktop, Classic, Mobile and agent views.
- No dependencies, upstream capability edits, pushes or deployment. Commit, fast-forward local main, verify and remove the task worktree.

### Task 1: Provisional advantage policy and regenerated counts

**Files:** `src/utils/emulator-comparisons.mjs`, `scripts/sync-emulator-comparisons.py`, both existing importer/data unit suites, generated `src/data/emulator-comparisons/index.json`.

**Interfaces:** Keep `isOnlyInLocalCloud(row)`, `groupComparisonRows(rows)`, `summarize(rows)` and the index schema stable. Extend category groups with an unassessed count for qualified labels.

- [x] Change the regression expectation for available/unknown to qualify; limited/available, not-applicable and missing competitor columns must remain excluded.
- [x] Use `['unavailable', 'no-effect', 'unknown']` for competitor provisional gaps in both implementations. Preserve the imported rows unchanged.
- [x] Regenerate using `python3 scripts/sync-emulator-comparisons.py /Users/jsenjaliya/src/AI/local_cloud_dependencies`; verify index totals against browser selection and `--check`.

### Task 2: Default view, caveat and category explanations

**Files:** shared comparison table/count/details components, `src/data/emulatorComparisons.ts`, `src/pages/compare/emulators/index.astro`, new `src/data/emulatorComparisonCategories.mjs`, comparison documentation and refresh prompt.

**Interfaces:** `categorySummaries[serviceId][area]` supplies plain editorial sentences. No generator writes that map. Existing `features=all|advantages` remains the URL interface.

- [x] Set `defaultMode = 'all'` in the shared table and check its All features radio in initial HTML.
- [x] Show every category explanation in its Details cell in initial HTML/Markdown. Require coverage for each inventory area in unit tests.
- [x] Label unknown marks as provisional unavailable with an asterisk and accessible "not assessed" text. Add a nearby warning: unassessed features are treated as unavailable for this comparison; assessments may be incomplete or outdated and those features may be supported.
- [x] Qualify affected category/header/tab counts with the same asterisk. Update refresh instructions to preserve raw unknowns and apply this presentation policy.

### Task 3: Qualification and local integration

**Files:** `scripts/verify-emulator-comparisons-browser.test.mjs`, existing verification suites; task-owned generated artifacts only.

- [x] Verify SQL / SELECT shows all 132 rows by default and 127 provisional advantages; ML shows all 55 rows in both modes, including per-row not-assessed distinction.
- [x] Verify category summaries, warning, explicit advantage links, filtering and history on mobile and desktop; retain all existing behavior assertions with expectations updated for the new policy.
- [x] Run `pnpm run test:dependencies`, `pnpm run build`, `pnpm run test:installer`, `pnpm run test:comparisons`, `graft build`, and `git diff --check`. Inspect the real browser rendering.
- [x] Commit the task diff, rebase onto main, fast-forward main, run required checks on main and remove only the clean merged task worktree.

## Qualification record

- Importer: 43 Python tests passed; generated inventory drift check passed.
- Comparison and browser suite: 54 tests passed, covering Classic, Desktop and Mobile, provisional ML visibility, SELECT counts, history, failed-fetch retries and Markdown references.
- Dependency audit, full build and installer checks passed. The bounded combined agent corpus is 396,402 bytes; full category explanations remain in each standalone Markdown reference.
- Real browser confirmed 55 ML rows in the advantage view with the caveat and category description; screenshot saved outside the repository.
- Local integration follows the required commit/rebase/fast-forward and main verification workflow; no push or deployment.
