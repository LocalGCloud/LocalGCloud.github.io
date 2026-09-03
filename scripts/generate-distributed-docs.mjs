import { readFile, writeFile } from "node:fs/promises";

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
	partial: "partial",
	"release-unverified": "release-unverified",
	unsupported: "planned",
	unknown: "planned",
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
const services = contract.services.flatMap((service) => {
	const overlay = editorial.get(service.id);
	if (!overlay) throw new Error(`Missing editorial overlay for ${service.id}`);

	const comingSoon = service.availability !== "available";
	return [
		{
			name: service.name,
			slug: overlay.slug,
			status: comingSoon ? "planned" : statusMap[service.status],
			port: comingSoon
				? "coming soon"
				: [service.port, ...Object.values(service.additionalPorts)].join(" / "),
			protocol: comingSoon ? "planned" : service.protocol,
			endpointLabel: comingSoon ? "Coming soon" : endpointLabel(service),
			envVar: comingSoon ? "" : `${service.envVar}=${service.envValue}`,
			docsUrl: `${contract.product.siteUrl}services/${overlay.slug}/`,
			implementation: service.implementation,
			supported: comingSoon
				? []
				: service.operations
						.filter(
							(operation) => !["unsupported", "unknown"].includes(operation.status),
						)
						.map(
							(operation) =>
								`${operation.label} (${operation.status})${operation.limitations.length ? ` — ${operation.limitations.join(" ")}` : ""}`,
						),
			gaps: comingSoon
				? ["Service support is coming soon."]
				: [
						...service.limitations,
						...service.operations
							.filter((operation) =>
								["unsupported", "unknown"].includes(operation.status),
							)
							.map(
								(operation) =>
									`${operation.label}: ${operation.status}${operation.limitations.length ? ` — ${operation.limitations.join(" ")}` : ""}`,
							),
					],
			caveat: comingSoon
				? "Service support is coming soon; do not configure a local endpoint yet."
				: service.status === "release-unverified"
					? "Release-unverified: qualify the dependency identity and assembled LocalCloud image before relying on positive workflows."
					: service.status === "verified"
						? "Verified only for the documented bounded local workflows; real Google Cloud remains the production source of truth."
					: "Partial local behavior with operation-specific limitations.",
			defaultEnabled: service.registryDefaultEnabled,
		},
	];
});
const availableServiceCount = services.filter(
	(service) => service.status !== "planned",
).length;
const serviceLines = services
	.map((service) =>
		service.status === "planned"
			? `- ${service.name} — coming soon. ${service.caveat}`
			: `- ${service.name} — ${service.status}; ${service.defaultEnabled ? "starts by default" : "available but disabled by default"}; ${service.endpointLabel}; \`${service.envVar}\`. ${service.caveat}`,
	)
	.join("\n");
const compact = `# LocalCloud\n\nLocalCloud provides ${availableServiceCount} available Google Cloud service guides in one local Docker runtime. Availability does not imply full Google Cloud parity or default startup. Firestore is available but disabled by default; Google Sheets provides a limited read-only values facade.\n\nLocalCloud is not a production replacement. Use is governed by the proprietary LocalCloud license; review the license before use. ${contract.licensing.summary} Excluded uses include ${contract.licensing.excludedUse.join(", ")}.\n\n## Quick start\n\n\`\`\`bash\n${contract.cli.installCommand}\nlocalcloud doctor\nlocalcloud start\neval "$(localcloud env)"\nlocalcloud console\n\`\`\`\n\n## Runtime facts\n\n- Default project: \`${contract.product.defaultProject}\`\n- Default user: \`${contract.product.defaultUser}\`\n- Default data volume: \`${contract.product.defaultDataVolume}\`\n- CLI memory default: \`${contract.product.memory}\`\n- Health endpoint: \`http://localhost:${contract.operator.gatewayPort}${contract.operator.endpoints.health}\`\n- Shell environment endpoint: \`http://localhost:${contract.operator.gatewayPort}${contract.operator.endpoints.environment}?format=shell\`\n- Terraform environment endpoint: \`http://localhost:${contract.operator.gatewayPort}${contract.operator.endpoints.environment}?format=terraform\`\n\nTrust URLs and endpoint values returned by the selected CLI runtime; occupied canonical ports may be remapped. Select durable storage with \`--data-volume NAME\`; project and caller remain request context. ${contract.product.productionBoundary}\n\n## Useful URLs\n\n- Service catalog: https://local.cloud/services/\n- Compatibility and limitations: https://local.cloud/compatibility/\n- Configuration: https://local.cloud/docs/configuration/\n- Pricing: https://local.cloud/pricing/\n- Licensing: https://local.cloud/docs/licensing/\n- LocalStack for Google Cloud: https://local.cloud/localstack-for-google-cloud/\n- Local cloud for AI agents: https://local.cloud/local-cloud-for-ai-agents/\n- Agent sandbox setup routes: https://local.cloud/agents/\n- Agent and automation workflows: https://local.cloud/workflows/\n- Comparisons and alternatives: https://local.cloud/compare/\n- Glossary: https://local.cloud/glossary/\n- AGENTS.md template: https://local.cloud/ai/AGENTS.md\n- CLI releases: https://github.com/LocalGCloud/localcloud-cli/releases\n\n## Services\n${serviceLines}\n`;
await write("public/llms.txt", compact);
await write(
	"public/llms-full.txt",
	`${compact}\n## Safety boundaries\n\n- The mutable image identity is ${contract.product.runtimeImage.qualification}; prefer the host CLI and pin a qualified digest for release work.\n- Default CLI Docker-socket and transparent-network settings are off.\n- Technical tiers and successful startup do not grant legal permission.\n- Runtime telemetry and other outbound behaviors are documented at https://local.cloud/docs/privacy/.\n- Validate allowed release behavior against real Google Cloud after clearing local endpoint variables.\n`,
);
console.log(
	`Generated end-user context for ${availableServiceCount} available services plus public/llms.txt and public/llms-full.txt.`,
);
