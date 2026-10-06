import { servicesInCatalogOrder } from "./services.ts";

// Pages that overlap but keep separate jobs; plan R7 merged the other candidates and
// redirected them (public/_redirects). Each pair keeps its own title, H1 and intent, links
// the other page in both directions inside <main>, and every link to a page in a pair uses
// that page's one anchor text below. scripts/verify-content-facts.mjs checks the built pages.

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
	"/gcp-integration-testing/": {
		anchor: "GCP integration testing in CI",
		note: "GitHub Actions, GitLab CI and Jenkins templates with health gates.",
	},
	"/workflows/github-actions-gcp-emulator/": {
		anchor: "GitHub Actions workflow",
		note: "The full workflow: readiness gate, environment export and a credentialless job.",
	},
	"/local-cloud-for-ai-agents/": {
		anchor: "Local cloud for AI agents",
		note: "Why an agent needs a cloud API target, not only a code sandbox.",
	},
	"/ai/": {
		anchor: "Agent resources",
		note: "Prompts, the AGENTS.md template and raw Markdown routes for agents.",
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

// Every service that runs locally has a guide.
const localServices = servicesInCatalogOrder.filter(
	(service) => service.catalogState === "available" && service.marketingStatus === "supported",
);
for (const service of localServices) {
	pages[`/services/${service.slug}/`] = {
		anchor: `${service.name} service guide`,
		note: "Local workflows, boundaries, and SDK examples for this service.",
	};
}

// Pairs list the default survivor first. A page's counterparts appear in this order.
export const relatedPagePairs: RelatedPair[] = [
	{ pages: ["/gcp-integration-testing/", "/workflows/github-actions-gcp-emulator/"], finding: "S23" },
	{ pages: ["/local-cloud-for-ai-agents/", "/ai/"], finding: "S6" },
	{ pages: ["/gcp-emulator/", "/docs/what-is-gcp-emulator/"], finding: "A11" },
	{ pages: ["/docs/what-is-gcp-emulator/", "/glossary/gcp-emulator/"], finding: "S26" },
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
