import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const assert = (condition, message) => {
	if (!condition)
		throw new Error(`Distributed documentation verification: ${message}`);
};

const llmsText = await read("public/llms.txt");
assert(/^#\s+\S/m.test(llmsText), "llms.txt must contain an H1 heading");
assert(
	/^[-*]\s+\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)/m.test(llmsText),
	"llms.txt must contain a Markdown list link",
);

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
	"24080",
	"24081",
	"24082",
	"24083",
	"24084",
	"24085",
	"24086",
	"24087",
	"24088",
	"24089",
	"24090",
	"24091",
	"24092",
	"24443",
	"free for developers",
	"zero code changes",
	"no code change",
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

// The runtime repository is private, so published pages link public profiles only:
// the LocalGCloud GitHub organization, its public repositories and Docker Hub.
// scripts/verify-content-facts.mjs checks the built site for the same thing.
const privateRepository = /github\.com\/jhsenjaliya\b/i;
assert(!privateRepository.test(source), "a distributed file links the private runtime repository; link /license/ or a site page instead");
const productFactsSource = await read("src/data/productFacts.ts");
for (const repository of [
	'https://github.com/LocalGCloud"',
	'https://github.com/LocalGCloud/localcloud-cli"',
	'https://github.com/LocalGCloud/LocalGCloud.github.io"',
	'https://hub.docker.com/r/',
]) {
	assert(productFactsSource.includes(repository), `productFacts omits public profile ${repository}`);
}
assert(!productFactsSource.includes('githubUrl:'), 'productFacts still conflates repositories in githubUrl');
// MCP is documented on the site (the glossary entry); pages that mention it link there and
// keep the runtime endpoint and the stdio bridge distinct.
for (const [path, link] of [
	["src/pages/blog/localcloud-for-ai-agents.astro", "/glossary/mcp-server/"],
	["src/pages/docs/licensing.mdx", "/glossary/mcp-server/"],
	["src/data/agenticContent.ts", '"mcp-server"'],
]) {
	const value = await read(path);
	assert(value.includes(link), `${path} does not link the site's MCP page`);
	assert(
		value.includes("/mcp") && value.includes("localcloud mcp"),
		`${path} does not distinguish the runtime endpoint from the stdio bridge`,
	);
}

const contract = JSON.parse(await read("src/data/docs-contract.snapshot.json"));
const isLocal = (service) => service.availability === "available" && !["unsupported", "unknown"].includes(service.status);
const availableCount = contract.services.filter((service) => service.published && isLocal(service)).length;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// dist/llms-full.txt is built after astro build; verify-content-facts checks it starts with llms.txt.
for (const path of ["public/llms.txt"]) {
	const value = await read(path);
	assert(
		value.startsWith(`# LocalCloud\n\n> LocalCloud is a local Google Cloud emulator: one Docker container that serves ${availableCount} Google Cloud services on localhost`),
		`${path} must open with the one-sentence definition and the local service count`,
	);
	assert(
		/^\| Firestore \| `firestore` \| opt-in \|/m.test(value) && value.includes("are opt-in: `--services` sets the exact list"),
		`${path} must list Firestore as a supported opt-in service and explain --services`,
	);
	assert(
		value.includes("Google Sheets serves read-only spreadsheet values"),
		`${path} lacks the Google Sheets fixture role`,
	);
	assert(value.includes("local-gcp-project"), `${path} lacks default project`);
	assert(
		value.includes("/readiness") && value.includes("/env"),
		`${path} lacks root operator routes`,
	);
	assert(
		value.includes("including for-profit companies") &&
			value.includes("internal development, testing, CI, evaluation, and internal pilots"),
		`${path} lacks public-preview license boundaries`,
	);
	assert(value.includes("Free for open-source projects policy"), `${path} lacks the open-source free-use policy`);
	assert(value.includes("https://local.cloud/pricing/"), `${path} lacks pricing URL`);
	assert(
		value.indexOf("\n## Services\n") !== -1 && value.indexOf("\n## Services\n") < value.indexOf("\n## License\n"),
		`${path} must place the license after the services`,
	);
	// The production note is stated once, not repeated on every service line.
	assert(
		value.split("validate application behavior against real Google Cloud").length === 2 &&
			!value.includes("production source of truth"),
		`${path} must give the production note exactly once`,
	);
	for (const service of contract.services) {
		const pattern = isLocal(service)
			? `^\\| ${escapeRegExp(service.name)} \\| \`${service.id}\` \\|.*\\[guide\\]\\(https://local\\.cloud/services/[a-z0-9-]+/\\) \\|$`
			: `^- \\[${escapeRegExp(service.name)}\\]\\(https://local\\.cloud/services/[a-z0-9-]+/\\) — unsupported$`;
		assert(new RegExp(pattern, "m").test(value), `${path} misstates ${service.name} or omits its guide link`);
	}
}

const agentic = await read("src/data/agenticContent.ts");
assert(
	(agentic.match(/slug: 'localcloud-for-ai-agents'/g) ?? []).length === 0,
	"unused duplicate AI-agents blog record remains",
);
console.log(
	`Distributed documentation verified: ${files.length} distributed files and ${referenceFiles.length} repository references scanned; runtime MCP links, public LLM files, and Agent Skills surfaces are consistent.`,
);
