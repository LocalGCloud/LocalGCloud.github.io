import { readFile, writeFile } from "node:fs/promises";
import { cliQuickStart } from "../src/utils/quickstart.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, content) => writeFile(new URL(path, root), content);

let contract;
try {
	contract = JSON.parse(await read("src/data/docs-contract.snapshot.json"));
} catch (error) {
	throw new Error("Distributed docs contract is invalid JSON", {
		cause: error,
	});
}
const editorialSource = await read("src/data/serviceEditorial.ts");
const editorial = new Map(
	[...editorialSource.matchAll(/^ {2}([a-z0-9]+): \{(.+)\},$/gm)].map(
		(match) => {
			const id = match[1];
			const body = match[2];
			const slug = body.match(/slug: '([^']+)'/)?.[1];
			if (!slug) throw new Error(`Missing editorial slug for ${id}`);
			return [id, { slug }];
		},
	),
);
if (contract.services.length !== 27 || editorial.size !== 27) {
	throw new Error(
		`Distributed docs require 27 contract services and overlays; found ${contract.services.length}/${editorial.size}`,
	);
}

const statusMap = {
	verified: "supported",
	partial: "supported",
	"release-unverified": "supported",
	unsupported: "unsupported",
	unknown: "unknown",
};
const protocolLabels = {
	rest: "HTTP/REST",
	grpc: "gRPC",
	redis: "RESP",
	postgres: "PostgreSQL",
	mysql: "MySQL",
	k3d: "k3d",
};
const endpointLabel = (service) =>
	[
		`${protocolLabels[service.protocol] ?? service.protocol} :${service.port}`,
		...Object.entries(service.additionalPorts).map(
			([protocol, port]) => `${protocolLabels[protocol] ?? protocol} :${port}`,
		),
	].join(" · ");
const site = contract.product.siteUrl;
const services = contract.services.map((service) => {
	const overlay = editorial.get(service.id);
	if (!overlay) throw new Error(`Missing editorial overlay for ${service.id}`);
	const available = service.availability === "available";
	if (available && !(service.status in statusMap)) throw new Error(`Unmapped status ${service.status} for ${service.id}`);
	return {
		id: service.id,
		name: service.name,
		supported: available && statusMap[service.status] === "supported",
		defaultEnabled: service.registryDefaultEnabled,
		endpointLabel: endpointLabel(service),
		envVar: `${service.envVar}=${service.envValue}`,
		guideUrl: `${site}services/${overlay.slug}/`,
	};
});
const localServices = services.filter((service) => service.supported);
const optInServices = localServices.filter((service) => !service.defaultEnabled);
const unsupportedServices = services.filter((service) => !service.supported);
const byId = (id) => {
	const service = localServices.find((candidate) => candidate.id === id);
	if (!service) throw new Error(`llms.txt highlights ${id}, which does not run locally`);
	return service;
};

const listNames = (names) =>
	names.length < 3 ? names.join(" and ") : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
const tableCell = (value) => String(value).replaceAll("|", "\\|");
const gateway = `http://localhost:${contract.operator.gatewayPort}`;
const quickStart = cliQuickStart(contract);
// --services replaces the default set, so the example keeps two default services alongside an opt-in one.
const servicesExample = [...optInServices.slice(0, 1), ...localServices.filter((service) => service.defaultEnabled).slice(0, 2)]
	.map((service) => service.id)
	.join(",");
const excludedUses = contract.licensing.excludedUse;
const excludedUseList = `${excludedUses.slice(0, -1).join("; ")}; and ${excludedUses.at(-1)}`;
const highlighted = ["bigquery", "gcs", "pubsub", "spanner", "bigtable", "firestore", "cloudsql", "memorystore", "dataproc", "cloudrun"]
	.map((id) => byId(id).name);

const serviceRows = localServices
	.map((service) =>
		[
			service.name,
			`\`${service.id}\``,
			service.defaultEnabled ? "yes" : "opt-in",
			service.endpointLabel,
			`\`${service.envVar}\``,
			`[guide](${service.guideUrl})`,
		]
			.map(tableCell)
			.join(" | "),
	)
	.map((row) => `| ${row} |`)
	.join("\n");

