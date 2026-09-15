# Coverage and evidence

## Snapshot and evidence boundaries

This reconstruction covers the **2026-09-10 dirty working tree** at HEAD `89679ec7c068a2e2f980991edd29144d36c55ac7`: 12 modified tracked files and one untracked file were already present. Preflight began at 20:19:20 UTC; the reconstruction baseline was captured at 20:24:17 UTC. SHA-256 hashes identify 319 safe repository files. Current code observations apply to those recorded contents, not merely the commit.

The repository is a static Astro site with marketing/docs, agent-readable artifacts, distributed skills and a public CLI installer. Runtime/CLI internals are separate projects. Only existing local upstream parity checks and directly related historical context cross that boundary. No backend capability is newly qualified here. [OBS-001, GAP-008]

## Historical enumeration and review

| Measure | Count and denominator |
| --- | --- |
| Unique candidate records discovered | **346**, union of the methods below |
| Included sessions | **75** |
| Included/retrievable | **75 of 75**, export exit 0 plus retained indexed rows |
| Fully reviewed indexed text | **2 of 75**: E-077, E-079 |
| Partially reviewed included sessions | **73 of 75**, exact ranges in the inventory |
| Unavailable included sessions | **0 of 75**; parser/attachment omissions remain unquantified |
| Excluded candidates | **6 of 346**, unrelated tooling/home configuration |
| Scope still needs review | **265 of 346**, metadata-only cross-workspace candidates |
| Entire historical universe | **UNKNOWN**; no deleted/unindexed-history recovery claim |

CASS 0.7.1 and CM 0.2.14 were confirmed using installed help/version output. The canonical workspace and `/src/AI/localcloud-site` alias listings each returned 76 records with limit 100000. Sessions help exposes no cursor; a short result alone was not treated as completeness. Read-only SQLite metadata established 76 indexed records across the canonical site workspace and Gemini's project alias. The CLI list included three unrelated home-workspace records and omitted three Gemini alias records; their union contains 79 records before identity-search expansion.

A lexical project-identity search returned 3818 hits, matching its reported total, with no cursor, timeout or clamping. Its source-locator union plus workspace metadata produced 346 candidate records. Two sibling-workspace delegated sessions were selected because their assignments explicitly target this site's source: E-082 and E-084. Other cross-project candidates were not ingested wholesale. No second Git worktree was present in the recorded worktree metadata.

This is a bounded inventory, not proof that every former directory or deleted session was found. CASS health reported a stale index checkpoint at **2026-09-10T19:23:13.042Z**. No rebuild/repair ran. Reconstruction calls set `CASS_AUTO_REFRESH=0`, but support for that environment variable was not established by installed help; searches also used the explicit `--no-maintenance --no-daemon` flags. These distinctions are retained in `enumeration.json`.

Every included session has a full CASS Markdown export and a separate file of all available indexed message rows. Provider export formatting can omit or combine tool details, so those are not equivalent representations. Raw provider completeness, truncated embedded tool output and binary/visual attachments remain unverified. Exported does not mean reviewed. The inventory records conservative exact reviewed ranges rather than turning a prompt skim into full-session coverage. E-020's divergent forks E-021–024 are retained; identical role/content prefixes are recorded and not counted as independent corroboration.

Historical tool output, skill bodies and delegated user-role messages are not new user instructions. Prompt-only sessions establish requests, not implementation. This reconstruction's own conversation is excluded from historical evidence. CM's optional context call rejected `--history 0`; no rules were relied on or imported. A prior Codex memory entry helped locate pricing history, then the material claims were checked against E-003 and current source.

## Document-to-source and component map

