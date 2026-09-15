# ADR-001: Separate technical evidence from editorial presentation

**Status:** Existing documented design, implemented in the reviewed source. The durability rationale below is reconstructed from the design and data flow, not a newly discovered verbatim user directive.

## Context

The website repeats endpoints, service availability, operation boundaries and runtime/CLI guidance across human pages, agent pages and distributed text. Independent copies are vulnerable to drift. The remediation design specifies a contract and evidence model. [PRIN-001; `docs/superpowers/specs/2026-08-13-localcloud-documentation-remediation-design.md:109–180`]

## Decision

Store schema-v3 technical facts and provenance in the snapshot; load them through typed contract helpers; join editorial descriptions/slugs through explicit service IDs. Missing required mappings throw. Publication, availability, operation evidence and assembled defaults remain separate fields. [OBS-002; `src/data/docs-contract.ts:3–75,205–226`; `src/data/serviceEditorial.ts:49–54`; `src/data/services.ts:98–151`]

## Alternatives and rationale

Independently maintained page facts are the baseline this design remedies. Treating every source-supported operation as release-qualified would erase the contract's explicit evidence distinction. These alternatives are reconstructed from the documented problem and schema, not a claim that a formal option vote occurred. Keeping editorial text separate permits a clear service catalog while preserving detailed limits. [PRIN-001, PRIN-002, REQ-010]

## Consequences and current evidence

Source validation passed for 27 runtime surfaces and related route mappings. Synchronization is still a separate obligation: the upstream revision check failed in this run, and the snapshot has no assembled-image digest. A valid schema proves structure, not freshness or runtime behavior. Generators and synchronization commands modify repository files and were not run. [GAP-001, GAP-009; `scripts/verify-upstream-docs.mjs:50–69`; `scripts/sync-upstream-docs.mjs:198`]

See [contracts](../flows-and-contracts.md) and [test results](../testing-and-acceptance.md).
