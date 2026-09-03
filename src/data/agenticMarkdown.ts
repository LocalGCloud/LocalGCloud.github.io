import {
	agenticEndpoints,
	agenticFacts,
	agenticServiceMetadata,
	agentPromptLibrary,
	agentSafeValidationChecklist,
} from "./agenticFacts";
import { productFacts } from "./productFacts";

const serviceStatusLabel = (
	status: (typeof agenticServiceMetadata)[number]["status"],
) => {
	if (status === "supported") return "Supported locally";
	if (status === "partial") return "Partial local coverage";
	if (status === "release-unverified")
		return "Release-unverified / qualify the assembled image first";
	return "Coming soon";
};

const endpointLines = agenticEndpoints
	.map(
		(endpoint) =>
			`- **${endpoint.label}**: \`${endpoint.url}\` — ${endpoint.purpose}`,
	)
	.join("\n");

const serviceLines = agenticServiceMetadata
	.map((service) =>
		service.status === "planned"
			? `- **${service.name}** (${serviceStatusLabel(service.status)}) — ${service.caveat} Docs: ${service.docsUrl}`
			: `- **${service.name}** (${serviceStatusLabel(service.status)}, ${service.endpointLabel}) — set \`${service.envVar}\`. ${service.caveat} Docs: ${service.docsUrl}`,
	)
	.join("\n");

const promptLines = agentPromptLibrary
	.map(
		(item) =>
			`### ${item.label}\nUse case: ${item.useCase}\n\n\`\`\`text\n${item.prompt}\n\`\`\``,
	)
	.join("\n\n");

const safetyLines = agentSafeValidationChecklist
	.map((item) => `- ${item}`)
	.join("\n");

export const agentsMdTemplate = `# AGENTS.md — LocalCloud GCP emulator instructions

Use this file as repository-local guidance for AI coding agents working on non-production projects permitted by the LocalCloud license.

## LocalCloud facts agents must preserve
- LocalCloud is a local Google Cloud emulator/runtime for development, testing, evaluation, and internal automation.
- The Public Preview License permits individuals and organizations, including for-profit companies, to use LocalCloud for non-production internal development, testing, CI, evaluation, and internal pilots.
- It runs ${productFacts.serviceCountLabel} GCP service surfaces in one Docker container.
- Canonical Docker image: \`${agenticFacts.dockerImage}\`.
- Default local workflows require no GCP account, no Google credentials, no service-account key, and no billing project.
- Standard Google Cloud SDKs and Terraform should point at localhost emulator endpoints before local verification.
- LocalCloud is not a production replacement for Google Cloud. Before production deployment, unset emulator environment variables and validate behavior against real GCP.

## Start or reuse LocalCloud
\`\`\`bash
${agenticFacts.dockerPullCommand}
${agenticFacts.dockerRunCommand}
${agenticFacts.envExportCommand}
\`\`\`

If the \`localcloud\` container already exists, reuse or start it instead of creating a duplicate container.

## Required readiness check
\`\`\`bash
curl -fsS ${agenticFacts.healthEndpoint}
\`\`\`

Do not fall back to real Google Cloud when LocalCloud or Docker is unavailable. Stop and report the blocker.

## Agent workflow
1. Read the project code to identify which GCP services, SDKs, Terraform providers, or CLI commands are used.
2. Start LocalCloud or verify that the existing \`${agenticFacts.containerName}\` container is healthy.
3. Export emulator environment variables from \`${agenticFacts.shellEnvEndpoint}\` for shell/SDK workflows or \`${agenticFacts.terraformEnvEndpoint}\` for Terraform workflows.
4. Run the narrowest local smoke check that proves the relevant service path works through localhost.
5. If a feature is unsupported or partial locally, document the gap and link to https://local.cloud/compatibility/ or the service page.
6. For production readiness, unset emulator variables and validate against real Google Cloud separately.

## Useful LocalCloud URLs
${endpointLines}
- **Service catalog**: https://local.cloud/services/
- **Compatibility and limitations**: https://local.cloud/compatibility/
- **SDK examples**: https://local.cloud/docs/sdk-examples/
- **Terraform guide**: https://local.cloud/docs/terraform/
- **Seed data guide**: https://local.cloud/docs/seed-data/
- **Agent Skills package**: ${productFacts.agentSkillsUrl}

## Service matrix for agents
${serviceLines}

## Safety checklist
${safetyLines}
`;

