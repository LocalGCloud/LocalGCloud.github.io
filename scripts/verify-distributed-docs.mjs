import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const assert = (condition, message) => {
	if (!condition)
		throw new Error(`Distributed documentation verification: ${message}`);
};

let contract;
try {
	contract = JSON.parse(await read("src/data/docs-contract.snapshot.json"));
} catch (error) {
	throw new Error(
		"Distributed documentation verification: docs contract is invalid JSON",
		{ cause: error },
	);
}
let generated;
try {
	generated = JSON.parse(
		await read(
			"packages/localcloud-mcp-server/src/data/localcloud-contract.generated.json",
		),
	);
} catch (error) {
	throw new Error(
		"Distributed documentation verification: generated MCP contract is invalid JSON",
		{ cause: error },
	);
}

assert(
	generated.services.length === contract.services.length - 1,
	"MCP generated public service count must exclude integration-only Google Sheets",
);
assert(
	generated.product.serviceCount === 25,
	"generated available service count is not 25",
);
assert(
	generated.product.serviceGuideCount === 26,
	"generated public service guide count is not 26",
);
assert(
	!generated.services.some((service) => service.slug === "google-sheets"),
	"Google Sheets is still exposed as a LocalCloud service",
);
assert(
	generated.services.find((service) => service.slug === "firestore")?.status ===
		"planned",
	"Firestore must be exposed as coming soon",
);
assert(
	generated.runtimeRevision === contract.provenance.runtimeRevision,
	"generated runtime revision is stale",
);
assert(
	generated.cliRevision === contract.provenance.cliRevision,
	"generated CLI revision is stale",
);

const roots = [
	"src",
	"public",
	"agent-skills",
	"packages/localcloud-mcp-server",
];
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
	"free for individual developers",
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

for (const path of ["public/llms.txt", "public/llms-full.txt"]) {
	const value = await read(path);
	assert(
		value.includes("25 available services") &&
			value.includes("1 coming-soon service guide"),
		`${path} lacks public service counts`,
	);
	assert(
		value.includes("Google Sheets is an integration surface") &&
			value.includes("Firestore — coming soon"),
		`${path} lacks service classification policy`,
	);
	assert(value.includes("local-gcp-project"), `${path} lacks default project`);
	assert(
		value.includes("/health") && value.includes("/env"),
		`${path} lacks root operator routes`,
	);
	assert(
		/limited non-commercial personal use/i.test(value),
		`${path} lacks proprietary-license boundary`,
	);
}

const agentic = await read("src/data/agenticContent.ts");
assert(
	(agentic.match(/slug: 'localcloud-for-ai-agents'/g) ?? []).length === 0,
	"unused duplicate AI-agents blog record remains",
);
const mcpFacts = await read(
	"packages/localcloud-mcp-server/src/data/localcloudFacts.ts",
);
assert(
	/import contract from ["']\.\/localcloud-contract\.generated\.json["']/.test(
		mcpFacts,
	),
	"MCP facts do not consume generated contract",
);
assert(
	!mcpFacts.includes("service('Cloud Storage'"),
	"MCP facts retain hand-maintained service rows",
);

console.log(
	`Distributed documentation verified: ${generated.services.length} generated services, ${files.length} files scanned, LLM/MCP/skill parity enforced.`,
);
