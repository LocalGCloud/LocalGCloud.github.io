import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
// The LocalCloud runtime publishes its documentation contract in docs/public-contract/ of
// localcloud-go: curated public facts only (no source). The packaged defaults are configuration.
const runtimeRoot = new URL("../../localcloud-go/", import.meta.url);
const cliRoot = new URL("../../localcloud-cli/", import.meta.url);
const bigqueryRoot = new URL("../../local_cloud_dependencies/bigquery-emulator-on-duckdb/", import.meta.url);
const contractUrl = new URL("src/data/docs-contract.snapshot.json", root);
const runtimePaths = {
	defaults: "pkg/config/localcloud.defaults.yaml",
	documentation: "docs/public-contract/documentation.yaml",
	facts: "docs/public-contract/runtime-facts.yaml",
	status: "docs/public-contract/service-status.md",
	networking: "docs/public-contract/networking-and-tls.md",
	mcp: "docs/public-contract/mcp-integration.md",
	license: "LICENSE",
};
const runtimeSource = (key) => `../localcloud-go/${runtimePaths[key]}`;

const read = (url) => readFile(url, "utf8");
const revision = (url) =>
	execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: url,
		encoding: "utf8",
	}).trim();
const changed = (url, path) => {
	try {
		execFileSync("git", ["diff", "--quiet", "HEAD", "--", path], {
			cwd: url,
			stdio: "ignore",
		});
		return false;
	} catch (error) {
		if (error.status === 1) return true;
		throw error;
	}
};
const sha256 = async (url) =>
	`sha256:${createHash("sha256").update(await read(url)).digest("hex")}`;

const contract = JSON.parse(await read(contractUrl));
contract.schemaVersion = 4;
const defaults = parse(await read(new URL(runtimePaths.defaults, runtimeRoot)));
const documentation = parse(await read(new URL(runtimePaths.documentation, runtimeRoot)));
const facts = parse(await read(new URL(runtimePaths.facts, runtimeRoot)));
const cliVersionSource = await read(
	new URL("src/localcloud_cli/__init__.py", cliRoot),
);
const cliVersion = cliVersionSource.match(/__version__ = "([^"]+)"/)?.[1];

if (!cliVersion) throw new Error("Unable to read the LocalCloud CLI version");

const runtimeCatalog = defaults?.services?.catalog;
const documentationServices = documentation?.services;
if (!runtimeCatalog || !documentationServices) {
	throw new Error("Upstream runtime catalogs are missing");
}

const localDateParts = Object.fromEntries(
	new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Los_Angeles",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.formatToParts(new Date())
		.map((part) => [part.type, part.value]),
);
contract.reviewedAt = `${localDateParts.year}-${localDateParts.month}-${localDateParts.day}`;
contract.provenance.runtimeRevision = revision(runtimeRoot);
contract.provenance.cliRevision = revision(cliRoot);
if (facts?.schema_version !== 1) throw new Error("Unsupported runtime facts schema");
if (documentation?.schema_version !== 1) throw new Error("Unsupported public documentation schema");
const sourceFiles = [
	{ path: "../local_cloud_dependencies/bigquery-emulator-on-duckdb/docs/coverage-matrix.csv", url: new URL("docs/coverage-matrix.csv", bigqueryRoot), repository: bigqueryRoot, repositoryPath: "docs/coverage-matrix.csv" },
	...Object.keys(runtimePaths).map((key) => ({ path: runtimeSource(key), url: new URL(runtimePaths[key], runtimeRoot), repository: runtimeRoot, repositoryPath: runtimePaths[key] })),
	{ path: "../localcloud-cli/README.md", url: new URL("README.md", cliRoot), repository: cliRoot, repositoryPath: "README.md" },
	{ path: "../localcloud-cli/src/localcloud_cli/config.py", url: new URL("src/localcloud_cli/config.py", cliRoot), repository: cliRoot, repositoryPath: "src/localcloud_cli/config.py" },
	{ path: "../localcloud-cli/src/localcloud_cli/__init__.py", url: new URL("src/localcloud_cli/__init__.py", cliRoot), repository: cliRoot, repositoryPath: "src/localcloud_cli/__init__.py" },
	...[
		"src/localcloud_cli/constants.py", "src/localcloud_cli/docker_runtime.py", "src/localcloud_cli/telemetry.py",
	].map((path) => ({ path: `../localcloud-cli/${path}`, url: new URL(path, cliRoot), repository: cliRoot, repositoryPath: path })),
	{ path: "public/install.sh", url: new URL("public/install.sh", root), repository: root, repositoryPath: "public/install.sh" },
];
contract.provenance.sources = sourceFiles.map((source) => source.path);
contract.provenance.sourceDigests = Object.fromEntries(
	await Promise.all(
		sourceFiles.map(async (source) => [source.path, await sha256(source.url)]),
	),
);
// The site publishes the governing license at /license/ and /license.txt from this copy;
// refresh it with the digest recorded above (scripts/verify-policy-docs.mjs compares them).
await writeFile(
	new URL("src/data/legal/public-preview-license.txt", root),
	await readFile(new URL(runtimePaths.license, runtimeRoot)),
);
contract.provenance.worktreeSources = sourceFiles
	.filter((source) => changed(source.repository, source.repositoryPath))
	.map((source) => source.path);
