import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { renderMarkdownTwin, outsideCode } from "../src/utils/render-markdown-twin.mjs";
import { markdownTwinPath } from "../src/utils/markdown-twins.mjs";

// Writes a Markdown twin of every content page's <main>. The technical docs/services/
// comparisons remain the bounded reading corpus in llms-full.txt.

const dist = new URL("../dist/", import.meta.url);
// llms-full.txt is read whole by LLM tools, so publishing stops above this hard limit
// (about 100k tokens). It measured 218 KB on 2026-10-05; the tighter regression budget
// lives in scripts/verify-page-budgets.test.mjs.
const LLMS_FULL_MAX_BYTES = 400_000;
// Reading order for llms-full.txt; pages not listed follow alphabetically.
const docsOrder = ["index", "configuration", "sdk-examples", "terraform", "seed-data", "architecture", "console", "services-overview", "faq", "licensing", "privacy"];

const fail = (message) => {
	throw new Error(`Markdown twins: ${message}`);
};
async function twinFor(page) {
	return renderMarkdownTwin(await readFile(new URL(page.file, dist), "utf8"), page);
}

const pages = (await readdir(dist, { recursive: true }))
	.filter((file) => file === "index.html" || file.endsWith("/index.html"))
	.map((file) => ({ file, route: `/${file.slice(0, -"index.html".length)}` }))
	.map((page) => ({ ...page, twin: markdownTwinPath(page.route) }));
for (const page of pages.filter((candidate) => !candidate.twin)) {
	const html = await readFile(new URL(page.file, dist), "utf8");
	if (/<link\b[^>]*type="text\/markdown"/.test(html)) fail(`${page.file} declares a Markdown twin that is never generated`);
}
const twinPages = pages.filter((page) => page.twin);
if (!twinPages.some((page) => page.route === "/docs/") || !twinPages.some((page) => page.route.startsWith("/services/"))) {
	fail("expected docs and service pages in dist/");
}

// Docs first, then service guides, then comparisons; each section opens with its index page.
const sectionOrder = ["docs", "services", "compare"];
const rank = (page) => {
	const [, section, slug] = page.twin.match(/^\/(docs|services|compare)\/(.+)\.md$/);
	const docsRank = docsOrder.indexOf(slug);
	return [sectionOrder.indexOf(section), section === "docs" && docsRank !== -1 ? docsRank : slug === "index" ? -1 : docsOrder.length, slug];
};
const compare = (left, right) => {
	const [a, b] = [rank(left), rank(right)];
	return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
};

const twins = [];
// Detailed inventories have their own twins and complete JSON downloads. Keep their
// discovery hub in the bounded corpus rather than duplicating thousands of rows here.
const technical = twinPages.filter((page) => /^\/(docs|services|compare)\//.test(page.route)
  && !/^\/compare\/emulators\/[^/]+\/$/.test(page.route));
for (const page of twinPages) {
	const markdown = await twinFor(page);
	await mkdir(new URL('.', new URL(page.twin.slice(1), dist)), { recursive: true });
	await writeFile(new URL(page.twin.slice(1), dist), markdown);
}
for (const page of technical.sort(compare)) twins.push(await readFile(new URL(page.twin.slice(1), dist), 'utf8'));

// One heading level down, so each page is a "##" section under the llms.txt title.
const demote = (markdown) => outsideCode(markdown, (text) => text.replace(/^(#{1,5}) /gm, "#$1 "));
const llms = await readFile(new URL("llms.txt", dist), "utf8");
const full = `${llms.trimEnd()}

---

The sections below are the Markdown versions of docs, service guides and comparison overviews on https://local.cloud/, in reading order. Each section names its source page. Detailed emulator inventories are linked from https://local.cloud/compare/emulators/ and have separate Markdown previews and complete JSON downloads.

---

${twins.map(demote).join("\n---\n\n")}`;
const bytes = Buffer.byteLength(full);
if (bytes > LLMS_FULL_MAX_BYTES) fail(`llms-full.txt is ${bytes} bytes, over the ${LLMS_FULL_MAX_BYTES}-byte ceiling`);
await writeFile(new URL("llms-full.txt", dist), full);
console.log(`Wrote ${twinPages.length} content Markdown twins; llms-full.txt retains ${twins.length} technical pages (${bytes} bytes).`);
