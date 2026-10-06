# Flows and contracts

This reference describes site behavior from the recorded source. Emulator endpoints in the site contract belong to another system; they are not implemented by these routes. [OBS-001]

## Routes and content ownership

| Surface | Producer / data | Contract |
| --- | --- | --- |
| `/` | `src/pages/index.astro:1–12`, homepage component | Evaluator entry with installation and catalog sections. |
| `/pricing/` | Pricing page and `src/components/PricingWorkbench.astro:31–85` | One free-preview offer with Get started / View license. |
| `/docs/` and `/docs/*/` | `src/pages/docs/*.mdx`, `src/layouts/DocsLayout.astro:8–73` | Frontmatter provides title/description and optional author/updated/reviewed dates. Shared navigation supplies previous/next links. |
| `/services/`, `/services/{slug}/` | `services.ts`, `src/pages/services/[slug].astro:11–35` | One generated detail route per published service; slugs come from the editorial overlay. |
| `/services/{slug}/ai-agent-local-testing/` | `src/data/agenticContent.ts:485–495` | Generated only for agent metadata not marked planned; includes service-specific boundaries. |
| `/ai/` | AI onboarding page | Human entry to prompts, guides and machine-readable resources. |
| `/agents/*/`, `/workflows/*/`, `/compare/*/`, `/glossary/*/`, generated `/blog/*/` | Typed arrays in `agenticContent.ts`, shared content renderer | Page records include identity, headings, prompts, sections, limitations and links. |
| Service/search landing pages | `src/pages/*-emulator.astro` and other explicit landing routes | User intent pages; the priority set is defined in `scripts/search-routes.mjs:3–37`. |
| `/install.sh` | `public/install.sh` | Static installer download; does not run on the website server. |
| `/llms.txt`, `/llms-full.txt` | Generated public files | Compact discovery and longer agent context; regeneration writes tracked files. |
| `/immersive-demo/` | `src/pages/immersive-demo.astro:8–19` | Noindex visual experiment with mock data. |
| Missing routes | `src/pages/404.astro` | A static 404 page exists; actual hosting status/rewrites were not tested. |

[OBS-001–004, OBS-008–009; REQ-006]

### Raw Markdown routes

Six source handlers return `text/markdown; charset=utf-8` with `Cache-Control: public, max-age=3600`: `/ai/agents.md`, `/ai/AGENTS.md`, `/ai/resources.md`, `/ai/services.md`, `/ai/compatibility.md`, `/ai/docs.md`. The uppercase `AGENTS.md` route adds attachment disposition; lowercase `agents.md` adds inline disposition. These are source response declarations; GitHub Pages header delivery was not verified. [OBS-003; `src/pages/ai/agents.md.ts:3–10`, `src/pages/ai/AGENTS.md/index.ts:3–10`]

## Human quick start

1. Choose Install script or Homebrew. The command displayed and copied comes from the same product-fact value.
2. Copy `localcloud start` and `localcloud console` together.
3. Use CLI-returned endpoint values when canonical ports are occupied.
4. Follow `/docs/` and SDK/environment guidance for application integration; the homepage intentionally omits the longer doctor/env sequence.

This sequence is documented behavior, not a runtime workflow executed in this reconstruction. [REQ-003, REQ-004; E-007 m243–244; `src/components/InstallationMethods.astro:7–76`]

The installer separately supports `--version X.Y.Z`, `--install-dir PATH`, `--no-start`, `--no-modify-path`, `--uninstall` and `--help`. It validates versions, archive members/checksums and executable version output before installing managed files. Same-version matching ignores trailing commit/date metadata. A non-TTY or `--no-start` path prints next steps; an interactive path can offer doctor/start. A failed doctor/start reports recovery even though CLI installation itself has completed. [OBS-006; `public/install.sh:423–465,588–705,828–847`]

## Service/content contract

The site loads schema version **3**. Its entry guard checks the root object, schema version and service array, then casts to the TypeScript contract. It is the **build verifier**, not that cast, that checks nested structure and semantic invariants. [OBS-002; `src/data/docs-contract.ts:205–217`]