// llmstxt.org layout: H1, a one-sentence definition, details, then link sections.
const llms = `# LocalCloud

> LocalCloud is a local Google Cloud emulator: one Docker container that serves ${localServices.length} Google Cloud services on localhost, so developers, CI jobs, and AI coding agents can run Google Cloud code without a GCP account, credentials, or billing.

- Runs ${listNames([...highlighted, "more"])} in one container.
- Standard Google Cloud SDKs and Terraform connect through generated emulator environment variables.
- Stores local state in a named Docker volume and includes a web console for service health and local data.
- Installs as a CLI on macOS and Linux; any Docker host can run the container directly.
- Free during the public preview for non-production use, and free for open-source projects.

Use LocalCloud for development, testing, and CI, and validate application behavior against real Google Cloud before production deployment.

## Quick start

\`\`\`bash
${quickStart.script}
\`\`\`

- Homebrew alternative to the first line: \`${quickStart.homebrew}\`.
- \`localcloud start\` waits for the runtime. The CLI remaps a default port when it is in use; use the URLs and endpoint values it returns.
- Without the CLI (for example on Windows), follow the [manual Docker path](${site}docs/#manual-docker-path).

## Runtime facts

- Default project: \`${contract.product.defaultProject}\`
- Default user: \`${contract.product.defaultUser}\`
- Default data volume: \`${contract.product.defaultDataVolume}\`; select another with \`--data-volume NAME\`.
- CLI memory default: \`${contract.product.memory}\`
- Readiness endpoint (wait for it before application traffic): \`${gateway}${contract.operator.endpoints.readiness}\`
- Health endpoint: \`${gateway}${contract.operator.endpoints.health}\`
- Shell environment: \`${gateway}${contract.operator.endpoints.environment}?format=shell\`
- Terraform environment: \`${gateway}${contract.operator.endpoints.environment}?format=terraform\`

## Agent resources

- [Agent guide](${site}ai/agents.md): install-first quick start, rules, and workflow for coding agents
- [AGENTS.md template](${site}ai/agent-template.md): repository instructions to copy into a project
- [Service matrix](${site}ai/services.md): ports, environment variables, and guides
- [Capabilities and boundaries](${site}ai/compatibility.md): what each service runs locally
- [Docs index for agents](${site}ai/docs.md)
- [Full documentation](${site}llms-full.txt): every docs page and service guide in one Markdown file
- [Agent Skills](https://github.com/LocalGCloud/LocalGCloud.github.io/tree/main/agent-skills): portable skills for \`.agents/skills/\`

## Docs

Every docs page and service guide also has a Markdown version: replace the trailing slash with \`.md\`, for example ${site}docs/configuration.md and ${site}services/bigquery.md (the section pages are ${site}docs/index.md and ${site}services/index.md).

- [Getting started](${site}docs/): install, start, and make a first request
- [Configuration](${site}docs/configuration/): services, projects, persistence, and networking
- [SDK examples](${site}docs/sdk-examples/): Google Cloud client libraries against localhost
- [Terraform](${site}docs/terraform/): provider endpoint overrides
- [Seed data](${site}docs/seed-data/): repeatable local fixtures
- [Architecture](${site}docs/architecture/)
- [Web console](${site}docs/console/)
- [Service catalog](${site}services/)
- [Compatibility and limitations](${site}compatibility/)
- [FAQ](${site}docs/faq/)
- [Privacy](${site}docs/privacy/)

## Services

Every service in the table runs locally. ${listNames(optInServices.map((service) => service.name))} are opt-in: \`--services\` sets the exact list of service IDs to run, for example \`localcloud start --local-only --services ${servicesExample}\`. Google Sheets serves read-only spreadsheet values as fixtures for other services.

| Service | ID | Starts by default | Endpoints | Environment variable | Guide |
| --- | --- | --- | --- | --- | --- |
${serviceRows}

Unsupported locally; use Google Cloud:

${unsupportedServices.map((service) => `- [${service.name}](${service.guideUrl}) — unsupported`).join("\n")}

## License

${contract.licensing.summary} Excluded uses: ${excludedUseList}. Open-source projects can use LocalCloud free of charge for development, testing, and ongoing internal CI under the Free for open-source projects policy, which continues after the public preview ends.

- [Licensing](${site}docs/licensing/)
- [Pricing](${site}pricing/)

## Optional

- [Local cloud for AI agents](${site}local-cloud-for-ai-agents/)
- [Agent sandbox setup](${site}agents/)
- [Agent and automation workflows](${site}workflows/)
- [LocalStack for Google Cloud](${site}localstack-for-google-cloud/)
- [Comparisons and alternatives](${site}compare/)
- [Glossary](${site}glossary/)
- [Blog](${site}blog/)
- [CLI releases](https://github.com/LocalGCloud/localcloud-cli/releases)
`;
await write("public/llms.txt", llms);
// dist/llms-full.txt is built after `astro build` by scripts/generate-markdown-twins.mjs.
console.log(`Generated public/llms.txt for ${localServices.length} local services.`);
