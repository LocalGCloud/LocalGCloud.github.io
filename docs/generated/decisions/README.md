# Decision records

These records reconstruct material decisions from existing evidence. They are not new approvals. “Accepted” describes the recovered intent; implementation and verification are stated separately. Historical coverage remains partial, so unresolved conflicts remain in the [gap register](../gaps-and-open-questions.md).

| Record | Decision and status | Evidence |
| --- | --- | --- |
| [ADR-001](ADR-001-contract-and-editorial-separation.md) | Versioned technical contract with a separate editorial layer; documented design implemented in source | PRIN-001, PRIN-002, OBS-002 |
| [ADR-002](ADR-002-free-public-preview.md) | One free public-preview offer; explicitly accepted, replacing the two-tier proposal | REQ-006–008; E-003 m411–436 |
| [ADR-003](ADR-003-runtime-owned-mcp.md) | Runtime owns MCP; site package removal explicitly accepted | REQ-009; E-013 m42,68,71 |
| [ADR-004](ADR-004-two-step-quick-start.md) | Two homepage steps with start/console in one copy payload; explicitly accepted | REQ-003; E-007 m226,243–244 |
| [ADR-005](ADR-005-separate-installer-verification.md) | Separate installer fixture test from build; explicitly accepted | REQ-005; E-014 m668,679–680 |

The present static Astro/GitHub Pages architecture is documented in [architecture](../architecture.md) as a code observation. No reviewed evidence establishes an explicit decision comparing Astro against every alternative; an invented framework-selection ADR would obscure that limit. E-077's older VitePress guidance is historical agent advice, not the current architecture.
