import { servicesInCatalogOrder } from "./services.ts";

// Pages that overlap stay separate until search data shows which one to keep (plan R7).
// Until then each pair keeps its own title, H1 and intent, links the other page in both
// directions inside <main>, and every link to a page in a pair uses that page's one anchor
// text below. scripts/verify-content-facts.mjs checks the built pages.

export interface RelatedPage {
	// The one anchor text for links to this page.
	anchor: string;
	// One line on what the page adds, shown beside generated links.
	note: string;
}

export interface RelatedPair {
	pages: readonly [string, string];
	// The finding that lists the pair as a merge candidate.
	finding: string;
}

export interface RelatedLink {
	label: string;
	href: string;
	note: string;
}

const pages: Record<string, RelatedPage> = {
	"/docs/bigquery-emulator-features/": {
		anchor: "BigQuery emulator feature reference",
		note: "Endpoints, documented operations and runtime limits.",
	},
	"/compare/bigquery-emulator-alternatives/": {
		anchor: "BigQuery emulator alternatives",
		note: "When a standalone emulator, LocalCloud or real BigQuery fits an agent workflow.",
	},
	"/how-to-run-google-cloud-locally/": {
		anchor: "How to run Google Cloud locally",
		note: "Step-by-step setup with the LocalCloud CLI.",
	},
	"/local-cloud-development/": {
		anchor: "Local cloud development guide",
		note: "Practices for keeping local and production settings apart.",
	},
	"/reduce-gcp-dev-costs/": {
		anchor: "Evaluate local GCP development costs",
		note: "A worked example for test runs moved to localhost.",
	},
	"/optimize-gcp-costs/": {
		anchor: "Optimize GCP costs",
		note: "A production cost checklist that starts from your own billing exports.",
	},
	"/gcp-integration-testing/": {
		anchor: "GCP integration testing in CI",
		note: "GitHub Actions, GitLab CI and Jenkins templates with health gates.",
	},
	"/workflows/github-actions-gcp-emulator/": {
		anchor: "GitHub Actions workflow",
		note: "The full workflow: readiness gate, environment export and a credentialless job.",
	},
	"/workflows/integration-tests/": {
		anchor: "Local GCP integration tests for agents",
		note: "Structure agent-written tests against localhost services.",
	},
	"/workflows/agentic-ci/": {
		anchor: "Team automation with LocalCloud",
		note: "Have an agent prepare the first CI change: health gate, environment export, existing tests.",
	},
	"/agents/claude-code-gcp-sandbox/": {
		anchor: "Claude Code GCP sandbox setup",
		note: "Claude-specific setup and caveats.",
	},
	"/blog/claude-code-local-gcp-sandbox/": {
		anchor: "Claude Code local GCP sandbox demo",
		note: "Demo post: ask, start, route and test in one session.",
	},
	"/blog/bigquery-locally-agent-written-pipelines/": {
		anchor: "BigQuery locally for agent-written pipelines",
		note: "Demo post: seed a fixture, run the query, assert the rows.",
	},
	"/local-cloud-for-ai-agents/": {
		anchor: "Local cloud for AI agents",
		note: "Why an agent needs a cloud API target, not only a code sandbox.",
	},
	"/ai/": {
		anchor: "Agent resources",
		note: "Prompts, the AGENTS.md template and raw Markdown routes for agents.",
	},
	"/blog/localcloud-for-ai-agents/": {
		anchor: "Introducing LocalCloud for AI coding agents",
		note: "The July 2026 launch post.",
	},
	"/gcp-emulator/": {
		anchor: "GCP emulator overview",
		note: "Every local service in one Docker container.",
	},
	"/docs/what-is-gcp-emulator/": {
		anchor: "What is a GCP emulator?",
		note: "Longer explanation with endpoint routing and production limits.",
	},
	"/glossary/gcp-emulator/": {
		anchor: "GCP emulator definition",
		note: "The term in one sentence.",
	},
};

// Root /<service>-emulator/ landing pages, by service slug.
export const emulatorLandingPaths: Record<string, string> = {
	bigquery: "/bigquery-emulator/",
	pubsub: "/pubsub-emulator/",
	spanner: "/spanner-emulator/",
	bigtable: "/bigtable-emulator/",
	firestore: "/firestore-emulator/",
	"cloud-storage": "/cloud-storage-emulator/",
};