| Field/group | Meaning | Do not infer |
| --- | --- | --- |
| `provenance` | Reviewed runtime/CLI revisions, sources, hashes, dirty-source list, qualification | Live HEAD parity, immutable image qualification or current production deployment |
| `availability` / `published` | Registry availability and whether the site emits a public entry | Default startup or full API support |
| `registryDefaultEnabled` / `assembledDefault` | Separate source-default and assembled-default records with evidence | Identical behavior across every image/build |
| `minTier` | Technical access metadata | A pricing plan or legal grant |
| Service/operation `status` | `verified`, `partial`, `release-unverified`, `unsupported`, `unknown` | A binary supported/unsupported answer across all clients |
| `persistence` | Scope, backing store, restart behavior, recovery limits, qualification | Production durability guarantees |
| Editorial fields | Slug, category, icon, short description | Authority to rewrite runtime facts |

[PRIN-001, PRIN-002; `src/data/docs-contract.ts:3–75,78–203`]

`services.ts` excludes unpublished entries, looks up the editorial record, formats endpoint labels and selects positive operations from verified/partial/release-unverified records. Detail pages keep unsupported/unknown operations in Service boundaries. Agent metadata preserves operation status text; unknown/unsupported service evidence maps to planned in that adapter. Unknown service/editorial lookups throw instead of silently disappearing. [REQ-010, OBS-002; `src/data/services.ts:98–151`, `src/pages/services/[slug].astro:32–36,96–122`, `src/data/agenticFacts.ts:100–155`]

Agent page records require `kind`, `slug`, `path`, parent links, title/description/H1/deck, prompt IDs, quick facts, sections, limitations and internal links; snippets/tables/sources/review date are optional. The renderer currently resolves prompt IDs with `find` and drops unresolved entries via `filter(Boolean)`; this is observed behavior, not an enforced error contract. [OBS-003; `src/data/agenticContent.ts:45–64`, `src/components/AgenticContentPage.astro:17–19`]

## Browser state and failure behavior

| Interaction | Transition and failure behavior | Source |
| --- | --- | --- |
| Search | Closed → open via trigger or Cmd/Ctrl+K; body scroll locks and input is focused. Escape, backdrop or result click closes/reset. Pagefind loads lazily; a missing index displays a build-first message. Empty input restores hint; no results displays escaped query. Nonempty results show at most eight links after a 200ms debounce. | `src/components/SearchModal.astro:53–167` |
| Search analytics | `search_opened` fires when available. `docs_search` fires for length ≥3 **only after** results are found and rendered; no-result/missing-index branches return earlier. | `src/components/SearchModal.astro:65–72,123–156` |
| Copy | Clipboard success shows Copied and resets after 2s; failure shows Copy failed and manual-copy guidance, resetting after 5s. No success is inferred from the click alone. | `src/components/CopyButton.astro:85–116` |
| Code tabs | First tab selected; click/left/right/Home/End update selected state, tabindex, panel visibility and focus. Component supports five named slots. | `src/components/CodeTabs.astro:24,34–75,88–129` |
| Documentation feedback | Yes sends an event and thanks; No opens optional comment; Send includes trimmed text, Skip sends the rating only. Textarea limit is 500. If PostHog is unavailable, UI still thanks the user without confirmation of delivery. | `src/components/DocFeedback.astro:27–43,56–96` |
| Feedback FAB | Closed → menu; opening constructs GitHub issue links using page context. Outside click closes. Selecting a link opens GitHub's issue form, not a site API. | `src/components/FeedbackFab.astro:60–120` |
| Docs navigation | Sidebar order determines previous/next; mobile navigation uses native details/summary. Copy enhancement adds buttons to code blocks. | `src/layouts/DocsLayout.astro:62–73,120–149,229–270` |

[OBS-004, OBS-005, PRIN-005]

These scripts were inspected, not exercised in a browser. Focus trapping/restoration, async search races, no-JS behavior, screen-reader announcements and analytics delivery still need browser-level acceptance work. [GAP-008]

## Data collection and non-applicable APIs

Search and feedback use Pagefind/local browser state plus PostHog events; feature/content reports go through prefilled GitHub links. BaseLayout enables pageviews, pageleave and exception capture plus explicit events (code_copied, cta_clicked, github_click, time_on_page, search and feedback events), with autocapture, session recording, heatmaps, dead-click and performance capture disabled; since plan R5 it loads PostHog and the Cloudflare beacon after load and idle, and not at all when Global Privacy Control, Do Not Track or the footer "Analytics: Off" control applies. Do not describe the website as having no external data collection. [OBS-005; `src/layouts/BaseLayout.astro:85–106`]

No site-owned authentication, account database, payment API, resource CRUD API or background job service was found in the reviewed `src/pages` and deployment scope. `/health`, `/env`, seed/reset and `/mcp` references are instructions for the separate runtime. They are not site routes, and were not called. [OBS-001, REQ-009]
