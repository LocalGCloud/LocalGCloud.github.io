import { docsContract } from "./docs-contract.ts";
import { availableServiceCount, isServiceSupported, services } from "./services.ts";

export type CompatibilityStatus =
	| "supported"
	| "partial"
	| "planned"
	| "unsupported";

export interface Evidence {
	source: string;
	reviewedAt: string;
	reviewer: string;
}

export const productFacts = {
	name: "LocalCloud",
	siteUrl: "https://local.cloud/",
	// Public profiles only: every URL here is published on the site and in structured data.
	githubOrganizationUrl: "https://github.com/LocalGCloud",
	cliRepositoryUrl: "https://github.com/LocalGCloud/localcloud-cli",
	cliReleasesUrl: "https://github.com/LocalGCloud/localcloud-cli/releases",
	cliIssuesUrl: "https://github.com/LocalGCloud/localcloud-cli/issues",
	siteRepositoryUrl: "https://github.com/LocalGCloud/LocalGCloud.github.io",
	dockerHubUrl: `https://hub.docker.com/r/${docsContract.product.runtimeImage.repository}`,
	agentSkillsUrl:
		"https://github.com/LocalGCloud/LocalGCloud.github.io/tree/main/agent-skills",
	dockerImageRepository: docsContract.product.runtimeImage.repository,
	dockerImageTag: docsContract.product.runtimeImage.tag,
	dockerImage: `${docsContract.product.runtimeImage.repository}:${docsContract.product.runtimeImage.tag}`,
	cliDefaultImage: `${docsContract.product.runtimeImage.repository}:${docsContract.product.runtimeImage.tag}`,
	installScriptUrl: docsContract.cli.installScriptUrl,
	installScriptCommand: docsContract.cli.installCommand,
	homebrewInstallCommand: docsContract.cli.homebrewCommand,
	homebrewTapUrl: "https://github.com/LocalGCloud/homebrew-tap",
	logoUrl: "https://local.cloud/brand/localcloud-mark.svg",
	companyName: "LocalCloud Inc.",
	companyAddress: "5365 California Street, Palo Alto, CA",
	// People write to info@ (general, licensing, partnerships, privacy and security reports);
	// agent@ is the address published in agent-facing text (llms.txt, /ai/, AGENTS.md).
	contactEmail: "info@local.cloud",
	agentContactEmail: "agent@local.cloud",
	contactPath: "/contact/",
	securityPath: "/security/",
	changelogPath: "/changelog/",
	serviceCountLabel: String(availableServiceCount),
	availabilityStatement: docsContract.licensing.summary,
	licensingPath: "/docs/licensing/",
	// The governing license text, published from src/data/legal/public-preview-license.txt.
	licensePath: "/license/",
	pricingPath: "/pricing/",
	category: "Local Google Cloud emulator",
	description:
		"LocalCloud provides documented Google Cloud service workflows in one local Docker container. Use is governed by the proprietary license, and compatibility depends on the service, client, and endpoint configuration.",
	productionBoundary: docsContract.product.productionBoundary,
	evidence: {
		source: `Versioned documentation contract from runtime ${docsContract.provenance.runtimeRevision} and CLI ${docsContract.provenance.cliRevision}`,
		reviewedAt: docsContract.reviewedAt,
		reviewer: "LocalCloud documentation accuracy audit",
	} satisfies Evidence,
} as const;

export type JsonLd = Record<string, unknown>;

// Stable node ids: the company is described on every page and the product on / and
// /pricing/; every other page refers to both instead of repeating them.
export const organizationId = new URL("#org", productFacts.siteUrl).toString();
export const productId = new URL("#localcloud", productFacts.siteUrl).toString();
const organizationReference = { "@id": organizationId };
const productReference = { "@id": productId };
// Use a new filename when refreshing the raster share card to avoid cached previews.
export const socialCardUrl = new URL("/brand/localcloud-social-card-agents-final.png", productFacts.siteUrl).toString();

export const organizationSchema: JsonLd = {
	"@context": "https://schema.org",
	"@type": "Organization",
	"@id": organizationId,
	name: productFacts.companyName,
	legalName: productFacts.companyName,
	url: productFacts.siteUrl,
	logo: productFacts.logoUrl,
	description: productFacts.description,
	email: productFacts.contactEmail,
	contactPoint: [
		{
			"@type": "ContactPoint",
			contactType: "customer support",
			email: productFacts.contactEmail,
			url: new URL(productFacts.contactPath, productFacts.siteUrl).toString(),
			availableLanguage: "en",
		},
		{
			"@type": "ContactPoint",
			contactType: "technical support",
			name: "AI agents and integrations",
			email: productFacts.agentContactEmail,
			url: new URL(productFacts.contactPath, productFacts.siteUrl).toString(),
			availableLanguage: "en",
		},
	],
	address: {
		"@type": "PostalAddress",
		streetAddress: "5365 California Street",
		addressLocality: "Palo Alto",
		addressRegion: "CA",
		addressCountry: "US",
	},
	sameAs: [productFacts.githubOrganizationUrl, productFacts.cliRepositoryUrl, productFacts.dockerHubUrl],
};

