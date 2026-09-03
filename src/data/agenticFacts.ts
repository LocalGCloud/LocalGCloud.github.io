import { docsContract } from "./docs-contract";
import { productFacts } from "./productFacts";
import { services, type Service } from "./services";

export interface EvidenceRecord {
	source: string;
	reviewedAt: string;
	reviewer: string;
}

export interface AgenticEndpoint {
	label: string;
	url: string;
	purpose: string;
}

export interface AgenticServiceMetadata {
	name: string;
	slug: string;
	status: "supported" | "partial" | "release-unverified" | "planned";
	port: string;
	protocol: string;
	endpointLabel: string;
	envVar: string;
	docsUrl: string;
	implementation: Service["implementation"];
	supported: string[];
	gaps: string[];
	caveat: string;
	registryDefaultEnabled: boolean;
	assembledDefaultEnabled: boolean;
	defaultQualification: Service["defaultQualification"];
	minTier: Service["minTier"];
	persistence: Service["persistence"];
}

export interface AgentPrompt {
	id: string;
	label: string;
	useCase: string;
	prompt: string;
}

export const agenticFacts = {
	positioning:
		"LocalCloud is a local Google Cloud development sandbox: one Docker container, bounded SDK workflows pointed at loopback endpoints, and explicit compatibility limits. Review the governing proprietary license and validate against real Google Cloud before production.",
	dockerImage: productFacts.dockerImage,
	containerName: "localcloud",
	defaultProject: docsContract.product.defaultProject,
	memoryRequirement: docsContract.product.memory,
	consoleUrl: `http://localhost:${docsContract.operator.gatewayPort}`,
	adminBaseUrl: `http://localhost:${docsContract.operator.gatewayPort}`,
	healthEndpoint: `http://localhost:${docsContract.operator.gatewayPort}${docsContract.operator.endpoints.health}`,
	shellEnvEndpoint: `http://localhost:${docsContract.operator.gatewayPort}${docsContract.operator.endpoints.environment}?format=shell`,
	terraformEnvEndpoint: `http://localhost:${docsContract.operator.gatewayPort}${docsContract.operator.endpoints.environment}?format=terraform`,
	cliInstallCommand: docsContract.cli.installCommand,
	cliQuickStartCommand: docsContract.cli.quickStart.join("\n"),
	dockerPullCommand: `docker pull ${productFacts.dockerImage}`,
	dockerRunCommand: docsContract.operator.manualDockerCommand,
	envExportCommand: 'eval "$(localcloud env)"',
	terraformEnvCommand: "localcloud env --format terraform",
	productionBoundary: productFacts.productionBoundary,
	noCredentialBoundary:
		"Permitted workflows use local endpoint values and should stop rather than fall back to real Google Cloud or real credentials. The Community License covers eligible individual, student, and nonprofit use; a for-profit company requires a separate Commercial License.",
	releaseGuardrail:
		"Before production deployment, unset LocalCloud emulator environment variables and validate behavior against real Google Cloud.",
	evidence: {
		source: `Versioned documentation contract from runtime ${docsContract.provenance.runtimeRevision} and CLI ${docsContract.provenance.cliRevision}`,
		reviewedAt: docsContract.reviewedAt,
		reviewer: "LocalCloud documentation accuracy audit",
	} satisfies EvidenceRecord,
} as const;

export const agenticEndpoints: AgenticEndpoint[] = [
	{
		label: "Web console",
		url: agenticFacts.consoleUrl,
		purpose:
			"Inspect service health, local data, logs, and administrative state.",
	},
	{
		label: "Health check",
		url: agenticFacts.healthEndpoint,
		purpose:
			"Wait for LocalCloud readiness before SDK, Terraform, seed, or other local workflows.",
	},
	{
		label: "Shell environment export",
		url: agenticFacts.shellEnvEndpoint,
		purpose: "Set emulator endpoint variables for local SDK and CLI workflows.",
	},
	{
		label: "Terraform environment export",
		url: agenticFacts.terraformEnvEndpoint,
		purpose:
			"Set endpoint overrides for local Terraform validation without real GCP credentials.",
	},
];

const agenticStatusByEvidence = {
	verified: "supported",
	partial: "partial",
	"release-unverified": "release-unverified",
	unsupported: "planned",
	unknown: "planned",
} as const satisfies Record<
	Service["status"],
	AgenticServiceMetadata["status"]
>;

