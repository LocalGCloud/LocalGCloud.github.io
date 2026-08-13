import contract from "./localcloud-contract.generated.json" with {
	type: "json",
};

export type ServiceStatus =
	| "supported"
	| "partial"
	| "release-unverified"
	| "planned";
export type ImplementationKind =
	| "google-official"
	| "extended-official"
	| "custom-emulator"
	| "third-party-emulator"
	| "local-facade";

export interface LocalCloudService {
	name: string;
	slug: string;
	status: ServiceStatus;
	port: string;
	protocol: string;
	envVar: string;
	endpointLabel: string;
	docsUrl: string;
	implementation: ImplementationKind;
	supported: string[];
	gaps: string[];
	caveat: string;
}

export interface DocEntry {
	title: string;
	url: string;
	topics: string[];
	summary: string;
}

export interface PromptEntry {
	id: string;
	label: string;
	useCase: string;
	prompt: string;
}

export const productFacts = {
	name: contract.product.name,
	siteUrl: contract.product.siteUrl,
	githubUrl: "https://github.com/LocalGCloud/LocalGCloud.github.io",
	dockerImage: contract.product.dockerImage,
	logoUrl: "https://local.cloud/brand/localcloud-mark.svg",
	serviceCountLabel: String(contract.product.serviceCount),
	category: "Local Google Cloud development sandbox",
	description: `LocalCloud provides ${contract.product.serviceCount} available local services, with Firestore marked as coming soon.`,
	productionBoundary: `${contract.product.productionBoundary} ${contract.product.licenseSummary} Excluded uses include ${contract.product.licenseExcludedUse.join(", ")}.`,
} as const;

export const agenticFacts = {
	positioning:
		"LocalCloud is a loopback-oriented Google Cloud development sandbox with operation-level evidence, explicit outbound behavior, and a proprietary-license boundary.",
	dockerImage: productFacts.dockerImage,
	containerName: "localcloud",
	defaultProject: contract.product.defaultProject,
	memoryRequirement: contract.product.memory,
	consoleUrl: `http://localhost:${contract.product.gatewayPort}`,
	adminBaseUrl: `http://localhost:${contract.product.gatewayPort}`,
	healthEndpoint: contract.product.healthEndpoint,
	shellEnvEndpoint: contract.product.shellEnvEndpoint,
	terraformEnvEndpoint: contract.product.terraformEnvEndpoint,
	dockerPullCommand: `docker pull ${productFacts.dockerImage}`,
	dockerRunArgs: [
		"run",
		"-d",
		"--name",
		"localcloud",
		"-p",
		"127.0.0.1:24080-24092:24080-24092",
		"-m",
		contract.product.memory,
		"-v",
		"localcloud-data:/var/lib/localcloud",
		productFacts.dockerImage,
	],
	envExportCommand:
		'eval "$(curl -fsS http://localhost:24080/env?format=shell)"',
	terraformEnvCommand:
		'eval "$(curl -fsS http://localhost:24080/env?format=terraform)"',
	noCredentialBoundary:
		"Bounded local workflows require no default GCP account or billing project and should stop rather than request or fall back to real Google Cloud credentials or endpoints.",
	releaseGuardrail:
		"Review the governing license, clear local endpoints in a clean process, and validate allowed release behavior against real Google Cloud.",
	evidence: {
		source: `generated schema v${contract.schemaVersion}; runtime ${contract.runtimeRevision}; CLI ${contract.cliRevision}`,
		reviewedAt: contract.reviewedAt,
		reviewer: "LocalCloud documentation accuracy remediation",
	},
} as const;

export const localcloudServices = contract.services as LocalCloudService[];

export const docsCorpus: DocEntry[] = [
	{
		title: "Agent onboarding",
		url: "https://local.cloud/ai/agents.md",
		topics: ["agents", "setup", "safety"],
		summary:
			"CLI-first setup, loopback routing, evidence states, licensing, and production boundaries.",
	},
	{
		title: "Compatibility",
		url: "https://local.cloud/compatibility/",
		topics: ["compatibility", "limits"],
		summary:
			`Operation-level evidence states and limitations for ${contract.product.serviceGuideCount} public service guides.`,
	},
	{
		title: "Configuration",
		url: "https://local.cloud/docs/configuration/",
		topics: ["config", "iam", "endpoints"],
		summary:
			"Environment precedence, IAM behavior, operator routes, and generated SDK values.",
	},
	{
		title: "Terraform",
		url: "https://local.cloud/docs/terraform/",
		topics: ["terraform", "iac"],
		summary:
			"Provider credentials, routing modes, readiness, and qualified resources.",
	},
	{
		title: "Seed data",
		url: "https://local.cloud/docs/seed-data/",
		topics: ["seed", "fixtures"],
		summary:
			"Accepted envelopes, implemented registrars, volatile behavior, and reset boundaries.",
	},
	{
		title: "Privacy",
		url: "https://local.cloud/docs/privacy/",
		topics: ["privacy", "telemetry", "egress"],
		summary:
			"Runtime telemetry, website analytics, outbound paths, fields, and controls.",
	},
	{
		title: "Licensing",
		url: "https://local.cloud/docs/licensing/",
		topics: ["license", "permitted use"],
		summary:
			"Proprietary license grant, excluded use, and technical-enforcement distinction.",
	},
];

export const promptLibrary: PromptEntry[] = [
	{
		id: "quickstart",
		label: "Start LocalCloud",
		useCase: "Start an allowed bounded local sandbox.",
		prompt:
			"Read https://local.cloud/ai/agents.md and https://local.cloud/docs/licensing/. If the intended use is permitted, run localcloud doctor and localcloud start, export localcloud env, and perform one documented local check. Stop rather than requesting real GCP credentials.",
	},
	{
		id: "terraform",
		label: "Validate Terraform locally",
		useCase: "Run an evidence-qualified and licensed local Terraform check.",
		prompt:
			"Read the licensing and Terraform guides, identify provider version and resources, select endpoint or transparent routing, use valid fake credentials, gate on /terraform/readiness, and report unqualified resources without contacting real GCP.",
	},
	{
		id: "seed",
		label: "Create local fixtures",
		useCase: "Prepare deterministic seed YAML.",
		prompt:
			"Read the licensing and seed-data guides, use an accepted envelope and implemented registrar, use fake data only, and verify through the application SDK. Firestore must be created through the SDK, not seed YAML.",
	},
];