contract.bigqueryCoverage = JSON.parse(execFileSync("python3", ["-c", `
import csv, json
from collections import Counter
with open('docs/coverage-matrix.csv', newline='') as source:
    rows = list(csv.DictReader(source))
print(json.dumps({
    'total': len(rows),
    'development': dict(Counter(row['development_status'] for row in rows)),
    'production': dict(Counter(row['production_parity'] for row in rows)),
    'partialCapabilities': [{'id': row['capability_id'], 'name': row['feature_name'], 'boundary': row['production_limitations'], 'notes': row['notes']} for row in rows if row['development_status'] == 'partial'],
}))
`], { cwd: bigqueryRoot, encoding: "utf8" }));
contract.bigqueryCoverage.revision = revision(bigqueryRoot);
contract.product.serviceCount = Object.keys(runtimeCatalog).length;
contract.product.defaultProject = defaults.context.project;
const cliConstants = await read(new URL("src/localcloud_cli/constants.py", cliRoot));
contract.product.memory = cliConstants.match(/^DEFAULT_MEMORY = "([^"]+)"/m)?.[1];
if (!contract.product.memory) throw new Error("Unable to read CLI memory default");
contract.cli.dockerSocketDefault = defaults.host.docker_socket;
contract.cli.bindAddress = "0.0.0.0";
contract.cli.quickStart = ["localcloud doctor", "localcloud start --local-only", 'eval "$(localcloud env)"', "localcloud console"];
contract.operator.gatewayPort = defaults.server.gateway.port;
const exposed = (suffix) => facts.image.exposed_ports.find((port) => port.endsWith(`/${suffix}`))?.replace(`/${suffix}`, "");
if (!exposed("tcp") || !exposed("udp")) throw new Error("Runtime facts name no exposed TCP range or UDP port");
contract.operator.publishedPorts = {
	services: exposed("tcp"),
	transparentDns: `53/udp -> ${exposed("udp")}/udp`,
	transparentHttp: `80 -> ${defaults.server.gateway.port}`,
	transparentHttps: `443 -> tls.port (default ${defaults.tls.port})`,
};
contract.operator.manualDockerCommand = `docker volume create localcloud-data\n\ndocker run -d --name localcloud \\\n  -p 127.0.0.1:${exposed("tcp")}:${exposed("tcp")} \\\n  -m 4g \\\n  -v localcloud-data:${facts.image.data_root} \\\n  ${facts.image.repository}:latest`;
contract.cli.releaseBoundary = contract.provenance.worktreeSources.some((path) => path.startsWith("../localcloud-cli/"))
	? `CLI ${cliVersion} behavior is documented from the current sibling source snapshot. Source digests identify working-tree changes not captured by cliRevision. Use localcloud --version to confirm the installed release.`
	: `CLI behavior is documented for version ${cliVersion} from revision ${contract.provenance.cliRevision}. Use localcloud --version to confirm the installed release.`;

