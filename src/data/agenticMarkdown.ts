import {
	agenticEndpoints,
	agenticFacts,
	agenticServiceMetadata,
	agentDirectRules,
	type AgenticServiceMetadata,
} from "./agenticFacts";
import { docsContract } from "./docs-contract";
import { productFacts } from "./productFacts";
import { serviceCompatibilityEditorial } from "./serviceEditorial";

const quickStart = agenticFacts.cliQuickStart;
const dockerQuickStart = agenticFacts.dockerQuickStart;

const runsLocally = (service: AgenticServiceMetadata) =>
	!["planned", "unsupported", "unknown"].includes(service.status);
const localServices = agenticServiceMetadata.filter(runsLocally);
const unsupportedServices = agenticServiceMetadata.filter((service) => !runsLocally(service));
const optInServices = localServices.filter((service) => !service.registryDefaultEnabled);

const listNames = (names: string[]) =>
	names.length < 3 ? names.join(" and ") : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");
const fence = (code: string) => `\`\`\`bash\n${code}\n\`\`\``;

const quickStartNotes = bullets([
	`Homebrew alternative to the first line: \`${quickStart.homebrew}\`.`,
	"Skip the install line when `localcloud --version` already works. If the installer prints a `source` command, run it before the next line.",
	`\`localcloud start\` waits for the runtime. The readiness check uses the default gateway port ${docsContract.operator.gatewayPort}; if the CLI remapped it, use the gateway URL from \`localcloud status\`.`,
	"`localcloud console` opens the web console in a browser; skip it in headless sessions.",
]);

const dockerFallback = `Without the CLI (for example on Windows), run the image directly, wait for readiness, and export the environment from the runtime:

${fence(dockerQuickStart.script)}`;

// --services replaces the default set, so the example keeps two default services alongside an opt-in one.
const servicesExample = [
	...optInServices.slice(0, 1),
	...localServices.filter((service) => service.registryDefaultEnabled).slice(0, 2),
]
	.map((service) => service.id)
	.join(",");
const servicesSummary = `${localServices.length} services run locally. ${listNames(optInServices.map((service) => service.name))} are opt-in: \`--services\` sets the exact list of service IDs to run, so include every service the project needs, for example \`localcloud start --local-only --services ${servicesExample}\`. ${listNames(unsupportedServices.map((service) => service.name))} are unsupported locally; use Google Cloud for them.`;

const rules = bullets(agentDirectRules);

const endpointLines = bullets(
	agenticEndpoints.map((endpoint) => `**${endpoint.label}**: \`${endpoint.url}\` — ${endpoint.purpose}`),
);

const workflow = `1. Find the Google Cloud services, SDKs, Terraform providers, and CLI commands the project uses.
2. Start LocalCloud, or reuse the running runtime (\`localcloud status\`).
3. Export the environment: \`${agenticFacts.envExportCommand}\` for shells and SDKs, \`${agenticFacts.terraformEnvCommand}\` for Terraform.
4. Run the narrowest check that proves the service path works through localhost.
5. If a feature is unsupported locally, record the gap and link the service page.`;

export const agentsMdTemplate = `# AGENTS.md — LocalCloud for Google Cloud development

This repository uses LocalCloud for local Google Cloud development and tests. ${agenticFacts.positioning}

## Facts
- ${localServices.length} Google Cloud services run locally; ports, environment variables, and guides: https://local.cloud/ai/services.md
- Default project: \`${agenticFacts.defaultProject}\`. No GCP account, Google credentials, service-account key, or billing project is needed.
- ${docsContract.licensing.summary}

## Start LocalCloud
${fence(quickStart.script)}

${quickStartNotes}

## Workflow
${workflow}

## Rules
${rules}

## References
- Agent guide: https://local.cloud/ai/agents.md
- Capabilities and boundaries per service: https://local.cloud/ai/compatibility.md
- SDK examples: https://local.cloud/docs/sdk-examples/
- Terraform: https://local.cloud/docs/terraform/
- Seed data: https://local.cloud/docs/seed-data/
`;

export const agentsExecutionGuide = `# LocalCloud agent guide

${agenticFacts.positioning}

To give a repository the same instructions, copy https://local.cloud/ai/agent-template.md into it as \`AGENTS.md\`.

## Start LocalCloud
${fence(quickStart.script)}

${quickStartNotes}

### Docker-only hosts
${dockerFallback}

## Rules
${rules}

## Workflow
${workflow}

## Services
${servicesSummary}

- Ports, environment variables, and guides: https://local.cloud/ai/services.md
- Capabilities and boundaries per service: https://local.cloud/ai/compatibility.md

## Endpoints
${endpointLines}

## Links
- Human guide and copyable prompts: https://local.cloud/ai/
- AGENTS.md template: https://local.cloud/ai/agent-template.md
- Markdown resource index: https://local.cloud/ai/resources.md
- Docs: https://local.cloud/docs/
- SDK examples: https://local.cloud/docs/sdk-examples/
- Terraform: https://local.cloud/docs/terraform/
- Seed data: https://local.cloud/docs/seed-data/
- Agent Skills package: ${productFacts.agentSkillsUrl}
- llms.txt: https://local.cloud/llms.txt
`;

