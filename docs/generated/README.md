# LocalCloud site documentation reconstruction

**Internal review drafts.** These documents describe the site repository and recovered product intent. They are not public-site content or a release certification.

This repository copy preserves the original reconstruction snapshot and its partial-history limitations. Private transcripts, claim ledgers, check logs and resume details remain outside the checkout at `~/.local/share/project-docs/localcloud-site/runs/20260910T201920Z-b8r_oll7/evidence/`. References to evidence files below and in the other documents refer to that archive. The site-unchanged statements describe the original reconstruction run, before these documents were copied here.

Snapshot: **2026-09-10 UTC**, HEAD **89679ec7c068a2e2f980991edd29144d36c55ac7**, branch `main`, with **12 modified tracked files and one untracked file** at entry. This is a working-tree snapshot, not an exact copy of HEAD. Detailed baseline, file hashes and source mappings live in the private evidence directory.

This repository is an **Astro marketing and documentation site**, hosted through a GitHub Pages workflow. It owns web pages, machine-readable documentation, portable agent skills, and the publicly served CLI installer. It does not implement the LocalCloud emulator, operational console or runtime MCP server. [OBS-001; `package.json:2`, `astro.config.mjs:18`, `.github/workflows/deploy.yml:31`]

## Read by purpose

| Need | Document |
| --- | --- |
| Understand users, journeys and accepted requirements | [Product specification](product-specification.md) |
| Preserve the rationale behind the implementation | [Engineering principles](engineering-principles.md) |
| Locate component boundaries and data ownership | [Architecture](architecture.md) |
| Understand routes, content contracts and browser behavior | [Flows and contracts](flows-and-contracts.md) |
| Work locally and understand build/deployment effects | [Development and operations](development-and-operations.md) |
| See acceptance criteria and actual check results | [Testing and acceptance](testing-and-acceptance.md) |
| Review material product/architecture choices | [Decision records](decisions/README.md) |
| Resolve contradictions and missing evidence | [Gaps and open questions](gaps-and-open-questions.md) |
| Audit sources and coverage | [Coverage and evidence](coverage-and-evidence.md) |

## How to read claims

**Requested/accepted** describes historical intent. **Observed** means current source supports the behavior. **Verified in this run** is reserved for the named checks actually executed. Historical agent completion reports and tests present in the tree are not new execution evidence. A site statement about an emulator is evidence of what the site says, not proof that the emulator does it. [PRIN-002]

References such as `[REQ-006; E-003 m411, m423, m427–436]` identify claim-ledger entries and zero-based indexed CASS message numbers. Code locators refer to the recorded working tree. Private transcript paths are deliberately kept out of the readable drafts.

## Headline limits and findings

- All requested document types have been written; **history review is partial**, with explicit ranges and continuation work recorded. CASS is usable but its lexical index was marked stale. The total historical universe is **UNKNOWN**. See [coverage](coverage-and-evidence.md).
- Seven of nine project checks passed. The upstream snapshot gate and the CLI-docs gate failed. The latter is an exact-word mismatch despite a visible remapping warning. [GAP-001, GAP-002]
- The root site license and preview-license wording disagree; a formerly private BigQuery reference remains a public archived route. These require owner decisions, not invented reconciliation. [GAP-003, GAP-004]
- No site build, deployment, production fetch, dependency installation, index rebuild or global-memory change was performed. Application files were left unchanged; the final evidence report records the status/hash comparison. [GAP-008]