// A page about LocalCloud, published by LocalCloud Inc. Use type "TechArticle" for guides
// and references; "WebPage" for landing, comparison and definition pages.
export const createWebPageSchema = ({
	url,
	name,
	description,
	type = "WebPage",
	dateModified,
}: {
	url: string;
	name: string;
	description: string;
	type?: "WebPage" | "TechArticle";
	dateModified?: string;
}): JsonLd => ({
	"@context": "https://schema.org",
	"@type": type,
	"@id": `${url}#webpage`,
	url,
	...(type === "TechArticle"
		? { headline: name, mainEntityOfPage: url, author: organizationReference, image: socialCardUrl }
		: { name }),
	description,
	inLanguage: "en",
	about: productReference,
	publisher: organizationReference,
	...(dateModified ? { dateModified } : {}),
});

export const createBlogPostingSchema = ({
	url,
	headline,
	description,
	datePublished,
	dateModified,
}: {
	url: string;
	headline: string;
	description: string;
	datePublished: string;
	dateModified: string;
}): JsonLd => ({
	"@context": "https://schema.org",
	"@type": "BlogPosting",
	"@id": `${url}#article`,
	headline,
	description,
	url,
	mainEntityOfPage: url,
	image: socialCardUrl,
	datePublished,
	dateModified,
	inLanguage: "en",
	author: organizationReference,
	publisher: organizationReference,
	about: productReference,
});

export const publicPreviewPricing = {
	price: "0",
	priceCurrency: "USD",
} as const;

export const publicPreviewPriceLabel = `${new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: publicPreviewPricing.priceCurrency,
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
}).format(Number(publicPreviewPricing.price))} ${publicPreviewPricing.priceCurrency}`;

// Services above the community tier. Public-preview release images disable tier
// enforcement and the preview grant covers all of LocalCloud, so they are free as well.
const proTierServiceNames = services
	.filter((service) => service.minTier === "pro" && isServiceSupported(service))
	.map((service) => service.name);
const proTierServiceList = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(proTierServiceNames);

// The one full product entity, published on the homepage and pricing page only.
export const localCloudProductSchema: JsonLd = {
	"@context": "https://schema.org",
	"@type": ["Product", "SoftwareApplication"],
	"@id": productId,
	name: productFacts.name,
	url: productFacts.siteUrl,
	description: `LocalCloud is a local Google Cloud emulator for developers, CI pipelines and AI coding agents: one Docker container that serves ${productFacts.serviceCountLabel} Google Cloud services on localhost for development, testing, CI, evaluation, and internal pilots.`,
	applicationCategory: "DeveloperApplication",
	applicationSubCategory: productFacts.category,
	operatingSystem: "Docker",
	downloadUrl: `https://hub.docker.com/r/${productFacts.dockerImageRepository}`,
	license: new URL(productFacts.licensePath, productFacts.siteUrl).toString(),
	image: socialCardUrl,
	brand: organizationReference,
	publisher: organizationReference,
	category: productFacts.category,
	softwareRequirements: "Docker",
	featureList: [
		`${productFacts.serviceCountLabel} local services in one Docker container`,
		"Generated local SDK endpoints for Google Cloud clients",
		"Built-in web console for inspecting local cloud resources",
		"Persistent local data using Docker volumes",
		"Local development, integration tests, CI, evaluation, and internal pilots",
	],
	offers: {
		"@type": "Offer",
		"@id": new URL("/pricing/#public-preview", productFacts.siteUrl).toString(),
		name: "Public Preview",
		url: new URL(productFacts.pricingPath, productFacts.siteUrl).toString(),
		price: publicPreviewPricing.price,
		priceCurrency: publicPreviewPricing.priceCurrency,
		availability: "https://schema.org/InStock",
		description: `Free to use during public preview for local development, testing, CI, evaluation, and internal pilots, including the Pro-tier services (${proTierServiceList}). No payment method or license key required. Customer-facing production use, resale, hosting as a service, redistribution, and sublicensing are excluded.`,
	},
};

export const createBreadcrumbSchema = (
	items: ReadonlyArray<{ name: string; url?: string }>,
): JsonLd => ({
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	itemListElement: items.map((item, index) => ({
		"@type": "ListItem",
		position: index + 1,
		name: item.name,
		...(item.url ? { item: item.url } : {}),
	})),
});
