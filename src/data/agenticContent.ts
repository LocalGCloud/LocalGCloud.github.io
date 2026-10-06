import { agenticFacts, agenticServiceMetadata, joinClauses } from "./agenticFacts";
import { alternativesReviewedLabel } from "./alternatives";
import { productFacts } from "./productFacts";
import { agentTestingPath, relatedLink, relatedLinksFor } from "./relatedPages";
import { availableServiceCount, serviceTierLabel } from "./services";

export type AgenticContentKind =
	| "agent"
	| "service"
	| "workflow"
	| "comparison"
	| "glossary"
	| "blog";

export interface ContentLink {
	label: string;
	href: string;
	note: string;
}

export interface ContentSection {
	kicker: string;
	title: string;
	body?: string;
	items?: string[];
}

export interface ContentSnippet {
	label: string;
	language: string;
	code: string;
}

export interface ContentTable {
	columns: string[];
	rows: string[][];
}

export interface AgenticContentPage {
	kind: AgenticContentKind;
	slug: string;
	path: string;
	parentLabel: string;
	parentPath: string;
	eyebrow: string;
	title: string;
	description: string;
	h1: string;
	deck: string;
	promptIds: string[];
	quickFacts: string[];
	sections: ContentSection[];
	snippets?: ContentSnippet[];
	table?: ContentTable;
	// Page-specific limits only; the template adds the shared license and production sentence.
	limitations: string[];
	// Page-specific next steps only.
	internalLinks: ContentLink[];
	sources?: ContentLink[];
	reviewedAt?: string;
}

const serviceBySlug = (slug: string) => {
	const service = agenticServiceMetadata.find((item) => item.slug === slug);
	if (!service) throw new Error(`Missing service metadata for ${slug}`);
	return service;
};

// Next steps for pages about running agent-written code locally.
const localTestingLinks: ContentLink[] = [
	{
		label: "SDK examples",
		href: "/docs/sdk-examples/",
		note: "Use standard Google Cloud SDKs pointed at localhost.",
	},
	{
		label: "Seed data",
		href: "/docs/seed-data/",
		note: "Load deterministic fixtures for repeatable agent and CI runs.",
	},
];

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

// Pages that overlap with another page (src/data/relatedPages.ts) list it in Next steps,
// unless their own links or sources already include it.
const withRelatedLinks = (pages: AgenticContentPage[]): AgenticContentPage[] =>
	pages.map((page) => {
		const linked = new Set([...page.internalLinks, ...(page.sources ?? [])].map((link) => link.href));
		const related = relatedLinksFor(page.path).filter((link) => !linked.has(link.href));
		return related.length ? { ...page, internalLinks: [...page.internalLinks, ...related] } : page;
	});

// Install the CLI first; the Docker-only path exports its environment over HTTP.
const quickStartSnippets: ContentSnippet[] = [
	{ label: "LocalCloud commands", language: "bash", code: agenticFacts.cliQuickStart.script },
	{ label: "Docker-only fallback", language: "bash", code: agenticFacts.dockerQuickStart.script },
];

