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
	siteRepositoryUrl: "https://github.com/LocalStack-Google/localcloud-site",
	agentSkillsUrl:
		"https://github.com/LocalStack-Google/localcloud-site/tree/main/agent-skills",
	dockerImageRepository: docsContract.product.runtimeImage.repository,
	dockerImageTag: docsContract.product.runtimeImage.tag,
	dockerImage: `${docsContract.product.runtimeImage.repository}:${docsContract.product.runtimeImage.tag}`,
	cliDefaultImage: `${docsContract.product.runtimeImage.repository}:${docsContract.product.runtimeImage.tag}`,
	installScriptUrl: docsContract.cli.installScriptUrl,
	installScriptCommand: docsContract.cli.installCommand,
	homebrewInstallCommand: docsContract.cli.homebrewCommand,
	homebrewTapUrl: "https://github.com/LocalGCloud/homebrew-tap",
	releaseVersion: "0.1.2",
	releaseTag: "v0.1.2",
	logoUrl: "https://local.cloud/brand/localcloud-mark.svg",
	companyName: "LocalCloud Inc.",
	companyAddress: "5365 California Street, Palo Alto, CA",
	serviceCountLabel: String(availableServiceCount),
	availabilityStatement:
		"Use is governed by the proprietary LocalCloud license; review the license before use.",
	licensingPath: "/docs/licensing/",
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
