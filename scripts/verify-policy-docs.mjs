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
	"src/components/Header.astro",
	"src/components/PricingWorkbench.astro",
	"src/components/SearchModal.astro",
	"src/components/DocFeedback.astro",
	"src/components/FeedbackFab.astro",
	"src/pages/optimize-gcp-costs.astro",
	"src/pages/reduce-gcp-dev-costs.astro",
	"src/pages/localstack-for-google-cloud.astro",
	"src/data/productFacts.ts",
	"src/data/agenticFacts.ts",
	"src/data/agenticContent.ts",
	"src/pages/pricing.astro",
	"public/llms.txt",
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
	"LocalCloud Public Preview License Agreement",
	"including for-profit companies",
	"ongoing internal CI",
	"No payment method or license key is required",
	"Preview releases keep their terms",
	"data.oculus.llc@gmail.com",
])
	assert(licensing.includes(phrase), `licensing reference omits ${phrase}`);

const pricing = docs.get("src/components/PricingWorkbench.astro");
for (const phrase of [
	"Public preview",
	"Individuals, teams, nonprofits, and companies",
	"Internal CI",
	"No payment method or license key required",
	"View license",
])
	assert(pricing.includes(phrase), `pricing page omits ${phrase}`);
assert(!/\$\d/.test(pricing), "pricing page publishes a numeric price");
assert(!/Contact us|Commercial|commercial/.test(pricing), "pricing page retains a commercial offer");

const header = docs.get("src/components/Header.astro");
const aiNavIndex = header.indexOf("label: 'AI Agents'");
const pricingNavIndex = header.indexOf("label: 'Pricing'");
const emulatorNavIndex = header.indexOf("label: 'GCP Emulator'");
assert(
	aiNavIndex !== -1 && pricingNavIndex !== -1 && emulatorNavIndex !== -1,
	"header must expose AI Agents, Pricing, and GCP Emulator navigation entries",
);
assert(
	aiNavIndex < pricingNavIndex && pricingNavIndex < emulatorNavIndex,
	"Pricing navigation must appear immediately after AI",
);

for (const phrase of [
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
	"src/components/SearchModal.astro",
	"src/components/DocFeedback.astro",
	"src/components/FeedbackFab.astro",
]) {
	assert(
		/docs\/privacy\//.test(docs.get(path)),
		`${path} lacks adjacent privacy disclosure`,
	);
}
for (const path of [
	"src/pages/optimize-gcp-costs.astro",
	"src/pages/reduce-gcp-dev-costs.astro",
]) {
	const source = docs.get(path);
	assert(
		source.includes("Public Preview License"),
		`${path} lacks adjacent preview-license boundary`,
	);
	assert(
		!/\$\d|\b\d{2,3}-\d{2,3}%|zero cloud costs|eliminates? .*cost/i.test(source),
		`${path} retains unsupported quantified or elimination claim`,
	);
}

console.log(
	`Policy documentation verified across ${docs.size} privacy, licensing, analytics, and marketing surfaces.`,
);