export const agentSandboxPages: AgenticContentPage[] = withRelatedLinks([
	{
		kind: "agent",
		slug: "claude-code-gcp-sandbox",
		path: "/agents/claude-code-gcp-sandbox/",
		parentLabel: "Agents",
		parentPath: "/agents/",
		eyebrow: "Claude Code sandbox",
		title: "Claude Code GCP Sandbox with LocalCloud",
		description:
			"Give Claude Code a credentialless Google Cloud sandbox: LocalCloud in Docker, localhost SDK endpoints, copyable prompts, and a real-GCP validation step.",
		h1: "Claude Code local GCP sandbox",
		deck:
			"Claude Code is strongest when it can inspect a repository, run shell commands, and verify the narrowest failing path. LocalCloud gives that terminal workflow a local GCP surface: one Docker container, standard SDKs pointed at localhost, and no default GCP account or billing project.",
		promptIds: ["quickstart", "project-integration", "troubleshoot"],
		quickFacts: [
			"Terminal-first setup using Docker and localhost endpoints.",
			`Docker image: ${agenticFacts.dockerImage}.`,
			"Best for repo-aware SDK tests, Terraform checks, and troubleshooting loops.",
		],
		sections: [
			{
				kicker: "Claude-specific workflow",
				title: "Start from the repo, not from a blank prompt",
				body:
					"Ask Claude Code to read the project, identify the Google Cloud SDKs and services in use, then fetch /ai/agents.md before it changes code. That sequence keeps LocalCloud as the runtime target instead of a generic cloud migration suggestion.",
				items: [
					"Have Claude verify Docker and reuse an existing localcloud container when present.",
					"Export emulator variables into the exact shell or test runner it will use.",
					"Run one representative SDK operation before editing broader test suites.",
				],
			},
			{
				kicker: "Human approval boundary",
				title: "Approve shell actions, but do not provide cloud secrets",
				body:
					"Claude Code may request permission before running Docker or test commands. The safe path is to approve local Docker, curl, and localhost SDK checks while refusing requests for service-account keys, ADC setup, or production project IDs.",
			},
		],
		snippets: [
			{
				label: "Claude Code bootstrap",
				language: "text",
				code:
					"Read https://local.cloud/ai/agents.md, inspect this repository for Google Cloud SDK usage, start or reuse LocalCloud with Docker, export emulator env vars into this shell, and run the smallest local SDK smoke test. Do not ask for GCP credentials.",
			},
			...quickStartSnippets,
		],
		limitations: [
			"Claude Code is not a hosted isolation boundary by itself; LocalCloud isolates Google Cloud side effects, not arbitrary shell commands.",
			"If a test needs IAM, quota, latency, managed networking, or production-specific behavior, keep a real Google Cloud validation step.",
		],
		internalLinks: localTestingLinks,
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "agent",
		slug: "codex-cli-gcp-sandbox",
		path: "/agents/codex-cli-gcp-sandbox/",
		parentLabel: "Agents",
		parentPath: "/agents/",
		eyebrow: "Codex-style CLI sandbox",
		title: "Codex CLI GCP Sandbox with LocalCloud",
		description:
			"Use LocalCloud as a local Google Cloud target for Codex-style terminal agents, with safe prompts, localhost SDK endpoints, and no cloud credentials.",
		h1: "Codex CLI local GCP sandbox",
		deck:
			"For Codex-style coding CLIs, treat LocalCloud as the deterministic local cloud runtime and the CLI as the code-editing operator. The important contract is explicit: local Docker is allowed, real Google Cloud credentials are not required for default verification.",
		promptIds: ["quickstart", "project-integration", "ci"],
		quickFacts: [
			"Works with terminal agents that can run Docker and project tests.",
			"Keep setup instructions in prompt text because Codex-style CLIs differ by distribution.",
			"Use /ai/agents.md as the stable remote operating contract.",
		],
		sections: [
			{
				kicker: "Platform caveat",
				title: "Do not assume persistent tool state",
				body:
					"Some Codex-style workflows run in fresh shells or constrained environments. Make the agent print which env vars are active before it runs tests, and prefer checked-in scripts only after the local path is proven.",
			},
			{
				kicker: "Safe default",
				title: "Localhost endpoints before code changes",
				body:
					"Ask the CLI to prove SDK routing with one local operation before it edits application code. That prevents a successful unit test from hiding an accidental call to googleapis.com.",
			},
		],
		snippets: [
			{
				label: "Codex CLI prompt",
				language: "text",
				code:
					"Use LocalCloud as the GCP runtime for this task. Fetch https://local.cloud/ai/agents.md, start or reuse the local Docker container, confirm emulator env vars in the shell you will use, then run one localhost SDK or API check before editing code. Never request real GCP credentials for this local validation.",
			},
		],
		limitations: [
			"CLI installation, sandboxing, and approval behavior varies by Codex-compatible client.",
			"LocalCloud validates local API and SDK behavior; release candidates still need real Google Cloud validation.",
		],
		internalLinks: localTestingLinks,
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "agent",
		slug: "cursor-gcp-sandbox",
		path: "/agents/cursor-gcp-sandbox/",
		parentLabel: "Agents",
		parentPath: "/agents/",
		eyebrow: "Cursor sandbox",
		title: "Cursor GCP Sandbox with LocalCloud",
		description:
			"Point Cursor agent workflows at LocalCloud to test Google Cloud code locally with Docker, repo-aware prompts, and a clear production validation step.",
		h1: "Cursor local GCP sandbox",
		deck:
			"Cursor is useful when the agent can reason over an IDE workspace and edit files quickly. LocalCloud gives those edits a concrete local GCP target so agent-written code can be exercised through Google Cloud SDKs before a human pushes to a real project.",
		promptIds: ["project-integration", "quickstart", "troubleshoot"],
		quickFacts: [
			"Best for workspace-aware edits plus an integrated terminal test loop.",
			"Keep emulator env vars in the terminal/session running tests.",
			"Use repository-local instructions to prevent real-cloud fallbacks.",
		],
		sections: [
			{
				kicker: "IDE caveat",
				title: "The editor and terminal may not share state",
				body:
					"Cursor can edit files and run commands, but environment variables must be present in the process that executes tests. Have the agent echo emulator env vars immediately before the SDK check.",
			},
			{
				kicker: "Repo instruction",
				title: "Prefer a project-local note once proven",
				body:
					"After the first successful LocalCloud run, ask Cursor to add concise project instructions only if the repository already uses an agent instruction file. The instruction should say localhost endpoints are the default local test target and production deploys require real GCP validation.",
			},
		],
		snippets: [
			{
				label: "Cursor agent prompt",
				language: "text",
				code:
					"Inspect this workspace for Google Cloud SDK usage. Use https://local.cloud/ai/agents.md to start LocalCloud, set emulator env vars in the terminal that will run tests, and validate one local operation. Do not add real GCP credentials or production project IDs.",
			},
		],
		limitations: [
			"Cursor-specific background agent environments can differ from the visible terminal.",
			"Do not store fake local env vars in files that production jobs source without safeguards.",
		],
		internalLinks: localTestingLinks,
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "agent",
		slug: "gemini-cli-gcp-sandbox",
		path: "/agents/gemini-cli-gcp-sandbox/",
		parentLabel: "Agents",
		parentPath: "/agents/",
		eyebrow: "Gemini CLI sandbox",
		title: "Gemini CLI GCP Sandbox with LocalCloud",
		description:
			"Run Gemini CLI-style terminal workflows against LocalCloud to test Google Cloud SDK code locally, with setup steps and no-credential guardrails.",
		h1: "Gemini CLI local GCP sandbox",
		deck:
			"Gemini CLI-style workflows can use LocalCloud as a concrete localhost target for GCP code. The key is to separate model authentication from cloud-resource authentication: a CLI may need its own model access, but LocalCloud tests should not need Google Cloud credentials.",
		promptIds: ["quickstart", "project-integration", "troubleshoot"],
		quickFacts: [
			"Use shell-visible emulator variables for SDK tests.",
			"Model or CLI login is separate from GCP runtime credentials.",
			"Ask for a local proof before broader refactors.",
		],
		sections: [
			{
				kicker: "Setup caveat",
				title: "Keep model access separate from GCP access",
				body:
					"If a Gemini CLI variant requires login or API keys for the assistant itself, that does not mean the repository should receive Google Cloud credentials. LocalCloud only needs Docker and localhost endpoint variables for default tests.",
			},
			{
				kicker: "Verification",
				title: "Make the CLI show the route it used",
				body:
					"Ask for the command, active env vars, and a short result from a local service operation. If any command reaches production endpoints, stop and troubleshoot routing before editing more files.",
			},
		],
		snippets: [
			{
				label: "Gemini CLI prompt",
				language: "text",
				code:
					"Use LocalCloud for local GCP validation. Fetch https://local.cloud/ai/agents.md, start or reuse the Docker container, export emulator env vars in this shell, and run one SDK/API check against localhost. Keep assistant authentication separate from Google Cloud credentials.",
			},
		],
		limitations: [
			"Gemini CLI distributions and approval models change; verify current client docs before publishing client-specific install claims.",
			"Local emulation does not replace final production validation against real Google Cloud.",
		],
		internalLinks: localTestingLinks,
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
]);

// Search snippets stay within 160 characters; long service and variable names drop the last clause.
const serviceTestingDescription = (name: string, envName: string) => {
	const full = `Let AI agents test ${name} code locally with LocalCloud: set ${envName}, use standard SDKs, and know what to validate in Google Cloud.`;
	return full.length <= 160
		? full
		: `Let AI agents test ${name} code locally with LocalCloud: set ${envName} and use standard SDKs.`;
};

const servicePage = (
	slug: string,
	promptId: string,
	extra: Partial<AgenticContentPage> = {},
): AgenticContentPage => {
	const service = serviceBySlug(slug);
	return {
		kind: "service",
		slug,
		path: agentTestingPath(slug),
		parentLabel: service.name,
		parentPath: `/services/${slug}/`,
		eyebrow: `${service.name} agent testing`,
		// Matches the H1; parenthetical variants such as "(Redis/Valkey)" stay out of the search title.
		title: `${service.name.replace(/\s*\(.*\)$/, "")} Local Testing for AI Agents`,
		description: serviceTestingDescription(service.name, service.envVar.split("=")[0]),
		h1: `${service.name} local testing for AI agents`,
		deck: `Use LocalCloud when an agent needs to create, exercise, and reset ${service.name} resources without touching a real Google Cloud project. The same SDK code points at localhost through ${service.envVar}.`,
		// Most services use the project-integration prompt, so drop the repeat.
		promptIds: [...new Set([promptId, "project-integration", "troubleshoot"])],
		quickFacts: [
			`Endpoint: ${service.envVar} (${service.endpointLabel}).`,
			`${service.registryDefaultEnabled ? "Starts by default" : `Opt-in: add ${service.id} to localcloud start --services`}; minimum tier: ${serviceTierLabel(service) ?? service.minTier}.`,
			`Persistence: ${service.persistence.scope}. ${sentence(service.persistence.restartBehavior)}`,
		],
		sections: [
			{
				kicker: "Agent quickstart",
				title: "Route the SDK before writing code",
				body: `Start LocalCloud, export ${service.envVar}, and make the agent perform one ${service.name} operation before changing application logic. That catches accidental production routing early.`,
			},
			{
				kicker: "Validation example",
				title: "Prefer one representative behavior over broad smoke tests",
				body: `A useful agent check creates local ${service.name} state, reads it back with the project SDK, and records which feature was covered. It should not require a GCP account, service-account key, or billing project.`,
			},
			{
				kicker: "State setup",
				title: "Use only documented setup paths",
				body:
					"Create deterministic state through a contract-documented seed registrar or through an operation listed on this page. Do not assume every service supports seed data, reset, or persistent state.",
			},
			...(extra.sections ?? []),
		],
		snippets: [
			{
				label: "Environment",
				language: "bash",
				code: `${agenticFacts.envExportCommand}\n# Verify that the generated environment includes ${service.envVar.split("=")[0]}; do not replace a CLI-remapped value with a hard-coded port.`,
			},
			...(extra.snippets ?? []),
		],
		table: {
			columns: ["Area", "LocalCloud local check", "Real GCP still needed for"],
			rows: [
				[
					"SDK routing",
					`${service.envVar} points clients at localhost.`,
					"Production endpoint, auth, IAM, quota, and regional behavior.",
				],
				[
					"Supported features",
					joinClauses(service.supported),
					service.gaps.length
						? joinClauses(service.gaps)
						: "Production scale, SLAs, and managed control-plane behavior.",
				],
				[
					"Agent safety",
					"No default cloud account, credentials, or billing project required.",
					"Final release validation in the target GCP project.",
				],
			],
		},
		limitations: [...(extra.limitations ?? [])],
		internalLinks: [
			relatedLink(`/services/${slug}/`),
			...localTestingLinks,
		],
		sources: [
			{
				label: "LocalCloud service metadata",
				href: `/services/${slug}/`,
				note: `Reviewed ${agenticFacts.evidence.reviewedAt}; implementation ${service.implementation}.`,
			},
			...(extra.sources ?? []),
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	};
};

const promptForService = (slug: string) => {
	if (slug === "bigquery") return "bigquery";
	if (slug === "pubsub") return "pubsub";
	if (slug === "cloud-storage") return "cloud-storage";
	return "project-integration";
};

export const serviceTestingPages: AgenticContentPage[] = withRelatedLinks(agenticServiceMetadata
	.filter((service) => ["supported", "partial", "release-unverified"].includes(service.status))
	.map((service) => servicePage(service.slug, promptForService(service.slug))));

const githubActionsSnippet = [
	"name: localcloud-integration-tests",
	"on: [pull_request]",
	"jobs:",
	"  test:",
	"    runs-on: ubuntu-latest",
	"    steps:",
	"      - uses: actions/checkout@v4",
	"      - name: Start LocalCloud",
	`        run: |`,
	"          # Public preview permits non-production internal organization and team CI.",
	"          # Pin an image digest when the workflow must be repeatable.",
	...agenticFacts.dockerQuickStart.run.split("\n").map((line) => (line ? `          ${line}` : "")),
	`          for i in $(seq 1 60); do ${agenticFacts.dockerQuickStart.readiness} && exit 0; sleep 2; done`,
	"          docker logs localcloud",
	"          exit 1",
	"      - name: Export emulator env and test",
	"        run: |",
	`          ${agenticFacts.dockerQuickStart.environment}`,
	"          ./scripts/integration-test.sh",
].join("\n");

export const workflowPages: AgenticContentPage[] = withRelatedLinks([
	{
		kind: "workflow",
		slug: "github-actions-gcp-emulator",
		path: "/workflows/github-actions-gcp-emulator/",
		parentLabel: "Workflows",
		parentPath: "/workflows/",
		eyebrow: "GitHub Actions",
		title: "GitHub Actions GCP Emulator with LocalCloud",
		description:
			"Run LocalCloud in a GitHub Actions workflow with readiness checks, pinned image identity, and localhost SDK endpoints.",
		h1: "LocalCloud in GitHub Actions",
		deck:
			"The Public Preview License permits individuals and organizations, including for-profit companies, to run ongoing internal CI without payment or a license key.",
		promptIds: ["ci", "quickstart"],
		quickFacts: [
			"No GCP secrets are required for the local job.",
			`Readiness gate: ${agenticFacts.readinessEndpoint}.`,
			"Keep the workflow non-production and review the proprietary Public Preview License.",
		],
		sections: [
			{
				kicker: "Eligible automation shape",
				title: "Health before tests",
				body:
					"The workflow should fail fast if LocalCloud is not healthy. Do not let tests silently fall back to production SDK endpoints.",
			},
			{
				kicker: "Secrets boundary",
				title: "Keep local jobs credentialless",
				body:
					"A LocalCloud PR job should not need service-account JSON, workload identity, or a billing project. If a later deployment job needs them, keep it separate and guarded.",
			},
		],
		snippets: [
			{
				label: "GitHub Actions YAML",
				language: "yaml",
				code: githubActionsSnippet,
			},
		],
		limitations: [],
		internalLinks: [
			{
				label: "Terraform docs",
				href: "/docs/terraform/",
				note: "Endpoint override patterns for IaC.",
			},
			relatedLink("/workflows/integration-tests/", "How to structure localhost verification."),
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "workflow",
		slug: "terraform-gcp-emulator",
		path: "/workflows/terraform-gcp-emulator/",
		parentLabel: "Workflows",
		parentPath: "/workflows/",
		eyebrow: "Terraform",
		title: "Terraform GCP Emulator Workflow with LocalCloud",
		description:
			"Validate Terraform against LocalCloud GCP emulator endpoints before production, without default GCP credentials or cloud billing.",
		h1: "Terraform GCP emulator workflow",
		deck:
			"LocalCloud can provide local endpoint overrides for Terraform validation. Use it to catch resource wiring mistakes before a real Google Cloud plan or apply.",
		promptIds: ["ci", "project-integration"],
		quickFacts: [
			"Use the Terraform env export endpoint.",
			"Keep real provider credentials out of local validation.",
			"Run real GCP plan/apply only as a separate production gate.",
		],
		sections: [
			{
				kicker: "Endpoint export",
				title: "Generate local provider overrides",
				body:
					"Use the LocalCloud Terraform export endpoint to set local service endpoints. Keep those overrides scoped to the local shell or CI job that runs the validation.",
			},
			{
				kicker: "Agent instruction",
				title: "Ask for the smallest plan first",
				body:
					"Have the agent identify used Google provider resources, export LocalCloud endpoints, and run the narrowest local Terraform validation before proposing broader IaC changes.",
			},
		],
		snippets: [
			{
				label: "Terraform local setup",
				language: "bash",
				code: [
					agenticFacts.terraformEnvCommand,
					'export GOOGLE_APPLICATION_CREDENTIALS="$PWD/.localcloud/fake-service-account.json"',
					"curl -fsS http://localhost:5380/terraform/readiness?mode=endpoint",
					"terraform init",
					"terraform plan",
				].join("\n"),
			},
		],
		limitations: [
			"Terraform provider behavior that depends on IAM, org policy, quotas, or regional managed services still needs real Google Cloud validation.",
		],
		internalLinks: [
			{
				label: "Terraform docs",
				href: "/docs/terraform/",
				note: "LocalCloud Terraform setup details.",
			},
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "workflow",
		slug: "integration-tests",
		path: "/workflows/integration-tests/",
		parentLabel: "Workflows",
		parentPath: "/workflows/",
		eyebrow: "Integration tests",
		title: "GCP Integration Tests with LocalCloud",
		description:
			"Run agent-written GCP integration tests locally with LocalCloud, SDK environment variables, deterministic seed data, and a real-GCP release check.",
		h1: "Local GCP integration tests for agents",
		deck:
			"Agent-written integration tests are safer when they run against disposable localhost services first. LocalCloud gives those tests BigQuery, Pub/Sub, Cloud Storage, Spanner, Bigtable, and more in one container.",
		promptIds: ["project-integration", "quickstart", "troubleshoot"],
		quickFacts: [
			"Use real SDK clients; avoid mocks for service behavior.",
			"Seed fixtures locally for repeatable runs.",
			"Unset emulator env vars before production validation.",
		],
		sections: [
			{
				kicker: "Test design",
				title: "Exercise behavior that can actually break",
				body:
					"Use LocalCloud for SDK routing, serialization, resource naming, query syntax, event flow, and setup/teardown behavior. Keep pure unit tests for business logic.",
			},
			{
				kicker: "State control",
				title: "Reset or seed local state deliberately",
				body:
					"Agents should create the minimum data they need or load seed fixtures. Avoid depending on a previous local run.",
			},
		],
		snippets: [
			{
				label: "Local test wrapper",
				language: "bash",
				code: [
					"set -euo pipefail",
					agenticFacts.envExportCommand,
					"export GOOGLE_CLOUD_PROJECT=local-gcp-project",
					"./scripts/integration-test.sh",
				].join("\n"),
			},
		],
		limitations: [],
		internalLinks: [
			{
				label: "SDK examples",
				href: "/docs/sdk-examples/",
				note: "Language-specific SDK routing examples.",
			},
			{
				label: "Seed data",
				href: "/docs/seed-data/",
				note: "Repeatable fixture loading.",
			},
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "workflow",
		slug: "agentic-ci",
		path: "/workflows/agentic-ci/",
		parentLabel: "Workflows",
		parentPath: "/workflows/",
		eyebrow: "Internal automation",
		title: "Team Automation with LocalCloud",
		description:
			"Have coding agents prepare a non-production LocalCloud automation workflow with health gates and local endpoints.",
		h1: "LocalCloud automation for internal projects",
		deck:
			"The Public Preview License permits organization and team CI for non-production development and testing. Keep Docker, localhost endpoints, no Google Cloud credentials, and a visible readiness check.",
		promptIds: ["ci", "troubleshoot", "project-integration"],
		quickFacts: [
			"Agents must keep automation inside the Public Preview License boundary.",
			"Automation jobs must print active emulator endpoints before tests.",
			"Real GCP validation is a separate release gate.",
		],
		sections: [
			{
				kicker: "Reviewable diff",
				title: "Keep the first automation change small",
				body:
					"Start container, wait for health, export env, run existing integration tests. Avoid unrelated retries, deployment logic, or credential setup in the first agentic CI change.",
			},
			{
				kicker: "Failure mode",
				title: "Fail closed on routing mistakes",
				body:
					"If env vars are missing or LocalCloud is unhealthy, fail the job rather than silently using production defaults.",
			},
		],
		snippets: [
			{
				label: "Public preview automation instruction",
				language: "text",
				code:
					"Read the LocalCloud Public Preview License and keep this workflow non-production. Prepare the smallest automation change that starts LocalCloud, waits for http://localhost:5380/readiness, exports emulator env vars, runs existing integration tests, and does not add real GCP secrets.",
			},
			{
				label: "Reusable health gate",
				language: "bash",
				code:
					"for i in $(seq 1 60); do\n  if curl -fsS http://localhost:5380/readiness; then exit 0; fi\n  sleep 2\ndone\nexit 1",
			},
		],
		limitations: [],
		internalLinks: [
			relatedLink("/workflows/github-actions-gcp-emulator/", "Concrete YAML starting point."),
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
]);

export const comparisonPages: AgenticContentPage[] = withRelatedLinks([
	{
		kind: "comparison",
		slug: "google-emulators",
		path: "/compare/google-emulators/",
		parentLabel: "Compare",
		parentPath: "/compare/",
		eyebrow: "Comparison",
		title: "LocalCloud vs Google Cloud Emulators for Agents",
		description:
			"Compare LocalCloud with Google's official emulators for agent workflows on local Google Cloud, with sources and the cases where Google's emulators fit better.",
		h1: "LocalCloud vs Google emulators for agents",
		deck:
			"Google official emulators are the best source when your target service has one and you want the closest Google-maintained local surface. LocalCloud is the broader agent runtime when one workflow needs many GCP-like services, shared health, seed data, and one container.",
		promptIds: ["quickstart", "project-integration"],
		quickFacts: [
			"Google gcloud emulators include service-specific emulator groups.",
			`LocalCloud runs ${availableServiceCount} local services in one Docker image; Firestore is opt-in, and each service documents its local boundaries.`,
			"Neither path removes the need for real-GCP validation before production.",
		],
		sections: [
			{
				kicker: "Where Google is better",
				title: "Use official emulators for service-specific fidelity",
				body:
					"If a single supported official emulator covers your exact service and feature set, it may be the right lowest-risk local dependency.",
			},
			{
				kicker: "Where LocalCloud is better",
				title: "Use LocalCloud for multi-service agent workflows",
				body:
					"Agents benefit from one start command, one health check, unified env export, and a service catalog that includes services without official Google emulators such as BigQuery and Cloud Storage.",
			},
		],
		table: {
			columns: ["Decision point", "Google emulators", "LocalCloud"],
			rows: [
				[
					"Scope",
					"Individual emulator groups managed through gcloud or service-specific images.",
			"A catalog of operation-specific guides through one LocalCloud runtime entry point.",
				],
				[
					"Agent setup",
					"Per-service install, command, ports, and env init.",
					"One Docker image, health endpoint, and shell env export.",
				],
				[
					"Best fit",
					"Single-service fidelity where Google ships an emulator.",
					"Multi-service testing, demos, and agent discovery. Individuals and companies can use it free of charge for non-production work during the public preview.",
				],
			],
		},
		limitations: [],
		internalLinks: [
			relatedLink("/gcp-emulator/", "LocalCloud positioning against fragmented GCP local development."),
			{
				label: "Compatibility",
				href: "/compatibility/",
				note: "Current LocalCloud service boundaries.",
			},
		],
		sources: [
			{
				label: "gcloud beta emulators reference",
				href: "https://docs.cloud.google.com/sdk/gcloud/reference/beta/emulators",
				note: "Google emulator command groups.",
			},
			relatedLink("/docs/localcloud-vs-google-emulators/"),
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "comparison",
		slug: "e2b-vercel-sandboxes",
		path: "/compare/e2b-vercel-sandboxes/",
		parentLabel: "Compare",
		parentPath: "/compare/",
		eyebrow: "Comparison",
		title: "LocalCloud vs E2B and Hosted Sandboxes for GCP Agents",
		description:
			"Compare LocalCloud with hosted code sandboxes such as E2B for agent workflows: where each one fits, and why many agent setups use both.",
		h1: "LocalCloud vs hosted agent sandboxes",
		deck:
			"E2B and Vercel Sandbox isolate arbitrary code execution for agents. LocalCloud replaces Google Cloud API calls with localhost emulators for the non-production work its license permits. The products address different boundaries.",
		promptIds: ["quickstart", "project-integration"],
		quickFacts: [
			"E2B and Vercel focus on isolated code execution environments.",
			"LocalCloud focuses on local Google Cloud APIs and SDK endpoints.",
			"A hosted sandbox may still need LocalCloud or real GCP to exercise GCP-specific behavior.",
		],
		sections: [
			{
				kicker: "Where hosted sandboxes are better",
				title: "Use E2B or Vercel when the risk is arbitrary code execution",
				body:
					"If the primary problem is running untrusted generated code away from your workstation or production systems, hosted sandboxes are purpose-built for that execution boundary.",
			},
			{
				kicker: "Where LocalCloud is better",
				title: "Use LocalCloud when the risk is accidental cloud side effects",
				body:
					"If the agent is writing BigQuery, Pub/Sub, Storage, or Terraform code, LocalCloud gives the code a local GCP-like API target with no default cloud account or billing project.",
			},
		],
		table: {
			columns: ["Need", "Hosted code sandbox", "LocalCloud"],
			rows: [
				[
					"Run arbitrary generated code",
					"Primary use case.",
					"Not the isolation layer for arbitrary shell risk.",
				],
				[
					"Exercise GCP SDK calls",
					"Needs external target or real cloud.",
					"Primary use case through localhost endpoints.",
				],
				[
					"Avoid GCP credentials by default",
					"Depends on what the sandboxed code calls.",
					"Default LocalCloud workflows need no GCP credentials.",
				],
			],
		},
		limitations: [
			"LocalCloud does not replace a hosted code-execution sandbox for untrusted shell workloads.",
		],
		internalLinks: [
			{
				label: "Agent pages",
				href: "/agents/",
				note: "Use LocalCloud with terminal and IDE agents.",
			},
		],
		sources: [
			{
				label: "E2B documentation",
				href: "https://www.e2b.dev/docs",
				note: "E2B describes isolated sandboxes for agents to execute code.",
			},
			{
				label: "Vercel Sandbox docs",
				href: "https://vercel.com/docs/sandbox",
				note:
					"Vercel describes isolated ephemeral Linux VMs for agent and code workloads.",
			},
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "comparison",
		slug: "bigquery-emulator-alternatives",
		path: "/compare/bigquery-emulator-alternatives/",
		parentLabel: "Compare",
		parentPath: "/compare/",
		eyebrow: "Comparison",
		title: "BigQuery Emulator Alternatives for Agents",
		description:
			"Compare LocalCloud BigQuery with standalone BigQuery emulators and real BigQuery for agent-written pipelines, including when each option fits better.",
		h1: "BigQuery emulator alternatives for agents",
		deck:
			"Agents writing BigQuery code need fast SQL feedback without surprise query costs. LocalCloud includes a BigQuery surface inside a broader GCP emulator runtime; standalone emulators and real BigQuery can be better depending on fidelity, scope, and deployment risk.",
		promptIds: ["bigquery", "project-integration"],
		quickFacts: [
			"LocalCloud BigQuery runs beside Pub/Sub, Storage, Spanner, and other available services.",
			"Single-service community emulators focus on BigQuery alone; their coverage and fidelity vary by project.",
			"Real BigQuery remains the source of truth for production behavior.",
		],
		sections: [
			{
				kicker: "Where standalone is better",
				title: "Choose a focused emulator for narrow BigQuery-only testing",
				body:
					"If your workflow only needs a BigQuery-compatible server, a single-service community emulator can be simpler to run. Check its coverage for the queries you depend on.",
			},
			{
				kicker: "Where LocalCloud is better",
				title: "Choose LocalCloud for agent-written pipelines across services",
				body:
					"Agent workflows often pair BigQuery with Pub/Sub events, Cloud Storage objects, seed data, Terraform, and health checks. LocalCloud keeps those pieces in one runtime.",
			},
			{
				kicker: "Where real BigQuery is better",
				title: "Use real BigQuery for production-critical semantics",
				body:
					"Use real BigQuery for billing, IAM, slots, reservations, full GoogleSQL edge cases, performance, geographic behavior, and final release validation.",
			},
		],
		table: {
			columns: ["Option", "Best for", "Caveat"],
			rows: [
				[
					"LocalCloud BigQuery",
					"Multi-service local Google Cloud workflows, free of charge for individuals and companies during the public preview.",
					"Coverage is documented feature by feature; validate release behavior in real BigQuery.",
				],
				[
					"Single-service community emulators",
					"A focused BigQuery-compatible local server.",
					"A separate runtime from the rest of the GCP workflow; coverage varies by project.",
				],
				[
					"Real BigQuery",
					"Production fidelity and managed features.",
					"Requires credentials, project setup, quotas, and billable usage.",
				],
			],
		},
		limitations: [
			"LocalCloud does not claim full BigQuery production parity.",
			"Unsupported areas include BQML, AEAD encryption functions, security policy enforcement, and full GEOGRAPHY parity.",
		],
		internalLinks: [
			relatedLink(agentTestingPath("bigquery"), "Agent quickstart and caveats."),
			relatedLink("/bigquery-emulator/"),
		],
		sources: [
			relatedLink("/docs/bigquery-emulator-features/", "LocalCloud tested coverage."),
			relatedLink("/docs/bigquery-feature-comparison/"),
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "comparison",
		slug: "localstack",
		path: "/compare/localstack/",
		parentLabel: "Compare",
		parentPath: "/compare/",
		eyebrow: "Comparison",
		title: "LocalCloud vs LocalStack for Local Cloud Development",
		description:
			"LocalStack emulates AWS; LocalCloud emulates Google Cloud. Compare them for local development and AI agent sandboxes, including when LocalStack fits better.",
		h1: "LocalCloud vs LocalStack",
		deck:
			"LocalStack is a mature local cloud development platform for AWS. LocalCloud is a local Google Cloud runtime. They solve the same shape of problem for different clouds, so the choice usually follows the cloud your application already targets rather than a feature score.",
		promptIds: ["quickstart", "project-integration"],
		quickFacts: [
			`LocalStack targets AWS service APIs (and Snowflake); LocalCloud targets Google Cloud service APIs. LocalStack had no Google Cloud services as of ${alternativesReviewedLabel}.`,
			`LocalCloud runs ${availableServiceCount} local services in one Docker image.`,
			"The two are not interchangeable: AWS SDK calls do not reach LocalCloud, and Google Cloud SDK calls do not reach LocalStack.",
		],
		sections: [
			{
				kicker: "Where LocalStack is better",
				title: "Use LocalStack when your application targets AWS",
				body:
					"If the code under test calls S3, DynamoDB, Lambda, SQS, or any other AWS API, LocalStack is the correct tool and LocalCloud cannot substitute for it. LocalStack is also the more established project, with a longer public track record, a larger community, and a wider published integration surface. Teams that need a local AWS surface should choose LocalStack.",
			},
			{
				kicker: "Where LocalCloud is better",
				title: "Use LocalCloud when your application targets Google Cloud",
				body:
					"If the code under test calls BigQuery, Pub/Sub, Spanner, Bigtable, or Cloud Storage, LocalCloud gives those Google Cloud SDK calls a local endpoint. LocalStack does not emulate Google Cloud APIs, so a GCP-native team cannot use it to exercise BigQuery or Spanner behavior locally.",
			},
			{
				kicker: "Multi-cloud teams",
				title: "Running both is a normal outcome",
				body:
					"Teams that build on both clouds commonly run LocalStack for the AWS half of a system and LocalCloud for the Google Cloud half. The two runtimes bind different local ports and set different SDK environment variables, so they can run side by side in the same development environment or automation job.",
			},
		],
		table: {
			columns: ["Decision point", "LocalStack", "LocalCloud"],
			rows: [
				[
					"Cloud emulated",
					"Amazon Web Services, plus a separate Snowflake product.",
					"Google Cloud.",
				],
				[
					"SDK routing",
					"AWS SDK endpoint overrides.",
					"Google Cloud SDK emulator environment variables and endpoint overrides.",
				],
				[
					"Pick it when",
					"Your application calls AWS APIs, or you need the most established local cloud project.",
					"Your application calls Google Cloud APIs and needs BigQuery, Spanner, or Bigtable locally.",
				],
				[
					"Agent sandbox use",
					"Gives agent-written AWS code a local target.",
					"Gives agent-written Google Cloud code a local target with no default credentials or billing project.",
				],
				[
					"Licensing",
					"Proprietary plans. Since March 23, 2026, current releases need a LocalStack account and auth token, including in CI.",
					"Proprietary LocalCloud Public Preview License.",
				],
				[
					"Cost and sign-up",
					`A free Hobby plan covers non-commercial use; commercial use needs a paid plan (as of ${alternativesReviewedLabel}).`,
					"Free during the public preview, with no account or license key; open-source projects stay free after it.",
				],
			],
		},
		limitations: [],
		internalLinks: [
			relatedLink("/localstack-for-google-cloud/"),
			relatedLink("/local-cloud-for-ai-agents/"),
			{
				label: "Compatibility",
				href: "/compatibility/",
				note: "Current LocalCloud service boundaries.",
			},
		],
		sources: [
			{
				label: "LocalStack",
				href: "https://www.localstack.cloud/",
				note: "Vendor description of the AWS local cloud development platform.",
			},
			{
				label: "LocalStack pricing",
				href: "https://www.localstack.cloud/pricing",
				note: `Plans, the non-commercial Hobby plan, and covered products (AWS and Snowflake), reviewed ${alternativesReviewedLabel}.`,
			},
			{
				label: "LocalStack single-image announcement",
				href: "https://blog.localstack.cloud/localstack-single-image-next-steps/",
				note: "Account and auth token required for current releases from March 23, 2026.",
			},
			{
				label: "Full comparison table",
				href: "/compare/",
				note: "LocalCloud, LocalStack, Google's emulators and community emulators, with sources.",
			},
			{
				label: "LocalCloud compatibility",
				href: "/compatibility/",
				note: "LocalCloud operation-level status.",
			},
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
]);

// Emulator head terms belong to the service and /gcp-emulator/ pages; their glossary
// entries answer the definition question instead.
const glossaryTitles: Record<string, string> = {
	"gcp-emulator": "What Is a GCP Emulator?",
	"bigquery-emulator": "What Is a BigQuery Emulator?",
	"service-emulator": "What Is a Service Emulator?",
	"cloud-emulator": "What Is a Cloud Emulator?",
};
// Search snippets for definitions that run past 160 characters or open with a
// sentence too short to stand alone.
const glossarySummaries: Record<string, string> = {
	"mcp-server":
		"A Model Context Protocol (MCP) server exposes tools, resources, and prompts to AI agent clients through a structured protocol, as LocalCloud does at /mcp.",
	"credentialless-cloud-development":
		"A development pattern where cloud SDK calls run against localhost services, with no access to cloud accounts, service-account keys, or billing projects.",
	"credentialless-agent-testing":
		"Running an AI agent's generated code against local endpoints with no cloud credentials or billing project, so a mistake can't create cloud resources or charges.",
	"agent-sandbox-vs-cloud-emulator":
		"An agent sandbox isolates where generated code runs; a cloud emulator replaces what that code talks to. Most agent setups that handle cloud code want both.",
};
const firstSentence = (text: string) => text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;

const glossary = (
	slug: string,
	term: string,
	definition: string,
	items: string[] = [],
	links: ContentLink[] = [],
): AgenticContentPage => ({
	kind: "glossary",
	slug,
	path: `/glossary/${slug}/`,
	parentLabel: "Glossary",
	parentPath: "/glossary/",
	eyebrow: "Glossary",
	title: `${glossaryTitles[slug] ?? term} — LocalCloud Glossary`,
	description: glossarySummaries[slug] ?? (definition.length <= 160 ? definition : firstSentence(definition)),
	h1: term,
	// Reference layout: the definition is the lede, then how the term applies in
	// LocalCloud, then related pages. No repeated fact cards.
	deck: definition,
	promptIds: ["quickstart"],
	quickFacts: [],
	sections: items.length ? [{ kicker: "In LocalCloud", title: `${term} with LocalCloud`, items }] : [],
	limitations: [],
	internalLinks: [
		...links,
		{
			label: "Agent setup guides",
			href: "/agents/",
			note: "Run coding agents against LocalCloud.",
		},
	],
	reviewedAt: agenticFacts.evidence.reviewedAt,
});

export const glossaryPages: AgenticContentPage[] = withRelatedLinks([
	glossary(
		"gcp-emulator",
		"GCP emulator",
		"A local implementation of a Google Cloud service API used for development and testing before code touches real Google Cloud.",
		[
			"Can be official, third-party, custom, or a local facade.",
			"Usually requires SDK endpoint overrides.",
		],
	),
	glossary(
		"ai-agent-sandbox",
		"AI agent sandbox",
		"A constrained environment where an AI coding agent can run commands, write code, and verify behavior without causing unwanted external side effects.",
		[
			"LocalCloud is a GCP API sandbox, not a universal shell sandbox.",
			"Hosted sandboxes and LocalCloud can be complementary.",
		],
	),
	glossary(
		"mcp-server",
		"MCP server",
		"A Model Context Protocol server exposes tools, resources, or prompts that agent clients can call through a structured protocol instead of ad-hoc shell instructions.",
		[
			"LocalCloud exposes its runtime-owned MCP server at the canonical /mcp endpoint.",
			"Use the localcloud mcp stdio bridge when an MCP client cannot connect with Streamable HTTP.",
		],
		[
			relatedLink("/ai/", "Runtime endpoints, agent rules, and the AGENTS.md template."),
		],
	),
	glossary(
		"agentic-ci",
		"Agentic CI",
		"A CI workflow where an AI agent helps create or maintain validation steps, while the actual job remains deterministic, reviewable, and bounded.",
		[
			"LocalCloud jobs should fail closed on missing health or env vars.",
			"Do not mix local emulator checks with deployment secrets.",
		],
	),
	glossary(
		"credentialless-cloud-development",
		"Credentialless cloud development",
		"A local-development pattern where cloud-shaped SDK calls run against localhost services without default access to cloud accounts, service-account keys, or billing projects.",
		[
			"Useful for inner-loop tests and demos.",
			"Not a replacement for production authorization tests.",
		],
	),
	glossary(
		"bigquery-emulator",
		"BigQuery emulator",
		"A local BigQuery-compatible API and SQL runtime used to test datasets, tables, queries, and ingestion paths before validating in real BigQuery.",
		[
			"Coverage varies by emulator.",
			"Use real BigQuery for full production semantics.",
		],
	),
	glossary(
		"service-emulator",
		"Service emulator",
		"A local process that implements enough of a managed service API for development and integration testing workflows.",
		[
			"Emulators trade managed-cloud behavior for speed and safety.",
			"Document supported and unsupported calls.",
		],
	),
	glossary(
		"localhost-cloud-api",
		"Localhost cloud API",
		"A cloud SDK endpoint override that sends service calls to a local process such as LocalCloud instead of a public cloud endpoint.",
		[
			"Environment variables are the usual routing mechanism.",
			"Unset overrides before real-cloud validation.",
		],
	),
	glossary(
		"agent-environment",
		"Agent environment",
		"The set of runtimes, tools, files, and network endpoints an AI coding agent can reach while it works on a task. It covers both where the agent executes code and what that code is allowed to call.",
		[
			"An agent environment has two halves: an execution boundary and a dependency boundary.",
			"Code sandboxes such as E2B or Docker sandboxes provide the execution boundary.",
			"LocalCloud provides a Google Cloud dependency boundary so agent-written cloud calls resolve to localhost.",
		],
		[
			relatedLink("/local-cloud-for-ai-agents/", "How the two boundaries fit together."),
		],
	),
	glossary(
		"agent-sandbox-vs-cloud-emulator",
		"Agent sandbox vs cloud emulator",
		"Two different controls that are often confused. An agent sandbox isolates where generated code runs. A cloud emulator replaces what that code talks to. Using one does not give you the other.",
		[
			"A sandbox with real cloud credentials can still create real cloud resources and real charges.",
			"An emulator without a sandbox still lets generated shell commands touch the host.",
			"Most agent setups that handle cloud code want both controls in place.",
		],
		[
			{
				label: "LocalCloud vs hosted agent sandboxes",
				href: "/compare/e2b-vercel-sandboxes/",
				note: "Where each boundary applies.",
			},
		],
	),
	glossary(
		"credentialless-agent-testing",
		"Credentialless agent testing",
		"Running an AI agent's generated code against local service endpoints without providing cloud credentials, service-account keys, or a billing project, so a mistake cannot create cloud resources or charges.",
		[
			"Removes the blast radius of an agent calling a destructive cloud API.",
			"Does not remove the need to validate the same code against real Google Cloud before release.",
			"Keep local automation credentialless and put real-cloud validation in a separate guarded step.",
		],
	),
	glossary(
		"local-cloud-api-surface",
		"Local cloud API surface",
		"The set of cloud service endpoints, protocols, and operations a local runtime actually implements. It is the practical definition of what you can test locally, and it is narrower than the managed cloud it imitates.",
		[
			"Measure a local runtime by its operation-level surface, not by a service count.",
			"LocalCloud publishes per-operation status on each service page and the compatibility matrix.",
			"Unimplemented operations should fail loudly rather than silently reaching real Google Cloud.",
		],
		[
			{
				label: "Compatibility matrix",
				href: "/compatibility/",
				note: "Per-operation LocalCloud status.",
			},
		],
	),
	glossary(
		"sandboxed-cloud-sdk",
		"Sandboxed cloud SDK",
		"A standard cloud client library configured so its requests resolve to a local emulator instead of the public cloud endpoint, without changing application code.",
		[
			"Routing is normally done with emulator environment variables loaded into the process.",
			"Some clients ignore those variables and need explicit endpoint configuration.",
			"Confirm the client is not silently falling back to real Google Cloud before trusting a local result.",
		],
		[
			{
				label: "SDK examples",
				href: "/docs/sdk-examples/",
				note: "Routing standard Google Cloud clients at LocalCloud.",
			},
		],
	),
	glossary(
		"cloud-emulator",
		"Cloud emulator",
		"A local program that implements a cloud provider's service APIs so application code can be developed and tested without calling the managed cloud. Distinct from a cloud-hosted device emulator, which runs a mobile operating system on remote hardware.",
		[
			"In this documentation, cloud emulator always means an emulator of cloud service APIs.",
			"Emulators trade managed-cloud fidelity for speed, isolation, and zero cloud cost.",
			"Every emulator has documented gaps; production behavior is validated against the real provider.",
		],
		[
			relatedLink("/docs/what-is-gcp-emulator/", "Longer explanation with endpoint routing."),
		],
	),
]);

export const blogDemoPages: AgenticContentPage[] = withRelatedLinks([
	{
		kind: "blog",
		slug: "claude-code-local-gcp-sandbox",
		path: "/blog/claude-code-local-gcp-sandbox/",
		parentLabel: "Blog",
		parentPath: "/blog/",
		eyebrow: "Demo post",
		title: "Claude Code Local GCP Sandbox Demo",
		description:
			"A practical Claude Code workflow for starting LocalCloud, routing Google Cloud SDKs to localhost, and validating agent-written code before real GCP.",
		h1: "Claude Code local GCP sandbox demo",
		deck:
			"The fastest safe demo is not a mock. Let Claude Code start LocalCloud, route SDKs to localhost, write one small integration check, and explain what still needs real Google Cloud validation.",
		promptIds: ["quickstart", "project-integration"],
		quickFacts: [
			"Demo target: one repo, one local service check, one production caveat.",
			"Avoid credentials in the prompt and commands.",
			"Link the next step to service-specific local testing pages.",
		],
		sections: [
			{
				kicker: "Demo flow",
				title: "Ask, start, route, test",
				body:
					"Claude reads /ai/agents.md, starts LocalCloud, exports env vars, creates a tiny local resource, and proves the project SDK talks to localhost.",
			},
			{
				kicker: "Why it works",
				title: "The agent gets a real API shape without a real bill",
				body:
					"LocalCloud keeps the SDK and API shape familiar while removing default cloud credentials and billing from the inner loop.",
			},
		],
		snippets: [
			{
				label: "Demo prompt",
				language: "text",
				code:
					"Claude, use LocalCloud to run a local GCP smoke test for this repository. Do not request GCP credentials. Show the LocalCloud health check, active emulator env vars, and one SDK operation against localhost.",
			},
		],
		limitations: [],
		internalLinks: [
			relatedLink("/agents/claude-code-gcp-sandbox/"),
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "blog",
		slug: "google-emulators-vs-localcloud-for-agents",
		path: "/blog/google-emulators-vs-localcloud-for-agents/",
		parentLabel: "Blog",
		parentPath: "/blog/",
		eyebrow: "Demo post",
		title: "Google Emulators vs LocalCloud for Agents",
		description:
			"How to decide between official Google emulators and LocalCloud when AI agents need local GCP validation.",
		h1: "Google emulators vs LocalCloud for agents",
		deck:
			"Official Google emulators are valuable; the agentic question is whether one emulator is enough. For a non-production repository spanning BigQuery, Pub/Sub, Storage, and Terraform, one LocalCloud runtime can be easier for an agent to operate safely.",
		promptIds: ["project-integration", "ci"],
		quickFacts: [
			"Use official emulators for single-service fidelity when they fit.",
			"Use LocalCloud for multi-service local-cloud workflows.",
			"Validate production behavior against real GCP either way.",
		],
		sections: [
			{
				kicker: "Decision point",
				title: "Count the workflow, not just the services",
				body:
					"An agent does not only need an API. It needs startup, health, env export, seed data, logs, docs, and a clear failure boundary. LocalCloud packages that operating surface.",
			},
			{
				kicker: "Balanced take",
				title: "Where Google remains the right answer",
				body:
					"If the exact Google-maintained emulator covers your target behavior, start there. LocalCloud is strongest when the agent needs a broader local GCP environment.",
			},
		],
		snippets: [
			{
				label: "Comparison prompt",
				language: "text",
				code:
					"Compare this repository's GCP usage with LocalCloud service coverage and Google official emulator availability. Recommend the smallest local validation path and list real-GCP checks that must remain.",
			},
		],
		limitations: [],
		internalLinks: [
			relatedLink("/compare/google-emulators/", "Detailed comparison and sources."),
		],
		sources: [
			{
				label: "gcloud emulator reference",
				href: "https://docs.cloud.google.com/sdk/gcloud/reference/beta/emulators",
				note: "Official Google emulator groups.",
			},
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "blog",
		slug: "bigquery-locally-agent-written-pipelines",
		path: "/blog/bigquery-locally-agent-written-pipelines/",
		parentLabel: "Blog",
		parentPath: "/blog/",
		eyebrow: "Demo post",
		title: "Run Agent-Written BigQuery Pipelines Locally",
		description:
			"Use LocalCloud BigQuery to test agent-written datasets, SQL, and pipeline checks locally before validating in real BigQuery.",
		h1: "BigQuery locally for agent-written pipelines",
		deck:
			"Agents are good at writing SQL quickly. LocalCloud helps them test that SQL quickly, too: create local datasets, load small fixtures, run representative queries, and surface unsupported BigQuery features before a real-cloud run.",
		promptIds: ["bigquery", "project-integration"],
		quickFacts: [
			"Use BIGQUERY_EMULATOR_HOST for local SDK routing.",
			"Test representative query paths, not production scale.",
			"Escalate unsupported SQL and managed features to real BigQuery validation.",
		],
		sections: [
			{
				kicker: "Pipeline loop",
				title: "Fixture, query, assert",
				body:
					"Have the agent seed a tiny dataset, run the query or transformation it just wrote, and assert the result. This is faster and safer than using a shared dev project for every iteration.",
			},
			{
				kicker: "Caveat",
				title: "Local SQL coverage is not a production SLA",
				body:
					"LocalCloud BigQuery is designed for development and testing coverage, not billing, IAM, slots, reservations, or complete GoogleSQL parity.",
			},
		],
		snippets: [
			{
				label: "BigQuery agent prompt",
				language: "text",
				code:
					"Use LocalCloud BigQuery to test this pipeline locally. Set BIGQUERY_EMULATOR_HOST=http://localhost:5388, seed a tiny dataset, run the representative query, assert the expected rows, and list any SQL features that need real BigQuery validation.",
			},
		],
		limitations: [
			"LocalCloud BigQuery does not cover BQML, AEAD encryption functions, security policy enforcement, or full GEOGRAPHY parity.",
		],
		internalLinks: [
			relatedLink(agentTestingPath("bigquery"), "SDK/env quickstart and compatibility table."),
			relatedLink("/compare/bigquery-emulator-alternatives/", "Standalone and real BigQuery tradeoffs."),
		],
		sources: [
			relatedLink("/docs/bigquery-emulator-features/", "LocalCloud tested coverage."),
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
	{
		kind: "blog",
		slug: "run-dataproc-locally-docker",
		path: "/blog/run-dataproc-locally-docker/",
		parentLabel: "Blog",
		parentPath: "/blog/",
		eyebrow: "User guide & demo",
		title: "How to Run Dataproc 3.0 Locally with Docker",
		description:
			"Run Google Dataproc 3.0, Apache Spark 4.1, Hadoop 3.5, and Hive 4.2 locally in Docker. Standalone single-container and 3-node cluster modes for developers and AI agents.",
		h1: "Run Dataproc 3.0 locally in Docker",
		deck:
			"Develop and test Spark, PySpark, and Hive pipelines without spinning up GCP clusters or managing cloud credentials. Run ad-hoc jobs in a single container or launch a full 3-node YARN cluster with Docker Compose.",
		promptIds: ["quickstart", "project-integration"],
		quickFacts: [
			"Apache Spark 4.1.2, Hadoop 3.5.0, and Hive 4.2.0 in one multi-platform image.",
			"100% standalone — zero cloud credentials, billing, or external daemons required.",
			"Supports single-container CLI jobs and a full 3-node YARN cluster via Docker Compose.",
		],
		sections: [
			{
				kicker: "Developer inner loop",
				title: "Instant local feedback without cloud spin-up",
				body:
					"Avoid waiting for cloud cluster provisioning and iterate on PySpark transformations with local feedback and zero cloud cost risk.",
			},
			{
				kicker: "Agent safe sandbox",
				title: "Safe execution boundary for AI coding agents",
				body:
					"Give Claude Code, Cursor, or Gemini CLI a deterministic local Spark environment without granting access to production cloud credentials.",
			},
		],
		snippets: [
			{
				label: "Single container Spark job",
				language: "bash",
				code: "docker run --rm -v $(pwd)/workloads:/workload:ro agentcloud/dataproc:3.0.0-debian13 spark /workload/job.py",
			},
			{
				label: "Interactive PySpark shell",
				language: "bash",
				code: "docker run -it --rm agentcloud/dataproc:3.0.0-debian13 pyspark",
			},
			{
				label: "Run image self-test",
				language: "bash",
				code: "docker run --rm agentcloud/dataproc:3.0.0-debian13 self-test",
			},
		],
		limitations: [
			"Dataproc local containers provide component-level compatibility (Spark, Hadoop, Hive), not GCP Dataproc control plane APIs.",
		],
		internalLinks: [
			relatedLink(agentTestingPath("dataproc"), "Local testing guide for Dataproc jobs."),
			relatedLink("/services/dataproc/", "Supported Dataproc operations and limitations."),
		],
		sources: [
			{
				label: "Dataproc images on Docker Hub",
				href: "https://hub.docker.com/repository/docker/agentcloud/dataproc",
				note: "Public multi-arch OCI images for Dataproc 3.0, 2.3, 2.2, 2.1, and 2.0.",
			},
		],
		reviewedAt: agenticFacts.evidence.reviewedAt,
	},
]);

export const allAgenticContentPages = [
	...agentSandboxPages,
	...serviceTestingPages,
	...workflowPages,
	...comparisonPages,
	...glossaryPages,
	...blogDemoPages,
];