| Component or concern | Primary document | Evidence |
| --- | --- | --- |
| Repository identity, audience and supported journeys | [Product specification](product-specification.md) | REQ-001–016, OBS-001; manifest/routes |
| Explicit directives and inferred conventions | [Engineering principles](engineering-principles.md) | PRIN-001–005; E-011, E-020, E-025; DESIGN.md |
| Astro layouts, navigation and browser islands/scripts | [Architecture](architecture.md) | OBS-001, OBS-004–005; layouts and shared components |
| Versioned contract, service catalog and editorial joins | [Flows and contracts](flows-and-contracts.md) | OBS-002; contract/services/editorial sources |
| Human/agent page families, Markdown and LLM artifacts | [Architecture](architecture.md), [flows](flows-and-contracts.md) | OBS-003, REQ-013; agentic content/facts/Markdown modules |
| Search, copy, tabs, feedback and analytics | [Flows and contracts](flows-and-contracts.md) | OBS-004–005, PRIN-005; browser handlers |
| Pricing and license-reference policy | [Product specification](product-specification.md), [ADR-002](decisions/ADR-002-free-public-preview.md) | REQ-006–008, GAP-003; E-003 |
| CLI installer, fixtures, build/CI and source generators | [Development and operations](development-and-operations.md), [acceptance](testing-and-acceptance.md) | OBS-006–009, REQ-005; scripts and workflow |
| Distributed skill packs and safety boundaries | [Architecture](architecture.md), [principles](engineering-principles.md) | PRIN-003; agent-skills README/AGENTS and generators |
| Mock immersive demo | [Architecture](architecture.md) | OBS-008; demo route and fixed result data |
| Design system, brand assets and screenshots | [Architecture](architecture.md), [principles](engineering-principles.md) | DESIGN.md and source styles; asset inventory only, no visual assessment |
| Existing specs, reports, launch/measurement docs | [Development and operations](development-and-operations.md) | Scoped source inventory; plans/templates are not proof of launch or measurements |
| Material accepted decisions and documented design | [Decision index](decisions/README.md) | Five ADRs with exact claims/history/code sources |
| Contradictions and missing qualification | [Gap register](gaps-and-open-questions.md) | GAP-001–009 and command artifacts |

Every safe baselined file has a component assignment or exclusion rationale in `component-inventory.json`. That is inventory coverage, not a claim of complete line-by-line review. Dependencies, build/cache outputs and potential secret-bearing configuration are excluded. Binary screenshots/illustrations are not runtime evidence. Internal prompts/specs are not treated as public pages merely because they are present in the repository.

## Compact private evidence index

- `baseline.json`, `repository-hashes-before.json`, `repository-after.json`: snapshot and unchanged-tree verification.
- `session-inventory.jsonl`, `enumeration.json`, `review-summary.json`: identities, scope, retrieval, exact reviewed/missing ranges and denominators.
- `exports/`, `messages/`: private redacted historical exports/indexed windows. Absolute provider locators stay in the evidence mapping.
- `claims.jsonl`: **39 atomic claims**, with separate origin, intent and implementation statuses; exact zero-based historical message and current code locators.
- `source-map.json`, `component-inventory.json`: document/claim/code mappings and file fingerprints.
- `check-results.json`, `checks/`: nine project checks, seven passed and two failed; Node version recorded separately.
- `graph-coverage.json`: stale/changed/partial graph coverage and current-source fallback boundary.
- `cm-rule-candidates.json`: six project-scoped review candidates; not imported and not a supported import-schema claim.
- `redaction-review.json`, `validation.json`, `completion.json`: sanitization scope, structural checks and separate completion statuses.
- Resume record (`evidence/resume.md` in the private archive): actionable pending message ranges and candidate triage, using the already retrieved files.

E-003 supplies the pricing reversal; E-007 the compact workflow; E-011 the accuracy mandate; E-013 MCP ownership; E-014 catalog/build corrections; E-020/E-025 bounded review and design; E-051 domain identity; E-072 private-reference intent. These are evidence pointers, not complete session summaries.

## Overall status

**Substantive documents produced; historical reconstruction remains partial.** Current-source review is bounded to material claims and component discovery. Nine safe checks ran; no full build or production request ran. The site was not modified or published. The private completion record separates document synthesis from history review and records the final repository comparison.