const statusMap = {
	supported: "verified",
	partial: "partial",
	unverified: "unknown",
	unsupported: "unsupported",
	prod_only: "unsupported",
};

// Runtime facts the contract once scraped from source are explicit fields of runtime-facts.yaml,
// which localcloud-go checks against its code (see that file's header).
const factsEvidence = [runtimeSource("facts")];
const seedFacts = facts.seed;
contract.seed.endpoint = seedFacts.endpoint;
contract.seed.reseedEndpoint = seedFacts.reseed_endpoint;
contract.seed.importEndpoint = seedFacts.import_endpoint;
contract.seed.seedFileVariable = seedFacts.file_variable;
contract.seed.defaultSeedFile = seedFacts.default_file;
contract.seed.terraformModeVariable = seedFacts.terraform_mode_variable;
contract.seed.acceptedEnvelopes = seedFacts.accepted_envelopes.map(({ id, description }) => ({ id, description, evidence: factsEvidence }));
contract.seed.supportedServices = [...seedFacts.supported_services];
contract.seed.volatileServices = [...seedFacts.volatile_services];
contract.seed.limitations = [
	...seedFacts.limitations,
	"Managed CLI lifecycle commands do not mount or apply seed files; host.seed is accepted but ignored. Container bootstrap and Console reseeding own samples.",
];
contract.seed.evidence = [...factsEvidence, "../localcloud-cli/src/localcloud_cli/config.py"];

const endpointNames = {
	health: "health", serviceHealth: "service_health", readiness: "readiness", environment: "environment",
	services: "services", seed: "seed", reseed: "reseed", import: "import", reset: "reset",
	terraformReadiness: "terraform_readiness", graphql: "graphql", openapi: "openapi",
};
contract.operator.endpoints = Object.fromEntries(Object.entries(endpointNames).map(([name, key]) => {
	if (!facts.operator_endpoints[key]) throw new Error(`Runtime facts name no ${key} endpoint`);
	return [name, facts.operator_endpoints[key]];
}));

contract.terraform.readinessEndpoint = facts.terraform.readiness_endpoint;
contract.terraform.modeVariable = facts.terraform.mode_variable;
contract.terraform.networkModes = [
	{
		id: "endpoint-only",
		description: "Use generated custom endpoints for resources whose provider clients honor them.",
		requirements: [`eval generated values from ${facts.terraform.environment_format} or localcloud env --format terraform`],
		evidence: [...factsEvidence, "../localcloud-cli/README.md"],
	},
	{
		id: "transparent-network",
		description: "Use LocalCloud DNS/HTTP/HTTPS routing for clients that ignore custom endpoints.",
		requirements: ["enable transparent networking", "trust the LocalCloud certificate", `set ${facts.terraform.mode_variable}=true`],
		evidence: [runtimeSource("networking")],
	},
];
contract.terraform.evidence = [...factsEvidence, runtimeSource("networking"), "../localcloud-cli/README.md"];

// The runtime image reports nothing; LocalCloud's usage reports come from the public CLI, which
// honors the same opt-out variable on the host.
const telemetry = facts.telemetry;
if (telemetry.runtime_sends_usage_data !== false || !telemetry.ignored_variables.includes("LOCALCLOUD_TELEMETRY")) {
	throw new Error("Runtime telemetry facts changed; review privacy.runtimeTelemetry before syncing");
}
contract.privacy.runtimeTelemetry = {
	defaultEnabled: true,
	destination: "https://us.i.posthog.com/i/v0/e/",
	disableVariable: "LOCALCLOUD_TELEMETRY",
	identifier: "Pseudonymous installation identifier kept by the CLI",
	retryPersistence: true,
	events: ["CLI startup errors as scrubbed one-line signatures", "hourly CLI heartbeat: CLI version, platform, configured services and command counts"],
	limitations: [
		"The runtime image sends no usage telemetry and does not read LOCALCLOUD_TELEMETRY; the Console sends no analytics.",
		"The LocalCloud CLI sends its reports from start, restart, reset and stop; LOCALCLOUD_TELEMETRY=false or DO_NOT_TRACK in the CLI's environment stops them. Undelivered events are retried on a later run.",
	],
	evidence: [...factsEvidence, "../localcloud-cli/src/localcloud_cli/telemetry.py"],
};
contract.privacy.outboundBehaviors = facts.outbound_requests.map(({ id, default: defaultState, destination, control }) => ({
	id, default: String(defaultState), destination, control, evidence: factsEvidence,
}));
contract.privacy.evidence = [...factsEvidence, "../localcloud-cli/src/localcloud_cli/telemetry.py", "src/layouts/BaseLayout.astro"];
contract.privacy.websiteAnalytics.processor = "PostHog and Cloudflare Web Analytics";
contract.privacy.websiteAnalytics.events = contract.privacy.websiteAnalytics.events
	.filter((event) => event !== "autocapture interactions");
