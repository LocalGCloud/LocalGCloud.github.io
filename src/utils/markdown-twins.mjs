// Pages that publish a Markdown twin: /docs/, /services/ and /compare/ and their direct child pages.
// BaseLayout, scripts/generate-markdown-twins.mjs and the Worker all read this module,
// so the <link rel="alternate">, the built .md files and content negotiation agree.

const TWIN_PAGE = /^\/(docs|services|compare)\/(?:([a-z0-9]+(?:-[a-z0-9]+)*)\/)?$/;
const TWIN_FILE = /^\/(docs|services|compare)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

/** `/docs/configuration/` -> `/docs/configuration.md`; `/docs/` -> `/docs/index.md`; otherwise null. */
export function markdownTwinPath(pathname) {
	const match = TWIN_PAGE.exec(pathname);
	return match ? `/${match[1]}/${match[2] ?? "index"}.md` : null;
}

/** The inverse: `/docs/configuration.md` -> `/docs/configuration/`; otherwise null. */
export function twinSourcePath(pathname) {
	const match = TWIN_FILE.exec(pathname);
	if (!match) return null;
	return match[2] === "index" ? `/${match[1]}/` : `/${match[1]}/${match[2]}/`;
}
