# LocalCloud Site Assistant Directives

Refer to [AGENTS.md](file:///Users/jsenjaliya/src/AI/localcloud-site/AGENTS.md) and [BUILD.md](file:///Users/jsenjaliya/src/AI/localcloud-site/BUILD.md) for complete instructions.

## Key Principles
1. **Two Categories Only:** A service is either **Supported** or **Unsupported**. Never use "partial" or display "Partial local emulation".
2. **Default Assumption of Support:** Services in catalogs and lists are assumed supported by default. Do not clutter with redundant "Supported" badges.
3. **Operational Configuration ≠ Support:**
   - **Firestore** is supported (disabled by default; opt-in with `--services firestore`).
   - **Dataproc** is supported (runs clusters and serverless batch jobs via Docker).
4. **Positive Capability Framing:** Frame features around what developers and CI suites can achieve locally.

## Mandatory Verification Commands
```bash
pnpm run build          # Runs all 13 verification checks, Astro build, and Pagefind
pnpm run test:installer # Runs installer test suite
graft build             # Refreshes context graph
```
