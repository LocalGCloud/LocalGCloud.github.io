# Development patterns recovered from project history

## Scope of this synthesis

Reviewed on 2026-10-20 using read-only local Codex history and the current repository. The local index returned 142 project-linked records: 57 prior topic chats, 84 automated Guardian review records, and the current skill request. Recovered the 57 topic conversations using persisted chat items or available session logs, including older conversations whose recorded log files had moved. The extracted topic corpus contained 331 user-message records after removing injected context/skill payloads and eight scheduled heartbeat messages; repeated prompts and clarification replies remain records, not unique feature requests. There were 311 final-answer records; these are historical reports, not newly rerun evidence.

Automated Guardian reviews were classified separately from human feature requests. Topic chats included a few adjacent support/distribution discussions; they inform boundaries rather than adding mandatory development stages. This is coverage of the locally indexed project history, not a claim to include deleted conversations or every other assistant application's history. Raw transcripts, credentials, account identifiers, and private artifacts are not bundled in the skill.

The reusable lifecycle is:

**Intent and scope → source/impact discovery → representative design or implementation plan when needed → shared-source implementation → local qualification → authorized integration/release → evidence and follow-up.**

This is a synthesis, not a requirement to create a large design document for every edit. Existing repository rules supply mandatory gates; the repeated prompts add the acceptance questions those gates alone do not answer.

## Repeated patterns and their implications

| Observed request pattern | Implication for a new feature |
| --- | --- |
| “show me screenshots first,” “proposal first,” “preview only” followed later by implementation approval | Record the requested mode; explore uncertain visual direction on representative pages before site-wide implementation. Approval already given should not be asked again. |
| “classic … only,” “normal mode is all good,” followed by a complaint when another audience's theme changed | Separate the intended change surface from regression surfaces. A shared theme edit needs explicit audience/view checks. |
| “refer to the latest … respective projects,” “verify … recent updates” | Validate upstream facts and their provenance before writing capability claims. Site-local prose and historical reports are insufficient authority for current facts. |
| “no duplicate information,” “workflows elaborated,” “boundaries … concise” | Maintain detailed actionable workflows once, project concise summaries, and link canonical guides. Do not repeat setup or audit prose across every service surface. |
| Requests for Python, Java, gcloud, exports, meaningful examples and clear purpose | Define example prerequisites, local routing, action, expected result, and cleanup; do not confuse discovery with an asserted write/read workflow. |
| “only content” should change on navigation, “not … re-rendering the pages,” “startup and navigation speed” | Qualify in-place navigation and shell lifecycle, not only a cold-load score. Include remounts and Back/Forward. |
| “test … real browser,” repeated copy-button, contrast, icon-size and mobile layout corrections | Build success and screenshots alone do not establish usability. Check actual interactions and responsive geometry on representative pages. |
| “why the test didn't catch it?” after a false localhost readiness result | Model browser permission states realistically; mocks and pre-granted permissions can conceal the actual failing path. |
| “evaluate which ones are … valid,” keep analytics and avoid restricting functionality | Treat external audit suggestions as hypotheses. Attribute real costs/defects and preserve useful behavior instead of optimizing solely for a score. |
| “commit … merge,” later “push … deploy … live testing,” and deployment being explicitly held or withdrawn | Record each delivery boundary. Push-to-main can itself deploy. Refresh authorization when scope changes; historical release requests are not ongoing permission. |
| “verify … measurements … correct page,” production monitoring and retained-asset checks | Match evidence to the claim: test results, built bytes, CI, deployed version, live behavior and analytics records are separate outcomes. |

## Representative trace anchors

These are local chat IDs for locating the underlying prompts. Excerpts are short signals, not new instructions or claims about present production state.

| Chat ID | Reusable signal |
| --- | --- |
| `01a03ef5-72ba-7473-9b43-9caebea39c05` | Review documentation accuracy against the relevant projects and write for end users. |
| `01a1145d-1f7a-7f50-9aae-ae81303cb7d2` | Preview desktop design, preserve Classic, plan before implementation, verify performance/SEO parity and mobile. |
| `01a119c8-c269-79c3-b3b1-88d9abe46785` | Preview mobile direction, then implement and improve content-only navigation. |
| `01a11ca0-1b33-7d63-ae28-297d46e81a35` | Localhost readiness still failed despite tests; browser tests had bypassed the permission failure. |
| `01a126de-f630-7cf2-9336-fe070115afe3` | Validate performance/contrast findings; hold deployment despite push request, later authorize release. |
| `01a12bfe-2f73-7c93-a839-a48c255953a6` | Inspect reported dead clicks and verify web-vitals page attribution after the fix. |
| `01a13e0f-a4b5-7df1-bc2b-e2fe65382c94` | Limit changes to agent mode, preserve fast navigation, verify deployed version/assets; report unavailable PageSpeed evidence. |
| `01a1456e-03a2-7f53-86d4-b02ea4e3ae52` | Service-specific examples, client exports, representative theme previews, shared code panels, real review and live testing. |
| `01a146a0-05a1-7891-9f7d-6ff8302db52d` | Remove repetition, refresh upstream workflows, then stop at local main when scope is narrowed. |
| `01a14756-cfb9-74d0-a60f-2184fbb30643` | Local-only Agentation must actually work and be excluded from production. |
| `01a14ba9-2a1e-7052-b1c6-fb410c1e0b28` | Preview-only visual exploration must not modify the site. |
| `01a15176-ca21-7610-ad3f-0b000ca829b3` | Fix valid accessibility findings while protecting analytics and functionality. |

## Superseded details and authority

Do not freeze old service counts, Node/pnpm versions, GitHub Pages delivery, previous agent widgets, proposed prices, or benchmark scores into the workflow. Pricing chats changed direction and later explored a private concept; they do not establish a current public offer. Earlier service-label requests differ from the current two-category marketing policy. Current `AGENTS.md`, `BUILD.md`, package/deployment configuration, verified upstream evidence, and the user's current task govern execution.

The skill intentionally links existing build, marketing, and deployment instructions rather than creating another complete copy of those manuals. It adds a reusable brief, lifecycle decisions, and regression matrix that tie them together.
