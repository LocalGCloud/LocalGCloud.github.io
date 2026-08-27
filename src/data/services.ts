import {
	docsContract,
	type EvidenceState,
	type OperationContract,
	type PersistenceContract,
	type ServiceImplementation,
} from "./docs-contract.ts";
import { getServiceEditorial, type ServiceCategory } from "./serviceEditorial.ts";

export type { ServiceCategory } from "./serviceEditorial.ts";

export const serviceCategoryOrder: ServiceCategory[] = [
	"databases",
	"integration",
	"compute",
	"security",
	"operations",
	"storage",
	"analytics",
];

export const serviceCategoryMeta: Record<
	ServiceCategory,
	{ label: string; description: string }
> = {
	storage: {
		label: "Storage",
		description: "Buckets, objects, and local file workflows.",
	},
	databases: {
		label: "Databases",
		description:
			"Transactional, document, wide-column, relational, and cache workflows.",
	},
	analytics: {
		label: "Analytics",
		description: "Local data processing, warehouse, and query workflows.",
	},
	integration: {
		label: "Messaging & Workflow",
		description: "Events, jobs, scheduling, and orchestration.",
	},
	security: {
		label: "Security",
		description: "Secret, identity, and cryptographic API workflows.",
	},
	operations: {
		label: "Operations",
		description:
			"Projects, service usage, billing metadata, logs, and metrics.",
	},
	compute: {
		label: "Compute & Runtime",
		description:
			"Function, container, cluster, VM, and AI control-plane workflows.",
	},
};

export interface Service {
	id: string;
	name: string;
	slug: string;
	port: string;
	protocol: string;
	endpointLabel: string;
	category: ServiceCategory;
	type: "external" | "facade";
	implementation: ServiceImplementation;
	assembledDefaultEnabled: boolean;
	registryDefaultEnabled: boolean;
	defaultQualification: EvidenceState;
	defaultLimitation: string;
	minTier: "community" | "pro";
	status: EvidenceState;
	catalogState: "available" | "coming-soon";
	envVar: string;
	description: string;
	operations: OperationContract[];
	supported: string[];
	notSupported: string[];
	iconId: string;
	persistence: PersistenceContract;
	evidence: string[];
}

const protocolLabel = (protocol: string) => {
	if (protocol === "rest") return "HTTP/REST";
	if (protocol === "grpc") return "gRPC";
	if (protocol === "redis") return "RESP";
	if (protocol === "postgres") return "PostgreSQL";
	if (protocol === "mysql") return "MySQL";
	if (protocol === "k3d") return "k3d";
	return protocol;
};

export const serviceRegistryCount = docsContract.services.length;

export const services: Service[] = docsContract.services.flatMap(
	(contractService) => {
		const editorial = getServiceEditorial(contractService);
		if (!contractService.published) return [];

		const allPorts = [
			contractService.port,
			...Object.values(contractService.additionalPorts),
		];
		const endpointLabel = [
			`${protocolLabel(contractService.protocol)} :${contractService.port}`,
			...Object.entries(contractService.additionalPorts).map(
				([protocol, port]) => `${protocolLabel(protocol)} :${port}`,
			),
		].join(" · ");
		const positiveOperations = contractService.operations.filter(
			(operation) =>
				operation.status === "verified" ||
				operation.status === "partial" ||
				operation.status === "release-unverified",
		);
		const catalogState =
			contractService.availability === "available" ? "available" : "coming-soon";
		const service: Service = {
			id: contractService.id,
			name: contractService.name,
			slug: editorial.slug,
			port: allPorts.join(" / "),
			protocol: protocolLabel(contractService.protocol),
			endpointLabel,
			category: editorial.category,
			type: contractService.type,
			implementation: contractService.implementation,
			assembledDefaultEnabled: contractService.assembledDefault.enabled,
			registryDefaultEnabled: contractService.registryDefaultEnabled,
			defaultQualification: contractService.assembledDefault.qualification,
			defaultLimitation: contractService.assembledDefault.limitation,
			minTier: contractService.minTier,
			status: contractService.status,
			catalogState,
			envVar: `${contractService.envVar}=${contractService.envValue}`,
			description: editorial.description,
			operations: contractService.operations,
			supported:
				catalogState === "coming-soon"
					? []
					: positiveOperations.map((operation) => operation.label),
			notSupported: [...contractService.limitations],
			iconId: editorial.iconId,
			persistence: contractService.persistence,
			evidence: [...contractService.evidence],
		};
		return [service];
	},
);

export const publishedServiceCount = services.length;
export const availableServiceCount = services.filter(
	(service) => service.catalogState === "available",
).length;
export const comingSoonServiceCount = services.filter(
	(service) => service.catalogState === "coming-soon",
).length;

export function getServiceSignalLabel(service: Service): string {
	if (service.catalogState === "coming-soon") return "Coming soon";
	const count = service.supported.length;
	return `${count} documented ${count === 1 ? "workflow" : "workflows"}`;
}

export function getServiceStatusLabel(service: Service): string {
	switch (service.status) {
		case "verified":
			return "Verified local workflows";
		case "partial":
			return "Partial local emulation";
		case "release-unverified":
			return "Release-unverified";
		case "unsupported":
			return "Unsupported";
		case "unknown":
			return "Evidence unknown";
	}
}

export function getServiceImplementationLabel(service: Service): string {
	switch (service.implementation) {
		case "google-official":
			return "Google Official";
		case "extended-official":
			return "Extended Official";
		case "custom-emulator":
			return "Custom Emulator";
		case "third-party-emulator":
			return "Third-Party Emulator";
		case "local-facade":
			return "Local Facade";
	}
}

export function getServiceImplementationNote(service: Service): string {
	switch (service.implementation) {
		case "google-official":
			return "Backed by a Google-provided emulator process.";
		case "extended-official":
			return "Backed by an extended emulator path; verify the assembled release before relying on dependency-sensitive behavior.";
		case "custom-emulator":
			return "Backed by a custom emulator; consult feature-specific evidence and limitations.";
		case "third-party-emulator":
			return "Backed by a separately maintained emulator process integrated into LocalCloud.";
		case "local-facade":
			return "Implemented inside LocalCloud for bounded local workflows.";
	}
}

export function getServiceCategoryLabel(service: Service): string {
	return serviceCategoryMeta[service.category].label;
}