for (const event of ["explicit interactions", "sampled session recordings", "heatmaps", "dead clicks", "sampled browser web vitals and website release", "page-load and performance measurements", "IP-based location information"]) {
	if (!contract.privacy.websiteAnalytics.events.includes(event)) contract.privacy.websiteAnalytics.events.push(event);
}
for (const path of ["src/utils/cloudflare-analytics-config.mjs", "worker/index.mjs"]) {
	if (!contract.privacy.websiteAnalytics.evidence.includes(path)) contract.privacy.websiteAnalytics.evidence.push(path);
}

const servicePort = (service) => service.plaintextPort ?? service.port;
const envValue = (service) => {
	const raw = servicePort(service);
	const port = raw === "gateway" ? defaults.server.gateway.port : raw;
	return `${service.envValuePrefix ?? ""}localhost:${port}`;
};

const documentationEvidence = [runtimeSource("documentation")];
const serviceEvidence = [runtimeSource("defaults"), runtimeSource("documentation")];
const persistenceScopes = new Set(["volatile", "metadata", "service-data", "stateless"]);
const implementations = new Set(["google-official", "extended-official", "custom-emulator", "third-party-emulator", "local-facade"]);

contract.services = contract.services.map((service) => {
	const runtime = runtimeCatalog[service.id];
	const docs = documentationServices[service.id];
	if (!runtime || !docs) {
		throw new Error(`Upstream documentation is missing service ${service.id}`);
	}
	if (!statusMap[docs.coverage_status]) throw new Error(`Unknown service status ${docs.coverage_status} for ${service.id}`);

	const operations = docs.operations.map((operation) => {
		const status = statusMap[operation.status];
		if (!status) {
			throw new Error(
				`Unknown operation status ${operation.status} for ${service.id}.${operation.id}`,
			);
		}
		const limitations = [];
		if (service.id === "bigquery" && operation.id === "sql.query") {
			limitations.push("Query coverage varies by capability and input. Review the dependency matrix, including partial and unsupported records; qualify semantics and errors with application queries.");
		} else if (operation.notes) limitations.push(operation.notes);
		if (status === "unsupported" && limitations.length === 0) {
			limitations.push("This operation is not available in LocalCloud.");
		}
		return {
			id: `${service.id}.${operation.id}`,
			label: operation.operation,
			status,
			limitations,
			evidence: documentationEvidence,
		};
	});

	const rawPort = servicePort(runtime);
	const port = rawPort === "gateway" ? defaults.server.gateway.port : rawPort;
	if (docs.port !== port || docs.env_var !== runtime.envVar || docs.name !== runtime.displayName) {
		throw new Error(`${service.id} name, port or environment variable in documentation.yaml differs from the packaged defaults`);
	}
	const additionalPorts = { ...(runtime.additionalPorts ?? {}) };
	if (runtime.gcloudPort && !additionalPorts.rest) additionalPorts.rest = runtime.gcloudPort;
	if (runtime.grpcPort && !additionalPorts.grpc) additionalPorts.grpc = runtime.grpcPort;

	const implementation = docs.implementation ?? (runtime.type === "facade" ? "local-facade" : service.implementation);
	if (!implementations.has(implementation)) throw new Error(`Unknown implementation ${implementation} for ${service.id}`);
	const persistence = docs.persistence;
	if (!persistence || !persistenceScopes.has(persistence.scope) || !persistence.backing_store || !persistence.restart_behavior || !persistence.recovery_limitations?.length) {
		throw new Error(`documentation.yaml has no complete persistence block for ${service.id}`);
	}

	return {
		...service,
		implementation,
		persistence: {
			scope: persistence.scope,
			backingStore: persistence.backing_store,
			restartBehavior: persistence.restart_behavior,
			recoveryLimitations: [...persistence.recovery_limitations],
			qualification: service.persistence.qualification,
			evidence: documentationEvidence,
		},
		availability: runtime.availability,
		name: runtime.displayName,
		port,
		additionalPorts,
		protocol: runtime.protocol,
		type: runtime.type,
		minTier: runtime.minTier,
		envVar: runtime.envVar,
		envValue: envValue(runtime),
		terraformEnvVar: runtime.terraformEnvVar ?? null,
		registryDefaultEnabled: runtime.defaultEnabled,
		assembledDefault: {
			enabled: runtime.defaultEnabled,
			qualification: "verified",
			evidence: serviceEvidence,
			limitation:
				"Default enablement follows the current runtime catalog; no service is gated by license tier.",
		},
		status: statusMap[docs.coverage_status],
		// The matrix records concrete gaps; upstream prose still has stale totals and global parity claims.
		limitations: service.id === "bigquery" ? [
			"Coverage classifications are source records, not proof of full Google Cloud semantic parity or assembled-image qualification.",
			...contract.bigqueryCoverage.partialCapabilities.map((capability) => `${capability.id}: ${capability.boundary}`),
			"Google-managed reservations, fleet scale, replication, and IAM integrations require production validation.",
		] : docs.limitations ?? [],
		operations,
		evidence: serviceEvidence,
		published: runtime.availability === "available",
	};
});

