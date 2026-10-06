import { cliQuickStart, dockerQuickStart } from "../utils/quickstart.mjs";
import { docsContract } from "./docs-contract";
import { productFacts } from "./productFacts";
import { serviceCompatibilityEditorial } from "./serviceEditorial";
import { servicesInCatalogOrder, type Service } from "./services";

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
	id: string;
	name: string;
	slug: string;
	status: "supported" | "partial" | "release-unverified" | "planned" | "unsupported" | "unknown";
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
		"LocalCloud is a local Google Cloud emulator: one Docker container that answers Google Cloud SDK calls on localhost, so code and tests run without a GCP account, credentials, or billing. Validate against real Google Cloud before production.",
	dockerImage: productFacts.dockerImage,
	containerName: "localcloud",
	defaultProject: docsContract.product.defaultProject,
	memoryRequirement: docsContract.product.memory,
	consoleUrl: `http://localhost:${docsContract.operator.gatewayPort}`,
	adminBaseUrl: `http://localhost:${docsContract.operator.gatewayPort}`,
	healthEndpoint: `http://localhost:${docsContract.operator.gatewayPort}${docsContract.operator.endpoints.health}`,
	readinessEndpoint: `http://localhost:${docsContract.operator.gatewayPort}${docsContract.operator.endpoints.readiness}`,
	shellEnvEndpoint: `http://localhost:${docsContract.operator.gatewayPort}${docsContract.operator.endpoints.environment}?format=shell`,
	terraformEnvEndpoint: `http://localhost:${docsContract.operator.gatewayPort}${docsContract.operator.endpoints.environment}?format=terraform`,
	cliQuickStart: cliQuickStart(docsContract),
	dockerQuickStart: dockerQuickStart(docsContract),
	envExportCommand: 'eval "$(localcloud env)"',
	terraformEnvCommand: "localcloud env --format terraform",
	productionBoundary: productFacts.productionBoundary,
	noCredentialBoundary:
		"Use only local endpoint values. If a step would need real Google Cloud or real credentials, stop. The Public Preview License permits individuals and organizations, including for-profit companies, to use LocalCloud for non-production internal development, testing, CI, evaluation, and pilots.",
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
			"Inspect runtime health; use the readiness endpoint before application traffic.",
	},
	{
		label: "Readiness check",
		url: agenticFacts.readinessEndpoint,
		purpose: "Wait for configured services to be ready, then verify the exact SDK/API workflow.",
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
			"Set endpoint overrides for local Terraform validation without real Google Cloud credentials.",
	},
];

const agenticStatusByEvidence = {
	verified: "supported",
	partial: "supported",
	"release-unverified": "supported",
	unsupported: "unsupported",
	unknown: "unknown",
} as const satisfies Record<
	Service["status"],
	AgenticServiceMetadata["status"]
>;

// Items often end in a period; strip it so "; " joins never produce ".;" or "..".
export const joinClauses = (items: readonly string[]) =>
	items
		.map((item) => item.replace(/[.;\s]+$/, ""))
		.filter(Boolean)
		.join("; ");

// Agent pages describe each service with the same curated capability and boundary
// lists as /compatibility/ and the service guide, not the raw operation ledger.
// In the shared catalog order, so /ai/ and every agent Markdown file list services like /services/.
export const agenticServiceMetadata: AgenticServiceMetadata[] = servicesInCatalogOrder.map(
	(service) => {
		const status =
			service.catalogState === "coming-soon"
				? "planned"
				: agenticStatusByEvidence[service.status];
		const editorial = serviceCompatibilityEditorial[service.id];
		if (!editorial) throw new Error(`Missing compatibility editorial for ${service.id}`);

		return {
			id: service.id,
			name: service.name,
			slug: service.slug,
			status,
			port: service.catalogState === "coming-soon" ? "not available" : service.port,
			protocol:
				service.catalogState === "coming-soon" ? "not available" : service.protocol,
			endpointLabel:
				service.catalogState === "coming-soon"
					? "No local endpoint"
					: service.endpointLabel,
			envVar: service.catalogState === "coming-soon" ? "" : service.envVar,
			docsUrl: `${productFacts.siteUrl}services/${service.slug}/`,
			implementation: service.implementation,
			supported:
				service.catalogState === "coming-soon"
					? []
					: editorial.capabilities.map((capability) => capability.summary),
			gaps:
				service.catalogState === "coming-soon"
					? ["LocalCloud does not run this service locally."]
					: [...editorial.boundaries],
			registryDefaultEnabled: service.registryDefaultEnabled,
			assembledDefaultEnabled: service.assembledDefaultEnabled,
			defaultQualification: service.defaultQualification,
			minTier: service.minTier,
			persistence: service.persistence,
			caveat:
				service.catalogState === "coming-soon" || service.status === "unsupported" || service.status === "unknown"
					? "Not available locally. Use Google Cloud for this service."
					: !service.registryDefaultEnabled
						? `Opt-in to save memory: add ${service.id} to localcloud start --services, which sets the exact list of services to run.`
					: editorial.boundaries.length
						? `Documented local workflows with these boundaries: ${joinClauses(editorial.boundaries.slice(0, 2))}.`
						: "Supported for local workflows; validate production behavior against real Google Cloud.",
		};
	},
);

