import { docsContract } from "./docs-contract.ts";
import { availableServiceCount } from "./services.ts";

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
	cliRepositoryUrl: "https://github.com/LocalGCloud/localcloud-cli",
	runtimeRepositoryUrl: "https://github.com/jhsenjaliya/localcloud",
	siteRepositoryUrl: "https://github.com/LocalGCloud/LocalGCloud.github.io",
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
	serviceCountLabel: String(availableServiceCount),
	availabilityStatement: docsContract.licensing.summary,
	licensingPath: "/docs/licensing/",
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

export const organizationSchema: JsonLd = {
	"@context": "https://schema.org",
	"@type": "Organization",
	name: productFacts.companyName,
	legalName: productFacts.companyName,
	url: productFacts.siteUrl,
	logo: productFacts.logoUrl,
	description: productFacts.description,
	address: {
		"@type": "PostalAddress",
		streetAddress: "5365 California Street",
		addressLocality: "Palo Alto",
		addressRegion: "CA",
		addressCountry: "US",
	},
	sameAs: [productFacts.cliRepositoryUrl, productFacts.runtimeRepositoryUrl],
};

export const createSoftwareApplicationSchema = (
	url: string,
	description: string,
): JsonLd => ({
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: productFacts.name,
	applicationCategory: "DeveloperApplication",
	applicationSubCategory: productFacts.category,
	operatingSystem: "Docker",
	url,
	description,
	downloadUrl: `https://hub.docker.com/r/${productFacts.dockerImageRepository}`,
	license: new URL(productFacts.licensingPath, productFacts.siteUrl).toString(),
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

// Share the same product and public-preview offer on the homepage and pricing page.
export const localCloudProductSchema: JsonLd = {
	...createSoftwareApplicationSchema(
		productFacts.siteUrl,
		`LocalCloud is a local Google Cloud emulator that runs ${productFacts.serviceCountLabel} supported integrations in one Docker container for development, testing, CI, evaluation, and internal pilots.`,
	),
	"@type": ["Product", "SoftwareApplication"],
	"@id": new URL("#localcloud", productFacts.siteUrl).toString(),
	image: new URL(
		"/illustrations/hero-laptop-service-grid.svg",
		productFacts.siteUrl,
	).toString(),
	brand: {
		"@type": "Brand",
		name: productFacts.companyName,
	},
	category: productFacts.category,
	softwareRequirements: "Docker",
	featureList: [
		`${productFacts.serviceCountLabel} supported Google Cloud integrations in one Docker container`,
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
		description:
			"Free to use during public preview for local development, testing, CI, evaluation, and internal pilots. No payment method or license key required. Customer-facing production use, resale, hosting as a service, redistribution, and sublicensing are excluded.",
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
