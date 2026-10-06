# LocalCloud Site Build & Verification Guide

This guide documents the build process, automated verification pipeline, and content compliance checks for `localcloud-site`.

---

## 1. Quick Reference

```bash
# Install the locked dependencies
pnpm install --frozen-lockfile

# Check all dependencies for security advisories
pnpm run test:dependencies

# Run local development server
pnpm run dev

# Run full build with all 13 verification stages
pnpm run build

# Run installer verification test suite
pnpm run test:installer

# Rebuild graft context graph (after structural changes)
graft build
```

---

## 2. Environment Prerequisites

- **Node.js:** `24.21.0` (current LTS; pinned by Volta and CI)
- **Package Manager:** `pnpm@12.9.1` (pinned in `package.json` and CI)
- **Frameworks:** Astro 7, MDX 8, Vite 8, Tailwind CSS v4, Pagefind 1.5.2
- **Install configuration:** `pnpm-workspace.yaml` declares the npm registry, hardlink imports, and the esbuild/Sharp/workerd build-script allowlist.

---

## 3. Site Content & Marketing Presentation Principles

All content on `local.cloud` must strictly adhere to product marketing principles, transforming upstream QA audit matrices into developer-first capability presentations:

1. **Two Categories Only (`Supported` vs. `Unsupported`):**
   - Every service is either **Supported** or **Unsupported**.
   - **Never tag or badge any service as "Partial".** It is understood that local emulators operate within bounded local semantics for testing and CI.
2. **Default Assumption of Support:**
   - Services in catalogs, navigation, and overview tables are assumed supported by default without visual clutter.
   - Only explicitly unsupported services (e.g. Vertex AI, Compute Engine) receive callout badges ("Unsupported" / "Cloud-only").
3. **Operational Configuration ≠ Support Status:**
   - **Firestore** is fully supported (disabled by default to conserve workstation memory; enabled on demand via `--services firestore` or in `localcloud.yaml`).
   - **Dataproc** is supported (runs clusters and serverless batch jobs via local Docker container runtimes).
4. **Positive Capability Framing:**
   - Focus on what developers and CI suites can achieve locally rather than internal audit limitations.

For architectural design details, see [docs/site-marketing-principles.md](file:///Users/jsenjaliya/src/AI/localcloud-site/docs/site-marketing-principles.md).

---

## 4. The 13-Stage Build & Verification Pipeline

When running `pnpm run build`, the pipeline executes the following checks in sequence. Any failure halts the build with exit code 1:

| Stage | Script / Command | Purpose & Guarantees |
|-------|------------------|----------------------|
| **1** | `node scripts/generate-distributed-docs.mjs` | Generates `public/llms.txt` and `public/llms-full.txt` from contract snapshots and editorial data, applying the two-category supported model. |
| **2** | `node scripts/verify-docs-contract.mjs` | Validates that the local contract snapshot (`src/data/docs-contract.snapshot.json`) adheres to schema boundaries, service counts (27), and required properties. |
| **3** | `node scripts/verify-upstream-docs.mjs` | Verifies SHA256 integrity hashes of upstream `documentation.yaml` against the contract snapshot to prevent silent drift. |
| **4** | `node scripts/verify-cli-docs.mjs` | Ensures CLI flags, memory defaults, commands, and port bindings in docs match the product specification. |
| **5** | `node scripts/verify-doc-examples.mjs` | Validates that all code snippets and examples across docs are syntactically valid and refer to valid local endpoints. |
| **6** | `node scripts/verify-policy-docs.mjs` | Verifies privacy policies, license terms, free preview pricing statements, and navigation order. |
| **7** | `node scripts/verify-distributed-docs.mjs` | Verifies `public/llms.txt` and `public/llms-full.txt` for required public facts, pricing URLs, absence of retired MCP packages, and accurate service counts. |
| **8** | `astro build` | Compiles static pages, markdown routes, and sitemaps into `dist/`. |
| **9** | `node scripts/verify-rendered-docs.mjs` | Inspects compiled HTML output (e.g. comparison tables and accessible scroll wrappers) to ensure proper rendering. |
| **10** | `node scripts/write-sitemap-alias.mjs` | Copies `sitemap-index.xml` to `sitemap.xml` for legacy crawler compatibility. |
| **11** | `node scripts/verify-static-seo.mjs` | Verifies canonical URLs, meta descriptions, single H1 tags, robots.txt directives, JSON-LD structured data, and sitemap inclusion across 34 priority routes. |
| **12** | `node scripts/verify-content-facts.mjs` | **Content & Marketing Principles Verification:**<br>• Confirms every service has `marketingStatus: "supported"` or `"unsupported"`.<br>• Asserts Firestore is supported and disabled by default.<br>• Asserts Dataproc is supported.<br>• Asserts no page contains `"partial local emulation"` or badging as `"partial"`.<br>• Verifies all local internal links and fragment anchors across all 128 published pages. |
| **13** | `pagefind --site dist` → `node scripts/bundle-pagefind.mjs` → `node scripts/finalize-static-csp.mjs` | Indexes published pages, bundles a lazy integrity-protected search client, then finalizes each page's CSP from its exact emitted script bytes. |

---

## 5. Separate Verification Suites

### Dependency Security
```bash
pnpm run test:dependencies
```
Audits production, development, and optional dependencies. Any advisory fails the check; no advisories are suppressed. The Cloudflare deployment workflow and local deployment command run it before building or publishing.

### Installer Verification
```bash
pnpm run test:installer
```
Executes `scripts/verify-installer.mjs` which validates:
- Terminal aliases and command collisions.
- Repair workflows and clean uninstallation.
- SHA256 binary pinning and platform rejection (unsupported OS/architecture).
- Interactive prompts and configuration preservation.

### Upstream Contract Synchronization
```bash
node scripts/sync-upstream-docs.mjs
node scripts/verify-upstream-docs.mjs
```
Synchronizes `documentation.yaml` from `../localcloud` into `src/data/docs-contract.snapshot.json` and updates cryptographic hashes.

### Context Graph Rebuild
```bash
graft build
```
Refreshes the `graft/` knowledge graph across all repository symbols, routes, and markdown files.

---

## 6. Pre-Commit / Pre-PR Verification Checklist

Before opening a pull request or concluding an editing session, verify that:

- [ ] `pnpm run test:dependencies` exits with code 0.
- [ ] `pnpm run build` exits with code 0.
- [ ] `pnpm run test:installer` exits with code 0.
- [ ] No service is tagged or badged as "partial".
- [ ] Firestore is documented as supported (disabled by default).
- [ ] Dataproc is documented as supported.
- [ ] All internal links and anchor hashes are valid (verified automatically by Stage 12).
- [ ] `graft build` has been executed if file structure or symbol signatures changed.
