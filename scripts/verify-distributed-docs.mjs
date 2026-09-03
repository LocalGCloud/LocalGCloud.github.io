import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const assert = (condition, message) => {
	if (!condition)
		throw new Error(`Distributed documentation verification: ${message}`);
};

const roots = ["src", "public", "agent-skills"];
const { execFileSync } = await import("node:child_process");
const files = execFileSync("find", [...roots, "-type", "f"], {
	cwd: new URL("..", import.meta.url),
	encoding: "utf8",
})
	.trim()
	.split("\n")
	.filter(Boolean)
	.filter(
		(path) =>
			!path.includes("/node_modules/") &&
			!path.includes("/dist/") &&
			!path.startsWith("public/pagefind/"),
	);
const entries = await Promise.all(
	files.map(async (path) => [path, await read(path)]),
);
const source = entries
	.filter(([path]) => path !== "src/data/docs-contract.snapshot.json")
	.map(([path, content]) => `\n@@ ${path}\n${content}`)
	.join("\n");

const referenceRoots = [
	...roots,
	"docs",
	"openspec",
	"reports",
	"scripts",
	"package.json",
	"pnpm-lock.yaml",
];
const referenceFiles = execFileSync("find", [...referenceRoots, "-type", "f"], {
	cwd: new URL("..", import.meta.url),
	encoding: "utf8",
})
	.trim()
	.split("\n")
	.filter(Boolean)
	.filter(
		(path) =>
			!path.includes("/node_modules/") &&
			!path.includes("/dist/") &&
			!path.startsWith("public/pagefind/") &&
			path !== "scripts/verify-distributed-docs.mjs",
	);
const referenceEntries = await Promise.all(
	referenceFiles.map(async (path) => [path, await read(path)]),
);
const retiredMcpPatterns = [
	/packages\/localcloud-mcp-server/i,
	/@localcloud\/localcloud-mcp-server/i,
	/@modelcontextprotocol\/sdk/i,
	/\blocalcloud-mcp-server\b/i,
	/\bMCP package\b/i,
	/\bmcp_package\w*\b/i,
	/\bMCP (?:README|facts|build|typecheck|metadata|distribution)\b/i,
	/\binstallable MCP tools\b/i,
	/generated package snapshot/i,
	/package\/download signals/i,
	/\b(?:MCPB|Docker MCP Catalog|PulseMCP|Smithery)\b/i,
	/\bnpm\b[^\n]{0,80}\bMCP\b|\bMCP\b[^\n]{0,80}\bnpm\b/i,
];
for (const [path, content] of referenceEntries) {
	for (const pattern of retiredMcpPatterns) {
		assert(
			!pattern.test(content),
			`${path} retains a retired site-local MCP package reference: ${pattern}`,
		);
	}
}

const forbidden = [
	"/_localcloud/",
	"GOOGLE_CLOUD_PROJECT=local-project",
	'project="local-project"',
	'projectId: "local-project"',
	"8080:24080",
	"4443:24081",
	"8085-8087:24082-8087",
	"6379:24089",
	"free for developers",
	"zero code changes",
	"anonymous product analytics",
	"does not send telemetry",
	"~96%",
	"936 collected",
	"200+ mapped",
	"95% feature coverage",
];
for (const phrase of forbidden) {
	assert(
		!source.toLowerCase().includes(phrase.toLowerCase()),
		`forbidden stale phrase remains: ${phrase}`,
	);
}

const runtimeMcpGuideExpression =
	"${productFacts.runtimeRepositoryUrl}/blob/main/docs/MCP_INTEGRATION.md";
const productFactsSource = await read("src/data/productFacts.ts");
for (const repository of [
	'https://github.com/LocalGCloud/localcloud-cli',
	'https://github.com/jhsenjaliya/localcloud',
	'https://github.com/LocalStack-Google/localcloud-site',
]) {
	assert(productFactsSource.includes(repository), `productFacts omits repository owner ${repository}`);
}
assert(!productFactsSource.includes('githubUrl:'), 'productFacts still conflates repositories in githubUrl');
for (const path of [
	"src/pages/blog/localcloud-for-ai-agents.astro",
	"src/pages/docs/licensing.mdx",
	"src/data/agenticContent.ts",
]) {
	const value = await read(path);
	assert(
		value.includes(runtimeMcpGuideExpression),
		`${path} does not use the canonical productFacts runtime MCP guide URL`,
	);
	assert(
		value.includes("/mcp") && value.includes("localcloud mcp"),
		`${path} does not distinguish the runtime endpoint from the stdio bridge`,
	);
}

for (const path of ["public/llms.txt", "public/llms-full.txt"]) {
	const value = await read(path);
	assert(
		value.includes("27 available Google Cloud service guides"),
		`${path} lacks public service counts`,
	);
	assert(
		value.includes("Firestore is available but disabled by default") &&
			value.includes("Google Sheets provides a limited read-only values facade"),
		`${path} lacks service classification policy`,
	);
	assert(value.includes("local-gcp-project"), `${path} lacks default project`);
	assert(
		value.includes("/health") && value.includes("/env"),
		`${path} lacks root operator routes`,
	);
	assert(
		value.includes("including for-profit companies") &&
			value.includes("internal development, testing, CI, evaluation, and internal pilots"),
		`${path} lacks public-preview license boundaries`,
	);
	assert(value.includes("https://local.cloud/pricing/"), `${path} lacks pricing URL`);
}

const agentic = await read("src/data/agenticContent.ts");
assert(
	(agentic.match(/slug: 'localcloud-for-ai-agents'/g) ?? []).length === 0,
	"unused duplicate AI-agents blog record remains",
);
console.log(
	`Distributed documentation verified: ${files.length} distributed files and ${referenceFiles.length} repository references scanned; runtime MCP links, public LLM files, and Agent Skills surfaces are consistent.`,
);