export const agentTestingPath = (slug: string) => `/services/${slug}/ai-agent-local-testing/`;

// Every service that runs locally has a guide and an agent testing page.
const localServices = servicesInCatalogOrder.filter(
	(service) => service.catalogState === "available" && service.marketingStatus === "supported",
);
for (const service of localServices) {
	pages[`/services/${service.slug}/`] = {
		anchor: `${service.name} service guide`,
		note: "Local workflows, boundaries, and SDK examples for this service.",
	};
	pages[agentTestingPath(service.slug)] = {
		anchor: `${service.name} local testing for AI agents`,
		note: "Endpoint routing, a representative local check, and copyable agent prompts.",
	};
	const landing = emulatorLandingPaths[service.slug];
	if (landing) pages[landing] = { anchor: `${service.name} emulator overview`, note: "Setup and FAQ." };
}

// Pairs list the default survivor first. A page's counterparts appear in this order.
export const relatedPagePairs: RelatedPair[] = [
	{ pages: ["/how-to-run-google-cloud-locally/", "/local-cloud-development/"], finding: "S20" },
	{ pages: ["/reduce-gcp-dev-costs/", "/optimize-gcp-costs/"], finding: "S22" },
	{ pages: ["/gcp-integration-testing/", "/workflows/github-actions-gcp-emulator/"], finding: "S23" },
	{ pages: ["/gcp-integration-testing/", "/workflows/integration-tests/"], finding: "S23" },
	{ pages: ["/gcp-integration-testing/", "/workflows/agentic-ci/"], finding: "S23" },
	{ pages: ["/agents/claude-code-gcp-sandbox/", "/blog/claude-code-local-gcp-sandbox/"], finding: "S24" },
	{ pages: [agentTestingPath("bigquery"), "/blog/bigquery-locally-agent-written-pipelines/"], finding: "S24" },
	{ pages: ["/local-cloud-for-ai-agents/", "/ai/"], finding: "S6" },
	{ pages: ["/ai/", "/blog/localcloud-for-ai-agents/"], finding: "S6" },
	{ pages: ["/gcp-emulator/", "/docs/what-is-gcp-emulator/"], finding: "A11" },
	{ pages: ["/docs/what-is-gcp-emulator/", "/glossary/gcp-emulator/"], finding: "S26" },
	...localServices.flatMap((service): RelatedPair[] => {
		const guide = `/services/${service.slug}/`;
		const landing = emulatorLandingPaths[service.slug];
		return [
			...(landing ? [{ pages: [guide, landing] as const, finding: "S11" }] : []),
			{ pages: [guide, agentTestingPath(service.slug)] as const, finding: "S30" },
		];
	}),
];

export const relatedPage = (path: string): RelatedPage => {
	const page = pages[path];
	if (!page) throw new Error(`relatedPages.ts has no anchor text for ${path}`);
	return page;
};

// The canonical anchor text for a link to a page in a pair.
export const relatedAnchor = (path: string) => relatedPage(path).anchor;

// A link to a page in a pair; `note` replaces the default line where the context needs its own.
export const relatedLink = (path: string, note?: string): RelatedLink => ({
	label: relatedAnchor(path),
	href: path,
	note: note ?? relatedPage(path).note,
});

// Links from one page to every page it is paired with.
export const relatedLinksFor = (path: string): RelatedLink[] =>
	relatedPagePairs
		.flatMap(({ pages: [a, b] }) => (a === path ? [b] : b === path ? [a] : []))
		.map((counterpart) => relatedLink(counterpart));

// Every page in a pair has its own anchor, and no two pages share one.
for (const { pages: pair } of relatedPagePairs) pair.forEach(relatedPage);
const anchors = Object.values(pages).map((page) => page.anchor.toLowerCase());
const repeated = anchors.find((anchor, index) => anchors.indexOf(anchor) !== index);
if (repeated) throw new Error(`relatedPages.ts uses the anchor "${repeated}" for two pages`);