export const agentsExecutionGuide = `# LocalCloud agent execution guide

${agenticFacts.positioning}

This hosted guide is for coding agents that need a safe local Google Cloud target. For a repository-local policy file, copy the AGENTS.md template from https://local.cloud/ai/AGENTS.md into your project.

## Fast path
\`\`\`bash
${agenticFacts.dockerPullCommand}
${agenticFacts.dockerRunCommand}
${agenticFacts.envExportCommand}
curl -fsS ${agenticFacts.healthEndpoint}
\`\`\`

## Boundaries
- ${agenticFacts.noCredentialBoundary}
- ${agenticFacts.productionBoundary}
- ${agenticFacts.releaseGuardrail}
- If Docker or LocalCloud is unavailable, stop instead of using real GCP as a fallback.

## Machine-readable working set
${endpointLines}

## Service matrix
${serviceLines}

## Copy prompts
${promptLines}

## Safe validation checklist
${safetyLines}

## Human and agent links
- Human landing page: https://local.cloud/ai/
- AGENTS.md template: https://local.cloud/ai/AGENTS.md
- Markdown resource index: https://local.cloud/ai/resources.md
- Service catalog: https://local.cloud/services/
- Compatibility and limitations: https://local.cloud/compatibility/
- Product docs: https://local.cloud/docs/
- SDK examples: https://local.cloud/docs/sdk-examples/
- Terraform guide: https://local.cloud/docs/terraform/
- Seed data guide: https://local.cloud/docs/seed-data/
- Agent Skills package: ${productFacts.agentSkillsUrl}
`;

export const agentResourceIndexMarkdown = `# LocalCloud agent Markdown resources

Canonical policy: human-facing HTML pages remain the canonical product pages. Raw Markdown routes under https://local.cloud/ai/ are published for AI agents that need compact, source-linked operating context. If a Markdown route and an HTML page disagree, treat the shared source data and the linked HTML page as authoritative.

Default LocalCloud agent workflows require no GCP account, no Google credentials, no service-account keys, and no billing project. Use LocalCloud only for workflows permitted by its proprietary license, and validate against real Google Cloud before production.

## Core Markdown routes
- https://local.cloud/ai/agents.md — execution guide for starting LocalCloud safely.
- https://local.cloud/ai/AGENTS.md — downloadable repository-local AGENTS.md template.
- https://local.cloud/ai/resources.md — this index and canonical policy.
- https://local.cloud/ai/services.md — service matrix generated from shared LocalCloud service metadata.
- https://local.cloud/ai/compatibility.md — safety boundaries and validation rules for agents.
- https://local.cloud/ai/docs.md — compact guide to docs, SDK examples, Terraform, and seed data.
- ${productFacts.agentSkillsUrl} — portable Agent Skills package for project-local \`.agents/skills/\` installs.

## Canonical HTML sources
- https://local.cloud/ai/
- https://local.cloud/services/
- https://local.cloud/compatibility/
- https://local.cloud/docs/
- https://local.cloud/docs/sdk-examples/
- https://local.cloud/docs/terraform/
- https://local.cloud/docs/seed-data/
- ${productFacts.agentSkillsUrl}
`;

export const agentServicesMarkdown = `# LocalCloud service matrix for agents

Use this matrix to decide which localhost endpoint an agent should configure before running SDK, CLI, Terraform, or integration checks. Service-specific HTML pages are canonical for human-facing capability detail.

Default LocalCloud agent workflows require no GCP account, no Google credentials, no service-account keys, and no billing project. If a service is partial or planned, stop and document the gap instead of using real Google Cloud as a fallback.

${serviceLines}

## Canonical sources
- https://local.cloud/services/
- https://local.cloud/compatibility/
`;

export const agentCompatibilityMarkdown = `# LocalCloud compatibility boundaries for agents

${agenticFacts.positioning}

## Non-negotiables
- ${agenticFacts.noCredentialBoundary}
- ${agenticFacts.productionBoundary}
- ${agenticFacts.releaseGuardrail}
- If Docker or LocalCloud is unavailable, stop rather than using real Google Cloud as a fallback.

## Agent-safe validation checklist
${safetyLines}

## Canonical sources
- https://local.cloud/compatibility/
- https://local.cloud/services/
- https://local.cloud/docs/sdk-examples/
- https://local.cloud/docs/terraform/
`;

export const agentDocsMarkdown = `# LocalCloud docs index for agents

Use the raw Markdown routes for compact agent context, then follow canonical HTML pages for full details.

## Setup and runtime
- https://local.cloud/docs/ — quick start and docs home.
- https://local.cloud/docs/sdk-examples/ — standard Google Cloud SDK examples configured for localhost.
- https://local.cloud/docs/terraform/ — Terraform endpoint overrides and local validation flow.
- https://local.cloud/docs/seed-data/ — repeatable local data setup.
- https://local.cloud/docs/console/ — web console for local health and data inspection.

## Agent routes
- https://local.cloud/ai/agents.md — execution guide.
- https://local.cloud/ai/AGENTS.md — repository-local template.
- https://local.cloud/ai/services.md — service matrix.
- https://local.cloud/ai/compatibility.md — boundaries and validation rules.
- ${productFacts.agentSkillsUrl} — portable Agent Skills package.

## Quick start
\`\`\`bash
${agenticFacts.dockerPullCommand}
${agenticFacts.dockerRunCommand}
${agenticFacts.envExportCommand}
curl -fsS ${agenticFacts.healthEndpoint}
\`\`\`
`;
