# Gaps and open questions

These findings concern the recorded working-tree snapshot. They are not edits or publication instructions. History-derived conflicts remain open where later approval was not established in the reviewed windows.

## Observed contradictions and likely implementation gaps

| ID | Evidence and impact | Decision or correction needed |
| --- | --- | --- |
| GAP-001 | Upstream checker fails because runtime HEAD differs from the recorded contract revision. Later digest/catalog checks never execute. | Review upstream changes and deliberately resynchronize the snapshot; do not update a hash without reviewing what changed. |
| GAP-002 | CLI-doc checker requires literal `dynamic`; the homepage already explains occupied-port remapping. | Align the sentence and assertion while preserving the user-facing warning. This is not evidence that the warning is absent. |
| GAP-003 | Root LICENSE restricts company use, while the public runtime-license reference and accepted preview intent allow internal company dev/CI. The policy checker omits root LICENSE. | Identify which artifact each license governs and reconcile links/text. The record does not determine legal rights. |
| GAP-004 | An archived BigQuery gap-analysis page remains public and linked, despite the explicit private-reference correction. The current summary may differ from the rejected material. | Establish whether a later specific publication decision approved this route; otherwise decide its intended public disposition. |
| GAP-005 | Earlier direction limited new LocalStack comparisons; current routes exist. Whether they predated that restriction or were specifically approved later remains unresolved. This is not an established implementation violation. | Review route chronology and accepted SEO artifacts before labeling the earlier instruction superseded or the current page unauthorized. |
| GAP-007 | PRODUCT.md still promises blanket SDK/API equivalence and zero code changes, exceeding the operation-bounded contract. | Align internal product guidance with actual supported boundaries. |
| GAP-009 | Contract retains an older review date, mutable image tag and null assembled-image digest. | Define what the date attests to and retain the source-versus-release distinction; qualify a digest only through appropriate runtime evidence. |

Sources: [GAP-001–005, GAP-007, GAP-009] in the claim ledger; exact code locators and historical message indexes are preserved there. The [acceptance report](testing-and-acceptance.md) records commands and outcomes. No site changes were made to resolve these findings.

## Evidence gaps

- **History review is partial.** All 75 selected sessions have local exports and indexed-message windows, but only two have complete indexed-text review. The remaining 73 have explicit bounded review ranges. Another 265 identity-search candidates remain metadata-only and untriaged. Six records were excluded. Retrieved text is not equivalent to reviewed text. [GAP-006; session inventory]
- **Historical universe is unknown.** The 346 discovered candidates describe the union of specific local enumeration methods. Deleted/unindexed sessions, unrecognized former paths, visual attachments and provider-parser omissions are not recovered by that count. CASS reports a stale checkpoint; no rebuild occurred.
- **Current behavior is mostly source evidence.** No full build, browser, screen-reader, responsive screenshot, real CLI/SDK, runtime image, deployed redirect, analytics delivery or search-ranking check was performed. The installer has passing fixture evidence only. [GAP-008]
- **Indexed code has limits.** The code graph predates the dirty snapshot and reports changed/partial files. Material claims used current source fallback; graph completeness is not assumed. Binary assets were inventoried, not visually inspected.
- **Optional procedural memory was not used as authority.** CM was installed, but the attempted scoped context lookup rejected `--history 0`. No CM rules were imported or treated as project requirements. Memory used for locating the preview session was independently checked against indexed history and current source.

## Recommendations, separate from recovered requirements

1. Add an explicit consistency check for the chosen license artifact/reference scope after that policy is resolved.
2. Test search focus restoration, response ordering, empty/error states and query-event semantics in a browser; current source emits search analytics only after nonempty results.
3. Check JSON-LD escaping with quotes in MDX titles/descriptions across all relevant routes; current layout interpolation deserves a focused rendered check.
4. Maintain one owner for snapshot synchronization and truthful review dates. Keep source evidence and assembled-image evidence distinct.

These are suggested follow-up work, not changes requested by historical users. None was implemented during reconstruction. [OBS-004, OBS-005, PRIN-001, PRIN-002; `src/components/SearchModal.astro:113–156`; `src/layouts/DocsLayout.astro:78–97`]

## Questions for the project owner

- Does the root site LICENSE govern only this website's source, and which canonical grant should its public documentation describe?
- Should the archived BigQuery gap-analysis route remain public?
- Which later accepted artifact, if any, authorizes the current LocalStack comparison scope?
- What evidence must advance the contract's review date or qualify an assembled image?

The private resume record (`evidence/resume.md` in the private archive) identifies concrete remaining historical ranges. No manual extraction by the user is required to continue from those local artifacts.
