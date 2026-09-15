# Development and operations

## Baseline and prerequisites

The manifest requires **Node ≥22.12.0**, pins Volta to 22.12.0 and declares **pnpm 10.28.0**. This run used installed Node **22.22.2** for checks. The manifest declares Astro `^6.1.8`, MDX `^5.0.3`, Tailwind `^4.2.2`, sitemap `^3.7.2`, Pagefind `^1.5.2` and YAML `^2.9.0`. These are declared ranges, not claims about resolved installed versions. [OBS-001; `package.json:6–33`; CHECK-node-version]

No dependency installation occurred. A normal maintainer workflow, **documented but not executed here**, is:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm test:installer
pnpm preview
```

`dev` starts Astro; `preview` serves built output. Search depends on the generated Pagefind index, so source dev mode alone may show the missing-index message. These commands do not start the real LocalCloud emulator as part of the site implementation. The installer fixture command simulates CLI behavior. [OBS-004, OBS-006; `package.json:13–17`, `src/components/SearchModal.astro:123–127`]

## Build order and side effects

The normal `pnpm build` is a pipeline, not just `astro build`:

1. Regenerate public LLM files.
2. Verify documentation contract, upstream provenance, CLI docs, examples, policy and distributed content.
3. Build Astro output.
4. Verify rendered documentation tables.
5. Copy sitemap index to the sitemap alias.
6. Verify static SEO and product facts.
7. Build the Pagefind index in `dist`.

`public/llms.txt` and `public/llms-full.txt` are tracked generator outputs. The full build was not run in this task because all new output had to stay in the private run directory and the site must remain untouched. Existing `dist` was not treated as fresh build evidence; the installer harness only checked installer source/rendered equality before running its fixtures. [OBS-009, GAP-008; `package.json:15`, `scripts/generate-distributed-docs.mjs:117–125`]

`pnpm test:installer` is deliberately separate, and the CI workflow runs it after build. The harness uses a temporary home, mock binaries and a loopback fixture server; it tests prompt handling without starting real Docker resources. This run placed all temporary fixture output beneath its private evidence directory, and the harness removed that temporary root. [REQ-005, OBS-006; `scripts/verify-installer.mjs:45–47,190–257,603–605`]

## Updating technical documentation

The technical input is `src/data/docs-contract.snapshot.json`; `src/data/serviceEditorial.ts` holds presentation metadata. `scripts/sync-upstream-docs.mjs` reads sibling runtime and CLI sources and **writes** the snapshot. It is not a read-only audit command. Do not run it just to silence a failed gate; review mappings, revision provenance, generated endpoint values, evidence states and resulting diff first. This is a recommendation derived from its write behavior and the current drift, not a sync operation executed here. [PRIN-001, GAP-001; `scripts/sync-upstream-docs.mjs:129–198`]

For a read-only check use the individual verifiers listed in [testing and acceptance](testing-and-acceptance.md). `verify-upstream-docs.mjs` requires sibling runtime/CLI repositories to exercise its checks. When runtime defaults are absent, it reports a skip and exits zero. A site-only CI checkout therefore cannot be assumed to validate sibling HEAD/digest parity. [OBS-007; `scripts/verify-upstream-docs.mjs:22–24,50–69`]

Public MDX belongs under `src/pages/docs`. Root `docs/` includes specifications and launch operations; it is not an automatic publication queue. Agent skill instructions and assets are distributed separately under `agent-skills/`. [REQ-014, OBS-003]

## Configuration names

No `.env`, credentials or private production configuration was read. Names below come from safe source references.

| Names | Ownership and use |
| --- | --- |
| `BASE_URL` | Astro-provided base used by layout and route link construction; not evidence of a custom dotenv requirement. |
| `SEO_VERIFY_BASE_URL`, `SEO_VERIFY_ATTEMPTS`, `SEO_VERIFY_DELAY_MS` | Optional live SEO checker. Without base URL it skips; configured URLs cause network requests. Not run here. |
| `LOCALCLOUD_INSTALL_DIR`, `LOCALCLOUD_RELEASE_BASE_URL` | Installer destination and release-root overrides; mirror/test support. |
| `LOCALCLOUD_TEST_LOG`, `LOCALCLOUD_TEST_STATE`, `LOCALCLOUD_TEST_MARKER_CONFLICT`, `MOCK_UNAME_M`, `MOCK_UNAME_S` | Installer fixture-only controls, not product deployment configuration. |
| `TMPDIR`, `SHELL`, `PATH`, `HOME` | Standard installer/harness environment; the harness supplies an isolated test environment. |
| `LOCALCLOUD_TERRAFORM_MODE`, `LOCALCLOUD_SEED_FILE`, `LOCALCLOUD_TELEMETRY`, `LOCALCLOUD_API_KEY`, `LOCALCLOUD_EVENT_API_KEY` | Names appearing in target-runtime guidance; they are not site-server secrets or a site environment contract. Values intentionally omitted. |

Sources: `src/layouts/BaseLayout.astro:14`; `scripts/verify-live-seo.mjs:3–5`; `public/install.sh:46–47`; `scripts/verify-installer.mjs:63–80,245–256`; `src/data/docs-contract.snapshot.json:170,273,396`; policy/example verifiers. [OBS-005, OBS-006]

## CI and release ownership

The configured trigger is a push to `main` or manual dispatch. CI sets up pnpm and Node 22, installs with the frozen lockfile, runs build and installer tests, uploads `dist`, then deploys GitHub Pages. Pages concurrency does not cancel an in-progress run. A conditional post-deploy job runs the live SEO checker when its repository variable is configured. Nothing here establishes the current remote deployment state. [OBS-007; `.github/workflows/deploy.yml:3–67`]

The historical user explicitly retained release responsibility during the latest SEO work. This reconstruction did not push, dispatch, deploy or publish. [REQ-013; E-002 m54]

## Troubleshooting from observed evidence

| Symptom | Evidence-led interpretation | Next maintainer action, not executed here |
| --- | --- | --- |
| `snapshot is not synced to the runtime HEAD` | Current upstream gate stops at revision comparison before later digest/catalog checks. | Review the current sibling contract changes and sync implementation, then explicitly regenerate/revalidate as a separate editing task. |
| `homepage does not warn about dynamic ports` | Homepage already says occupied ports are remapped; checker requires literal `dynamic`. | Align wording and assertion without weakening the required warning. |
| Search index unavailable | Pagefind dynamic import/init returns null; build generates the index. | Check the built `pagefind` assets and base URL. |
| Installer tests show a doctor/start prompt | Harness intentionally simulates a TTY and supplies responses. | Run the dedicated installer command; inspect timeout/fixture output if it actually stalls. |
| Policy checks pass but licensing prose disagrees | Policy verifier reads selected public files, not root LICENSE. | Resolve ownership/scope of the root license and public preview terms before asserting consistency. |

[GAP-001–003; OBS-004, OBS-006]
