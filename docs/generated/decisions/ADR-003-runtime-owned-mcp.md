# ADR-003: Keep MCP implementation in the runtime repository

**Status:** Explicitly accepted; site documentation cleanup is evidenced by current source and passing distributed-reference verification.

## Context and alternatives

The earlier agentic-platform work assigned a separate site-owned stdio MCP component with tool and distribution metadata. That assignment is historical agent delegation, not proof that each tool was implemented or exercised. The user later stated that the package had been removed and that the runtime project's MCP would continue to be used. [E-034 delegated assignment m0; REQ-009; E-013 user m42]

## Decision

Remove the deleted site package's references within this repository and direct users to runtime-owned MCP. The user explicitly scoped the cleanup to the site and approved it. The site remains responsible for explanatory/agent-readable documentation, not a second operational MCP server. [E-013 user m68,71; `scripts/verify-distributed-docs.mjs:25–69`]

## Rationale and consequences

The explicit reason is the package's removal and continued runtime implementation. Avoiding duplicate ownership is a reasonable architectural consequence, not an independently quoted reason. Any MCP endpoint/tool behavior must be verified against the runtime's sources and appropriate runtime evidence. Passing the site's distributed-document scan establishes reference consistency only. [REQ-009, OBS-001; `src/data/agenticMarkdown.ts:68–80`]

No MCP connection or external API request was made in this reconstruction. See [architecture](../architecture.md).
