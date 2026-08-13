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
	githubUrl: "https://github.com/LocalGCloud/localcloud-cli",
	siteRepositoryUrl: "https://github.com/LocalGCloud/LocalGCloud.github.io",
	dockerImageRepository: docsContract.product.runtimeImage.repository,
	dockerImageTag: docsContract.product.runtimeImage.tag,
	dockerImage: `${docsContract.product.runtimeImage.repository}:${docsContract.product.runtimeImage.tag}`,
	cliDefaultImage: `${docsContract.product.runtimeImage.repository}:${docsContract.product.runtimeImage.tag}`,
	installScriptUrl: docsContract.cli.installScriptUrl,
	installScriptCommand: docsContract.cli.installCommand,
	homebrewInstallCommand: docsContract.cli.homebrewCommand,
	homebrewTapUrl: "https://github.com/LocalGCloud/homebrew-tap",
	releaseVersion: "0.1.0",
	releaseTag: "v0.1.0",
	logoUrl: "https://local.cloud/brand/localcloud-mark.svg",
	serviceCountLabel: String(availableServiceCount),
	availabilityStatement:
		"Use is governed by the proprietary LocalCloud license; review the license before use.",
	licensingPath: "/docs/licensing/",
	category: "Local Google Cloud emulator",
	description:
		"LocalCloud provides evidence-bounded Google Cloud service workflows in one local Docker container. Use is governed by the proprietary license, and SDK compatibility depends on service, client, and endpoint configuration.",
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
	name: productFacts.name,
	url: productFacts.siteUrl,
	logo: productFacts.logoUrl,
	description: productFacts.description,
	sameAs: [productFacts.githubUrl],
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
