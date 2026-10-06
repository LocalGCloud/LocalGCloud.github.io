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
	"auxiliary",
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
	auxiliary: {
		label: "Auxiliary Integration APIs",
		description:
			"Data lookup and fixture seeding APIs for other cloud services (e.g. BigQuery external tables); not offered as an individual Google Cloud service.",
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
	marketingStatus: "supported" | "unsupported";
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
	if (protocol === "grpc+rest") return "gRPC + HTTP/REST";
	if (protocol === "redis") return "RESP";
	if (protocol === "postgres") return "PostgreSQL";
	if (protocol === "mysql") return "MySQL";
	if (protocol === "k3d") return "k3d";
	return protocol;
};

// The one label for the runtime's Pro service tier, used wherever a tier is shown; /pricing/#pro-tier
// explains it. Public-preview releases run Pro-tier services without a license key.
export const proTierLabel = "Pro tier, free during preview";
export const pricingProTierPath = "/pricing/#pro-tier";

// Undefined for services that don't run locally: a tier says nothing about them.
export function serviceTierLabel(service: { minTier: "community" | "pro"; status: string }): string | undefined {
	if (["unsupported", "unknown", "planned"].includes(service.status)) return undefined;
	return service.minTier === "pro" ? proTierLabel : "Community";
}

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
		const isUnsupported =
			contractService.status === "unsupported" || contractService.status === "unknown";
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
			marketingStatus: isUnsupported ? "unsupported" : "supported",
			status: contractService.status,
			catalogState,
			envVar: `${contractService.envVar}=${contractService.envValue}`,
			// Catalog cards name the tier the same way the service pages and pricing do.
			description:
				contractService.minTier === "pro" && !isUnsupported && catalogState === "available"
					? `${editorial.description} ${proTierLabel}.`
					: editorial.description,
			operations: contractService.operations,
			supported:
				catalogState === "coming-soon"
					? []
					: positiveOperations.map((operation) => operation.label),
			// docs-contract.ts already presents these as reader copy (no evidence tags).
			notSupported: contractService.limitations,
			iconId: editorial.iconId,
			persistence: contractService.persistence,
			evidence: [...contractService.evidence],
		};
		return [service];
	},
);

export const publishedServiceCount = services.length;
export const primaryServices = services.filter((service) => service.category !== "auxiliary");
export const auxiliaryServices = services.filter((service) => service.category === "auxiliary");
export const primaryServiceCount = primaryServices.length;
export const auxiliaryServiceCount = auxiliaryServices.length;
export const availableServiceCount = services.filter(
	(service) => service.catalogState === "available" && service.status !== "unsupported" && service.status !== "unknown",
).length;
export const comingSoonServiceCount = services.filter(
	(service) => service.catalogState === "coming-soon",
).length;

export function isAuxiliaryService(service: Service): boolean {
	return service.category === "auxiliary";
}

export function isServiceSupported(service: Service): boolean {
	return service.marketingStatus === "supported";
}

export function isServiceDisabledByDefault(service: Service): boolean {
	return service.marketingStatus === "supported" && !service.registryDefaultEnabled;
}

// `--services` sets the exact list of services to start, so an opt-in example keeps two
// default services alongside the opt-in one.
export function optInStartCommand(service: Service): string {
	const defaults = services
		.filter((candidate) => candidate.registryDefaultEnabled && candidate.marketingStatus === "supported" && candidate.id !== service.id)
		.slice(0, 2)
		.map((candidate) => candidate.id);
	return `localcloud start --local-only --services ${[service.id, ...defaults].join(",")}`;
}

export function getServiceSignalLabel(service: Service): string {
	if (service.catalogState === "coming-soon" || service.marketingStatus === "unsupported") return "Unsupported";
	// Opt-in services (Firestore, GKE, Cloud Run) are supported; their descriptions and
	// pages say how to enable them, so the signal stays positive.
	const count = service.supported.length;
	return `${count} documented ${count === 1 ? "workflow" : "workflows"}`;
}

export function getServiceStatusLabel(service: Service): string {
	if (service.catalogState === "coming-soon" || service.marketingStatus === "unsupported") {
		return "Unsupported";
	}
	return "Supported";
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
