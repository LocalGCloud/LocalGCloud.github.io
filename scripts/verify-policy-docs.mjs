import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const assert = (condition, message) => {
	if (!condition)
		throw new Error(`Policy documentation verification: ${message}`);
};

let contract;
try {
	contract = JSON.parse(await read("src/data/docs-contract.snapshot.json"));
} catch (error) {
	throw new Error(
		"Policy documentation verification: docs contract is invalid JSON",
		{ cause: error },
	);
}
const paths = [
	"src/pages/docs/privacy.mdx",
	"src/pages/docs/licensing.mdx",
	"src/pages/docs/faq.mdx",
	"src/data/faqContent.ts",
	"src/layouts/BaseLayout.astro",
	"src/components/Footer.astro",
	"src/components/SearchModal.astro",
	"src/components/DocFeedback.astro",
	"src/components/FeedbackFab.astro",
	"src/pages/optimize-gcp-costs.astro",
	"src/pages/reduce-gcp-dev-costs.astro",
	"src/pages/localstack-for-google-cloud.astro",
	"src/data/productFacts.ts",
	"src/data/agenticFacts.ts",
	"src/data/agenticContent.ts",
	"public/llms.txt",
	"packages/localcloud-mcp-server/README.md",
	"packages/localcloud-mcp-server/PRIVACY.md",
	"packages/localcloud-mcp-server/SECURITY.md",
	"packages/localcloud-mcp-server/LICENSE",
	"packages/localcloud-mcp-server/package.json",
	"packages/localcloud-mcp-server/server.json",
	"packages/localcloud-mcp-server/server-card.json",
	"packages/localcloud-mcp-server/mcpb/manifest.json",
	"packages/localcloud-mcp-server/mcpb/README.md",
	"packages/localcloud-mcp-server/docker-catalog/server.yaml",
];
const docs = new Map(
	await Promise.all(paths.map(async (path) => [path, await read(path)])),
);
const combined = [...docs.values()].join("\n");

const privacy = docs.get("src/pages/docs/privacy.mdx");
for (const phrase of [
	contract.privacy.runtimeTelemetry.destination,
	contract.privacy.runtimeTelemetry.disableVariable,
	"LOCALCLOUD_EVENT_API_KEY",
	"server_started",
	"heartbeat",
	"telemetry_disabled",
	"pseudonymous identifier",
	"stored in PostgreSQL",
	"trust-all TLS manager",
	"search-query events",
	"optional free-text documentation comments",
	"site consent/opt-out control",
])
	assert(privacy.includes(phrase), `privacy reference omits ${phrase}`);
assert(
	privacy.includes("privacy.outboundBehaviors.map"),
	"privacy reference does not render contract outbound behaviors",
);
for (const destination of [
	"storage.googleapis.com",
	"Docker Hub",
	"online validation service",
	"Google OAuth",
	"HTTP destination",
]) {
	assert(
		privacy.includes(destination),
		`privacy reference omits outbound destination ${destination}`,
	);
}

const licensing = docs.get("src/pages/docs/licensing.mdx");
for (const phrase of [
	"Individual Developer",
	"personal non-commercial projects",
	"employer or organization",
	"team CI",
	"internal business tools",
	"generates revenue, savings, or commercial advantage",
	"no commercial license is currently offered or available",
	"Technical availability is not legal permission",
])
	assert(licensing.includes(phrase), `licensing reference omits ${phrase}`);

for (const phrase of [
	"free for developers",
	"free for individual developers",
	"anonymous product analytics",
	"does not send telemetry",
	"phone home",
	"no outbound connections",
])
	assert(
		!combined.toLowerCase().includes(phrase),
		`public policy surfaces retain prohibited claim ${phrase}`,
	);

for (const path of [
	"packages/localcloud-mcp-server/package.json",
	"packages/localcloud-mcp-server/server.json",
	"packages/localcloud-mcp-server/server-card.json",
	"packages/localcloud-mcp-server/mcpb/manifest.json",
	"packages/localcloud-mcp-server/docker-catalog/server.yaml",
])
	assert(
		!docs.get(path).includes("Apache-2.0"),
		`${path} retains conflicting Apache metadata`,
	);
assert(
	docs
		.get("packages/localcloud-mcp-server/LICENSE")
		.startsWith("PROPRIETARY SOFTWARE LICENSE AGREEMENT"),
	"MCP package does not bundle the governing proprietary license",
);

for (const path of [
	"src/components/SearchModal.astro",
	"src/components/DocFeedback.astro",
	"src/components/FeedbackFab.astro",
]) {
	assert(
		/docs\/privacy\//.test(docs.get(path)),
		`${path} lacks adjacent privacy disclosure`,
	);
}
assert(
	docs
		.get("packages/localcloud-mcp-server/SECURITY.md")
		.includes("broad control over the host Docker daemon"),
	"MCP security page lacks explicit Docker-socket risk",
);
assert(
	docs
		.get("packages/localcloud-mcp-server/PRIVACY.md")
		.includes("pseudonymous identifiers"),
	"MCP privacy page omits runtime telemetry boundary",
);

for (const path of [
	"src/pages/optimize-gcp-costs.astro",
	"src/pages/reduce-gcp-dev-costs.astro",
]) {
	const source = docs.get(path);
	assert(
		source.includes("proprietary license"),
		`${path} lacks adjacent licensing gate`,
	);
	assert(
		!/\$\d|\b\d{2,3}-\d{2,3}%|zero cloud costs|eliminates? .*cost/i.test(
			source,
		),
		`${path} retains unsupported quantified or elimination claim`,
	);
}

console.log(
	`Policy documentation verified across ${docs.size} privacy, licensing, analytics, marketing, and MCP surfaces.`,
);
