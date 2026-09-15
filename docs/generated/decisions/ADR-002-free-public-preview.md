# ADR-002: Offer one free public preview

**Status:** Explicitly accepted product direction; public pricing/reference content reflects it. Artifact-license consistency is unresolved.

## Context and alternatives

The earlier request split individual/student/nonprofit and commercial audiences, with a contact action instead of a public commercial price. The same session later explicitly replaced that split with a free public preview. This is evidence of supersession, not merely a newer timestamp. [REQ-007; E-003 user m4,23,411]

## Decision

Use one preview offer covering individuals and organizations, including companies' ongoing internal development and CI. Do not show a numeric price, end date, commercial tier, contact CTA or future-pricing note on the pricing page. Retain the no-payment-method/no-license-key message. Preserve LocalCloud Inc. as holder and the granted terms for releases obtained during the preview. [REQ-006, REQ-008; E-003 user m423,425,427,429,432,436]

## Rationale and consequences

The user's stated context was a platform still in development. The page should communicate the presently offered preview without speculative pricing. This does not establish unrestricted production or redistribution rights: the public reference directs readers to the runtime license. [E-003 m411; `src/pages/docs/licensing.mdx:15–45`]

The current pricing component implements one offer; the policy check passes for its selected surfaces. The root site LICENSE still contains individual-only/company restrictions. Its artifact scope must be resolved before claiming consistent licensing across the repositories. This record describes intent and conflicting text, not a legal determination. [GAP-003; `src/components/PricingWorkbench.astro:31–85`; `LICENSE:23–59,76–93`; `scripts/verify-policy-docs.mjs:19`]

See [product specification](../product-specification.md) and [open questions](../gaps-and-open-questions.md).