export const agentPromptLibrary: AgentPrompt[] = [
	{
		id: "quickstart",
		label: "Start LocalCloud",
		useCase: "Give an agent one URL and have it start the local GCP sandbox.",
		prompt:
			"Fetch https://local.cloud/ai/agents.md and follow the instructions to start LocalCloud on my machine. Install the LocalCloud CLI if it is missing, verify Docker, start or reuse LocalCloud, export emulator environment variables, and run one local GCP SDK/API smoke check. Do not ask for or use real GCP credentials.",
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
		label: "Configure internal CI",
		useCase: "Have an agent add a permitted non-production LocalCloud CI workflow.",
		prompt:
			"Read https://local.cloud/docs/licensing/ before changing this automation. Keep the workflow within the Public Preview License's non-production boundary. Propose the smallest change that starts LocalCloud, waits for readiness, exports emulator env vars, runs integration tests locally, and avoids real GCP secrets.",
	},
	{
		id: "troubleshoot",
		label: "Troubleshoot routing",
		useCase: "Diagnose why SDKs or Terraform are still reaching real Google Cloud.",
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
			"Use LocalCloud to test Pub/Sub locally. Read https://local.cloud/ai/agents.md, set PUBSUB_EMULATOR_HOST=localhost:5383, create a topic and subscription, publish one test message, pull or stream it, ack it, and verify the payload without using real GCP credentials.",
	},
	{
		id: "cloud-storage",
		label: "Cloud Storage local test",
		useCase: "Ask an agent to validate bucket/object code locally.",
		prompt:
			"Use LocalCloud to test Cloud Storage locally. Read https://local.cloud/ai/agents.md, set STORAGE_EMULATOR_HOST=http://localhost:5382, create a bucket, upload a small object, list it, download it, and verify content without using real GCP credentials.",
	},
];

export const claimReviewRule = {
	title: "Agentic claim review",
	rule:
		"No agentic page, skill, runtime-integration reference, or machine-readable file may publish a service capability, compatibility, cost, credential, Docker image, endpoint, or production-boundary claim unless it references an approved source, reviewer, and review date.",
	evidence: agenticFacts.evidence,
} as const;

// Direct rules for agents. /ai/agents.md is the canonical list; the AGENTS.md
// template repeats it because it is copied into repositories on its own.
export const agentDirectRules = [
	"Use only local endpoint values. If a step would need real Google Cloud or real credentials, stop and report it.",
	"Never ask for or use service-account keys, application default credentials, production project IDs, or billing accounts.",
	"Export the LocalCloud environment in the same shell or test runner before any SDK, CLI, or Terraform step.",
	"If Docker or LocalCloud is unavailable, stop and report the blocker instead of falling back to real Google Cloud.",
	"Prefer the LocalCloud CLI. The `latest` image tag is mutable, so pin an image digest when repeatability matters.",
	"Back service-specific claims with the service page or https://local.cloud/compatibility/.",
	"Use LocalCloud only for the non-production work the Public Preview License permits.",
	"Before production, unset the emulator variables and validate the change against real Google Cloud.",
] as const;
