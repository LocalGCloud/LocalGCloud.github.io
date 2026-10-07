import { createHash } from "node:crypto";
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
	`${contract.privacy.runtimeTelemetry.disableVariable}=false`,
	"technical, usage, and diagnostic details",
	"aggregate service and Console activity",
	"pseudonymous identifier",
	"stops regular runtime and Console reporting",
	"one startup event",
	"telemetry is disabled",
	"Update checks",
	"license validation",
	"live-cloud authentication",
	"jobs or feedback",
	"basic web analytics",
	"Analytics providers",
	"Search text and feedback",
	"heatmaps",
	"dead clicks",
	"sampled session recordings",
	"Input values are masked",
	"install_script_fetched",
	"**Analytics: On**",
	"**Analytics: Off**",
	"Global Privacy Control",
	"Do Not Track",
	"mailto:info@local.cloud",
])
	assert(privacy.includes(phrase), `privacy reference omits ${phrase}`);
for (const obsoleteClaim of [
	"trust-all TLS",
	"No main-source caller",
	"ca-probe",
	"seven days of hourly events",
	"agents@local.cloud",
	"no built-in analytics opt-out",
])
	assert(!privacy.includes(obsoleteClaim), `privacy reference retains obsolete claim ${obsoleteClaim}`);

const licensing = docs.get("src/pages/docs/licensing.mdx");
for (const phrase of [
	"LocalCloud Public Preview License Agreement",
	"including for-profit companies",
	"ongoing internal CI",
	"No payment method or license key is required",
	"Preview releases keep their terms",
	"governingLicenseUrl = productFacts.licensePath",
	'href="/license.txt"',
])
	assert(licensing.includes(phrase), `licensing reference omits ${phrase}`);

// /license/ and /license.txt publish this committed copy of the governing license. It must be
// the exact file whose digest the documentation contract records; scripts/sync-upstream-docs.mjs
// refreshes both together.
const governingLicense = contract.licensing.governingLicense;
const recordedDigest = contract.provenance.sourceDigests[governingLicense];
const licenseCopy = await readFile(new URL("src/data/legal/public-preview-license.txt", root));
const copyDigest = `sha256:${createHash("sha256").update(licenseCopy).digest("hex")}`;
assert(recordedDigest, `the contract records no digest for ${governingLicense}`);
assert(
	copyDigest === recordedDigest,
	`src/data/legal/public-preview-license.txt (${copyDigest}) differs from ${governingLicense} in the contract (${recordedDigest}); re-run scripts/sync-upstream-docs.mjs`,
);

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

// Header navigation (S5): six entries, each naming its own destination. The logo links
// home, Services covers the GCP emulator overview, and Pricing follows AI Agents directly.
const header = docs.get("src/components/Header.astro");
const navLabels = [...header.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);
for (const label of ["Services", "AI Agents", "Pricing", "Docs"])
	assert(navLabels.includes(label), `header must expose a ${label} navigation entry`);
assert(
	navLabels[navLabels.indexOf("AI Agents") + 1] === "Pricing",
	"Pricing navigation must appear immediately after AI Agents",
);
for (const label of ["GCP Emulator", "Home"])
	assert(
		!navLabels.includes(label),
		`header must not expose a ${label} entry; the Services entry and the logo cover it`,
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

// The privacy page promises a footer control and Global Privacy Control / Do Not Track
// handling; the code that keeps those promises must stay in place.
const layout = docs.get("src/layouts/BaseLayout.astro");
for (const [phrase, promise] of [
	["navigator.globalPrivacyControl === true", "Global Privacy Control"],
	["navigator.doNotTrack", "Do Not Track"],
	["posthog.opt_out_capturing()", "the PostHog opt-out"],
	["autocapture: false", "explicit events only"],
	["window.lcAnalytics", "the footer analytics control"],
])
	assert(layout.includes(phrase), `BaseLayout no longer implements ${promise} (${phrase})`);
const footer = docs.get("src/components/Footer.astro");
assert(
	footer.includes("data-analytics-toggle") && footer.includes("Analytics: ${analytics.isOn() ? 'On' : 'Off'}"),
	"the footer must offer the Analytics: On/Off control the privacy page describes",
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
// The one cost page (/optimize-gcp-costs/ redirects to it) keeps the license boundary next to
// its example and states no savings figure.
for (const path of [
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