export const agentResourceIndexMarkdown = `# LocalCloud agent Markdown resources

The HTML pages on https://local.cloud/ are canonical. These raw Markdown routes give AI agents the same facts in compact form; if a route and an HTML page disagree, follow the HTML page.

## Agent routes
- https://local.cloud/ai/agents.md — agent guide: quick start, rules, and workflow.
- https://local.cloud/ai/agent-template.md — AGENTS.md template for a repository.
- https://local.cloud/ai/services.md — ports, environment variables, and guides for every service.
- https://local.cloud/ai/compatibility.md — capabilities and boundaries per service.
- https://local.cloud/ai/docs.md — docs index and quick start.
- https://local.cloud/llms.txt — site index for language models.
- https://local.cloud/llms-full.txt — the docs and service guides in one file.
- ${productFacts.agentSkillsUrl} — Agent Skills package for project-local \`.agents/skills/\` installs.

## Canonical HTML pages
- https://local.cloud/ai/
- https://local.cloud/services/
- https://local.cloud/compatibility/
- https://local.cloud/docs/
`;

const tableCell = (value: string) => value.replaceAll("|", "\\|");
const serviceRows = localServices
	.map((service) =>
		[
			service.name,
			service.registryDefaultEnabled ? "on" : `opt-in (\`${service.id}\`)`,
			service.endpointLabel,
			`\`${service.envVar}\``,
			`[guide](${service.docsUrl})`,
		]
			.map(tableCell)
			.join(" | "),
	)
	.map((row) => `| ${row} |`)
	.join("\n");

export const agentServicesMarkdown = `# LocalCloud services for agents

${servicesSummary}

Once LocalCloud is running (https://local.cloud/ai/agents.md), \`localcloud env\` exports these values with the ports the CLI actually uses.

| Service | Default | Endpoints | Environment variable | Guide |
| --- | --- | --- | --- | --- |
${serviceRows}

## Unsupported locally
${bullets(unsupportedServices.map((service) => `[${service.name}](${service.docsUrl}) — use Google Cloud.`))}

Capabilities and boundaries per service: https://local.cloud/ai/compatibility.md
`;

const compatibilitySections = agenticServiceMetadata
	.map((service) => {
		const editorial = serviceCompatibilityEditorial[service.id];
		if (!runsLocally(service) || !editorial) {
			return `## ${service.name}\nUnsupported locally; use Google Cloud. Guide: ${service.docsUrl}`;
		}
		return `## ${service.name}\nGuide: ${service.docsUrl}\n\nRuns locally:\n${bullets(editorial.capabilities.map((capability) => capability.summary))}\n\nBoundaries:\n${bullets(editorial.boundaries)}`;
	})
	.join("\n\n");

export const agentCompatibilityMarkdown = `# LocalCloud capabilities and boundaries for agents

What each service runs locally and where its local behavior stops. Check the boundaries before relying on a local result, and follow the rules in https://local.cloud/ai/agents.md. The same lists appear on each service page and on https://local.cloud/compatibility/.

${compatibilitySections}
`;

export const agentDocsMarkdown = `# LocalCloud docs index for agents

Use these raw Markdown routes for compact agent context, then follow the HTML pages for full details.

## Quick start
${fence(quickStart.script)}

${quickStartNotes}

### Docker-only hosts
${dockerFallback}

## Setup and runtime
- https://local.cloud/docs/ — getting started.
- https://local.cloud/docs/configuration/ — services, projects, persistence, and networking.
- https://local.cloud/docs/sdk-examples/ — standard Google Cloud SDK examples configured for localhost.
- https://local.cloud/docs/terraform/ — Terraform endpoint overrides and local validation.
- https://local.cloud/docs/seed-data/ — repeatable local data setup.
- https://local.cloud/docs/console/ — web console for local health and data inspection.

## Agent routes
- https://local.cloud/ai/agents.md — agent guide.
- https://local.cloud/ai/agent-template.md — AGENTS.md template.
- https://local.cloud/ai/services.md — ports, environment variables, and guides.
- https://local.cloud/ai/compatibility.md — capabilities and boundaries per service.
- ${productFacts.agentSkillsUrl} — Agent Skills package.
`;