// The engine revisions the runtime image is built from, as the runtime publishes them.
contract.provenance.dependencyRevalidations = contract.provenance.dependencyRevalidations.map((dependency) => {
	const engine = Object.values(facts.emulators).find((item) => item.repository === dependency.id);
	if (!engine) throw new Error(`Runtime facts name no engine revision for ${dependency.id}`);
	return { ...dependency, revision: engine.revision, evidence: [`../local_cloud_dependencies/${dependency.id}`, ...factsEvidence] };
});

contract.product.runtimeImage.repository = facts.image.repository;
contract.product.runtimeImage.evidence = [...factsEvidence, "../localcloud-cli/src/localcloud_cli/config.py", "../localcloud-cli/.github/workflows/cli-release.yml"];
contract.licensing.governingLicense = runtimeSource("license");
contract.licensing.evidence = [runtimeSource("license"), ...factsEvidence];
contract.licensing.technicalEnforcement = {
	developmentBuild: "No build enforces a license key; every available service runs without one.",
	enforcedBuild: `The runtime reports license state ${facts.licensing.enforcement} at ${facts.licensing.license_endpoint} and never contacts a license service.`,
	serviceTiers: facts.licensing.service_tiers.trim(),
	evidence: [runtimeSource("license"), ...factsEvidence],
};

// Every path the snapshot publishes must be a public contract file, packaged configuration, a
// public sibling or this repository; the retired runtime and private source never appear.
const published = JSON.stringify(contract);
for (const forbidden of [/\.\.\/localcloud\//, /\.java\b/, /\.go\b"/, /localcloud-server/, /"[^"]*\bpkg\/(?!config\/localcloud\.defaults\.yaml)/]) {
	if (forbidden.test(published)) throw new Error(`The snapshot would publish a retired or private path matching ${forbidden}`);
}
await writeFile(contractUrl, `${JSON.stringify(contract, null, 2)}\n`);
console.log(
	`Synced ${contract.services.length} services from runtime ${contract.provenance.runtimeRevision.slice(0, 12)} and CLI ${cliVersion}.`,
);