export const agenticServiceMetadata: AgenticServiceMetadata[] = services.map(
	(service) => {
		const status =
			service.catalogState === "coming-soon"
				? "planned"
				: agenticStatusByEvidence[service.status];

		return {
			name: service.name,
			slug: service.slug,
			status,
			port: service.catalogState === "coming-soon" ? "coming soon" : service.port,
			protocol:
				service.catalogState === "coming-soon" ? "planned" : service.protocol,
			endpointLabel:
				service.catalogState === "coming-soon"
					? "Coming soon"
					: service.endpointLabel,
			envVar: service.catalogState === "coming-soon" ? "" : service.envVar,
			docsUrl: `${productFacts.siteUrl}services/${service.slug}/`,
			implementation: service.implementation,
			supported:
				service.catalogState === "coming-soon"
					? []
					: service.operations
							.filter(
								(operation) =>
									operation.status !== "unsupported" && operation.status !== "unknown",
							)
							.map(
								(operation) =>
									`${operation.label} (${operation.status})${operation.limitations.length ? ` — ${operation.limitations.join(" ")}` : ""}`,
							),
			gaps:
				service.catalogState === "coming-soon"
					? ["Service support is coming soon."]
					: [
							...service.notSupported,
							...service.operations
								.filter(
									(operation) =>
										operation.status === "unsupported" || operation.status === "unknown",
								)
								.map((operation) => `${operation.label}: ${operation.status}`),
						],
			registryDefaultEnabled: service.registryDefaultEnabled,
			assembledDefaultEnabled: service.assembledDefaultEnabled,
			defaultQualification: service.defaultQualification,
			minTier: service.minTier,
			persistence: service.persistence,
			caveat:
				service.catalogState === "coming-soon"
					? "Service support is coming soon; do not configure a local endpoint yet."
					: service.status === "release-unverified"
						? `Release-unverified: source behavior is not yet qualified in an identified assembled image. Limits: ${service.notSupported.join(", ")}.`
						: service.notSupported.length
							? `Local development coverage is partial. Known limits: ${service.notSupported.join(", ")}.`
							: "Verified for bounded local workflows; still validate production behavior against real Google Cloud.",
		};
	},
);

export const agentPromptLibrary: AgentPrompt[] = [
	{
		id: "quickstart",
		label: "Start LocalCloud",
		useCase: "Give an agent one URL and have it start the local GCP sandbox.",
		prompt:
			"Fetch https://local.cloud/ai/agents.md and follow the instructions to start LocalCloud on my machine. Verify Docker, start or reuse the localcloud container, export emulator environment variables, and run one local GCP SDK/API smoke check. Do not ask for or use real GCP credentials.",
	},
	{
		id: "project-integration",
		label: "Configure this repo",
		useCase: "Have an agent wire an existing project to LocalCloud safely.",
		prompt:
			"Set up this repository to use LocalCloud for local GCP development. First read https://local.cloud/ai/agents.md, then inspect this repo, identify the GCP services and SDK language, configure emulator environment variables, and run the narrowest integration test against localhost. Do not use real GCP credentials or production endpoints.",
	},
	{
		id: "ci",
		label: "Check automation eligibility",
		useCase: "Confirm that a personal automation workflow is permitted before changing it.",
		prompt:
			"Read https://local.cloud/docs/licensing/ before changing this automation. Stop if it is for an employer, organization, commercial project, shared team workflow, or team CI. If it is a permitted personal non-commercial workflow, propose the smallest change that starts LocalCloud, waits for readiness, exports emulator env vars, runs integration tests locally, and avoids real GCP secrets.",
	},
	{
		id: "troubleshoot",
		label: "Troubleshoot routing",
		useCase: "Diagnose why SDKs or Terraform are still reaching real GCP.",
		prompt:
			"Troubleshoot my LocalCloud setup. Read https://local.cloud/ai/agents.md, check whether Docker and the localcloud container are healthy, verify emulator environment variables are set in this shell/test runner, and identify any SDK or Terraform configuration that could still call real Google Cloud.",
	},
	{
		id: "bigquery",
		label: "BigQuery local test",
		useCase: "Ask an agent to validate BigQuery code against the local emulator.",
		prompt:
			"Use LocalCloud to test BigQuery code locally. Read https://local.cloud/ai/agents.md and the BigQuery docs, set BIGQUERY_EMULATOR_HOST for localhost, create a local dataset/table, insert sample rows, run a representative query, and call out any unsupported SQL features instead of using real BigQuery.",
	},
	{
		id: "pubsub",
		label: "Pub/Sub local test",
		useCase: "Ask an agent to validate Pub/Sub event code locally.",
		prompt:
			"Use LocalCloud to test Pub/Sub locally. Read https://local.cloud/ai/agents.md, set PUBSUB_EMULATOR_HOST=localhost:24082, create a topic and subscription, publish one test message, pull or stream it, ack it, and verify the payload without using real GCP credentials.",
	},
	{
		id: "cloud-storage",
		label: "Cloud Storage local test",
		useCase: "Ask an agent to validate bucket/object code locally.",
		prompt:
			"Use LocalCloud to test Cloud Storage locally. Read https://local.cloud/ai/agents.md, set STORAGE_EMULATOR_HOST=http://localhost:24081, create a bucket, upload a small object, list it, download it, and verify content without using real GCP credentials.",
	},
];

export const claimReviewRule = {
	title: "Agentic claim review",
	rule:
		"No agentic page, skill, runtime-integration reference, or machine-readable file may publish a service capability, compatibility, cost, credential, Docker image, endpoint, or production-boundary claim unless it references an approved source, reviewer, and review date.",
	evidence: agenticFacts.evidence,
} as const;

export const agentSafeValidationChecklist = [
	"States that LocalCloud is limited to uses permitted by the governing proprietary license and is not a production GCP replacement.",
	"Keeps bounded local workflows on loopback endpoints and stops rather than requesting or falling back to real Google Cloud credentials.",
	`Uses the reviewed image repository ${productFacts.dockerImage}; the mutable tag remains release-unverified, so prefer localcloud start and pin a qualified digest for release workflows.`,
	"Points SDKs and Terraform to localhost/emulator endpoints before any verification step.",
	"Warns agents to stop rather than falling back to real GCP when Docker or LocalCloud is unavailable.",
	"Links service-specific claims to the service catalog, compatibility docs, or reviewed evidence.",
	"Instructs production validation against real Google Cloud after unsetting emulator environment variables.",
] as const;
