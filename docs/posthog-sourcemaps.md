# PostHog source maps for local.cloud

Research checked 2026-10-06. Selected path: standard publicly hosted browser JS/maps, using the existing Vite/esbuild pipeline. This guidance does not confirm deployed symbolication or repair historical errors.

## Native public-map support

PostHog's official stack-trace documentation says public source maps can be fetched directly; build-time uploads are needed when the maps are not public. The frame source must point to the minified JS and its source-map reference. [Official stack-trace documentation](https://posthog.com/docs/error-tracking/stack-traces), [documentation source](https://github.com/PostHog/posthog.com/blob/master/contents/docs/error-tracking/stack-traces.mdx).

The backend confirms that a browser frame with an HTTP(S) filename and **no chunk ID** resolves through its URL. `RawJSFrame::get_ref` accepts `(Some(url), None)`; `SourcemapProvider` fetches the JS and follows either a `SourceMap`/`X-SourceMap` response header or the standard `//# sourceMappingURL=` comment. Relative references resolve against the final JS response URL. No CLI, injected metadata or personal API key is required for this route. [Frame matching](https://github.com/PostHog/posthog/blob/master/rust/cymbal/src/core/types/langs/js.rs#L118), [public retrieval](https://github.com/PostHog/posthog/blob/master/rust/cymbal/src/core/symbolication/symbol_store/sourcemap.rs#L383), [reference discovery](https://github.com/PostHog/posthog/blob/master/rust/cymbal/src/core/symbolication/symbol_store/sourcemap.rs#L546).

The repository was verified public by the implementation audit. Public maps for its already-public first-party browser code are the smallest applicable solution; hidden-map/private-upload rules are not requirements here. A separate PostHog release object and repository commit links require their own upload/integration setup. The build SHA can still be attached to ordinary event properties and deployment metadata.

## Build contract

Configure Vite to emit normal linked source maps (`build.sourcemap: true`) and keep generated browser JS external (`assetsInlineLimit: 0`, with rendered-output verification). Keep Pagefind's existing esbuild bundle and generate its external map during bundling. [Vite build settings](https://vite.dev/config/build-options.html#build-sourcemap), [esbuild source maps](https://esbuild.github.io/api/#sourcemap).

For each vetted classic inline script, the existing esbuild transform can return minified JS plus a map:

```js
const result = await transform(source, {
  loader: 'js', target: 'es2022', minify: true, treeShaking: false,
  sourcefile: sourceName, sourcemap: 'external', sourcesContent: true,
});
```

Write the JS and map as siblings. The transform API returns an external map without automatically linking its filename, so append a standard comment on its own line before calculating SRI/CSP:

```js
//# sourceMappingURL=inline.FINGERPRINT.js.map
```

Include the JS and map payload in the fingerprint so changed mappings cannot reuse a cached map URL. Compute integrity from the final script bytes including that comment. Keep map files in the deployment assets and carry the corresponding prior JS/maps for delayed errors or old open tabs. [esbuild map/source-content options](https://esbuild.github.io/api/#sourcemap), [PostHog comment parser](https://github.com/PostHog/posthog/blob/master/rust/cymbal/src/core/symbolication/symbol_store/sourcemap.rs#L603).

Order: Astro/Vite build → Pagefind bundling/maps → vetted inline extraction/maps → final CSP/SRI → compression → asset manifest. No script rewrite may follow the final hashes. JS and map URLs must return successful public HTTP responses with matching JS/valid map content, not authentication challenges or HTML fallback pages. `sourcesContent` supplies readable code context; maps from rendered blocks show rendered JS rather than recovering original Astro/TypeScript unless earlier maps are chained. Public source retrieval is server-side and needs no weaker page CSP.

## Semantics and coverage

The current site has no retained executable inline blocks after finalization; JSON-LD and speculation rules remain inline. Extract vetted classic blocks individually, preserving their original positions, synchronous execution and classic/module types. If a future prepaint block must stay inline, retain it explicitly and report the mapping boundary. Combining independent blocks can change global lexical declarations, strict-mode directives and behavior after an exception. Externalizing modules can change relative-import resolution. [Browser script semantics](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script).

This maps the externalized first-party scripts and normal Vite/Pagefind assets. Retained inline blocks remain outside mapped coverage and must be counted explicitly, including rendered inline modules. Previously reported page-URL frames for `https://local.cloud/` and `/services/firestore/` are not retroactively repaired by creating new asset maps. Analytics-only externalization would leave other retained UI/search/feedback blocks outside coverage.

## Qualification

The ordinary browser does not need to download external maps to execute the site; the runtime overhead is linked-comment bytes and any extra JS asset requests from extraction. Keep the existing 17 KB largest-script budget and test cold-cache navigation, theme, search, feedback, copy actions, initialization ordering and CSP/SRI.

Local verification must confirm every mapped JS has a resolvable comment, each map has valid mappings and embedded source content, script hashes match final bytes, and retained inline blocks are reported. Production verification must fetch JS/map URLs publicly, then inspect **a new controlled exception from that deployed build** in PostHog for the expected source file/line/context and fetched symbol-set status. Source and HTTP checks alone establish readiness for retrieval; they do not establish successful PostHog symbolication.

## If private uploads become necessary

The previously verified upload path remains available: `@posthog/cli@0.18.9` or `@posthog/rollup-plugin@1.6.1`, with a personal key granting `error_tracking:write` (the CLI authentication guide additionally requests `organization:read`). CLI injection must precede final filename/SRI/CSP hashing; `--delete-after` rewrites JS, so cleanup must also precede hashes. The native plugin requires credentials while enabled, and dry-run does not generate CLI chunk IDs. This path is unnecessary for the selected public maps. [CLI](https://posthog.com/docs/cli), [private upload workflow](https://posthog.com/docs/error-tracking/upload-source-maps/cli).
