# ADR-004: Use a compact two-step homepage quick start

**Status:** Explicitly accepted; current source implements the two-step structure. Browser behavior was not executed.

## Context and alternatives

The user first asked to reduce the visual weight of the installation command area and selected an inline command-row direction. They then asked to combine the second and third workflow steps. A three-step homepage was the previous alternative. [E-007 user m0,70,226; REQ-003]

## Decision

Show installation first, followed by a shared copy payload containing `localcloud start` and `localcloud console` on separate lines. Remove doctor/env from the homepage's abbreviated flow while retaining fuller setup guidance in documentation. The agent proposed that exception and the user approved it. [E-007 agent m243 and user m244; `src/components/InstallationMethods.astro:7,22–76`]

## Rationale and consequences

Reduce homepage visual weight and get the evaluator to the local console quickly. This shortcut does not replace endpoint discovery or diagnostics for SDK setup. Users must still be told that occupied ports are remapped. The current paragraph provides that warning, but the CLI-doc checker fails because it requires the exact word `dynamic`. [REQ-004, GAP-002; `src/components/InstallationMethods.astro:60`; `scripts/verify-cli-docs.mjs:183–186`]

Copy payload and DOM structure were inspected; clipboard, responsive layout and tab interaction remain source observations. See [flows](../flows-and-contracts.md) and [acceptance](../testing-and-acceptance.md).
