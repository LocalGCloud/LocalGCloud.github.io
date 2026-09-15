# Engineering principles

These principles apply to this site's content and delivery. Historical tool instructions, generic skill text and temporary agent assignments are not adopted as permanent project policy.

## Explicit project directions

| Principle | Why it matters | Exceptions and evidence |
| --- | --- | --- |
| **Use current product evidence and write for users.** | Internal implementation vocabulary and stale upstream facts make public setup unreliable. | Technical detail is appropriate when it changes a user's action. E-011 m4/m73; REQ-002. |
| **Make the homepage quick start compact.** | The user repeatedly reduced visual weight and step count. | Keep doctor, environment export and detailed recovery in reference guidance; the two-step restriction is for the homepage. E-007 m0/m70/m226–244; REQ-003. |
| **Keep catalog presentation positive without deleting boundaries.** | Readiness labels on every card were distracting. | Unsupported/unknown operations, persistence limits and genuinely planned states still matter on detailed surfaces. E-014 m0/m164; REQ-010; `src/pages/services/[slug].astro:96–122`. |
| **Preserve the Google-adjacent identity and boxed catalog.** | A prior flattening of the catalog was explicitly rejected. | Flat narrative sections are compatible with bordered category/service panels. E-049 m56; E-025 m294/m762; REQ-011/012. |
| **Keep review proportional.** | Repeated exhaustive reviews delayed bounded changes. | Accuracy, necessary validation and security checks remain required; this is not permission to omit relevant evidence. E-020 m536; E-025 m718; PRIN-004. |
| **Separate site build from installer integration tests.** | Interactive fixture output obscured what a site build was doing. | CI deliberately runs both as separate steps. E-014 m679–680; REQ-005. |

## Accepted design embodied in code

**One technical contract, separate editorial fields.** Runtime/CLI facts live in the versioned snapshot. `serviceEditorial.ts` owns slugs, category, icons and short descriptions; adapters join them and fail on missing mappings. Update shared facts and their consumers together rather than repairing only one page. The remediation design establishes this rule; current adapters support it. [PRIN-001; `src/data/docs-contract.ts:205–226`, `src/data/serviceEditorial.ts:19–54`, `src/data/services.ts:98–151`]

**Preserve evidence strength.** `verified`, `partial`, `release-unverified`, `unsupported` and `unknown` are different statements. A listed workflow can remain limited; a default-enabled process is not release-qualified; a test file is not a test result. The current snapshot lacks an assembled-image digest. [PRIN-002, GAP-009; `src/data/docs-contract.ts:3–22`]

**Make failure usable.** Copy buttons announce success or failure and direct users to manual copying; wide tables keep semantic structure inside labeled focusable regions. Do not trade away keyboard operation to make docs compact. This is a source-supported design standard, not a measured site-wide accessibility certification. [PRIN-005; `DESIGN.md:180–196`, `src/components/CopyButton.astro:93–115`, `src/utils/rehype-table-regions.mjs:23–39`]

**Keep local agent validation local.** Distributed skills reject real-credential/production fallback and require a separate authorized real-GCP validation before production use. Runtime MCP protocol details remain owned by the runtime repository. [PRIN-003, REQ-009; `agent-skills/AGENTS.md:5–13`, `agent-skills/README.md:49–56`]

## Inferred conventions, not recovered directives

- Shared layouts own navigation, canonical metadata, search and analytics; route pages supply content. This reduces cross-page divergence, but no historical mandate to use Astro rather than another framework was established. [OBS-001, OBS-003]
- The priority-route registry is an executable SEO contract, not an exhaustive route catalog. Extend route facts and checks together when adding a supported search journey. [OBS-007; `scripts/search-routes.mjs:3–37`]

## Obsolete or conflicting guidance

Do not restore the superseded two-tier price model, the old Sheets exclusion/Firestore placeholder, or blanket no-cost/API-parity claims from `PRODUCT.md`. The narrower root site license and the public preview summary still need reconciliation. A prior instruction to keep private reference material off-site remains an unresolved publication boundary, not permission inferred from the existence of a public route. [REQ-007, REQ-015, GAP-003, GAP-004, GAP-007]
