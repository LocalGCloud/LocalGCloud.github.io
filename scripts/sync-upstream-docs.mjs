import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
const runtimeRoot = new URL("../../localcloud/", import.meta.url);
const cliRoot = new URL("../../localcloud-cli/", import.meta.url);
const bigqueryRoot = new URL("../../local_cloud_dependencies/bigquery-emulator-on-duckdb/", import.meta.url);
const contractUrl = new URL("src/data/docs-contract.snapshot.json", root);

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
const defaults = parse(await read(new URL("localcloud.defaults.yaml", runtimeRoot)));
const documentation = parse(await read(new URL("documentation.yaml", runtimeRoot)));
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
const sourceFiles = [
	{ path: "../local_cloud_dependencies/bigquery-emulator-on-duckdb/docs/coverage-matrix.csv", url: new URL("docs/coverage-matrix.csv", bigqueryRoot), repository: bigqueryRoot, repositoryPath: "docs/coverage-matrix.csv" },
	{ path: "../localcloud/localcloud.defaults.yaml", url: new URL("localcloud.defaults.yaml", runtimeRoot), repository: runtimeRoot, repositoryPath: "localcloud.defaults.yaml" },
	{ path: "../localcloud/documentation.yaml", url: new URL("documentation.yaml", runtimeRoot), repository: runtimeRoot, repositoryPath: "documentation.yaml" },
	{ path: "../localcloud/docs/status/service-status.md", url: new URL("docs/status/service-status.md", runtimeRoot), repository: runtimeRoot, repositoryPath: "docs/status/service-status.md" },
	{ path: "../localcloud/docs/architecture/networking-and-tls.md", url: new URL("docs/architecture/networking-and-tls.md", runtimeRoot), repository: runtimeRoot, repositoryPath: "docs/architecture/networking-and-tls.md" },
	{ path: "../localcloud/docs/guides/mcp-integration.md", url: new URL("docs/guides/mcp-integration.md", runtimeRoot), repository: runtimeRoot, repositoryPath: "docs/guides/mcp-integration.md" },
	{ path: "../localcloud/specs/api/catalog.json", url: new URL("specs/api/catalog.json", runtimeRoot), repository: runtimeRoot, repositoryPath: "specs/api/catalog.json" },
	...[
		"Dockerfile", "LICENSE", "docker/bigquery-start.sh", "docker/docker-entrypoint.sh",
		"localcloud-server/src/main/java/com/localcloud/admin/SeedService.java",
		"localcloud-server/src/main/java/com/localcloud/emulators/pubsub/PubSubStore.java",
		"localcloud-server/src/main/java/com/localcloud/admin/TelemetryService.java",
		"localcloud-server/src/main/java/com/localcloud/LocalCloudApplication.java",
	].map((path) => ({ path: `../localcloud/${path}`, url: new URL(path, runtimeRoot), repository: runtimeRoot, repositoryPath: path })),
	{ path: "../localcloud-cli/README.md", url: new URL("README.md", cliRoot), repository: cliRoot, repositoryPath: "README.md" },
	{ path: "../localcloud-cli/src/localcloud_cli/config.py", url: new URL("src/localcloud_cli/config.py", cliRoot), repository: cliRoot, repositoryPath: "src/localcloud_cli/config.py" },
	{ path: "../localcloud-cli/src/localcloud_cli/__init__.py", url: new URL("src/localcloud_cli/__init__.py", cliRoot), repository: cliRoot, repositoryPath: "src/localcloud_cli/__init__.py" },
	...[
		"src/localcloud_cli/constants.py", "src/localcloud_cli/docker_runtime.py",
	].map((path) => ({ path: `../localcloud-cli/${path}`, url: new URL(path, cliRoot), repository: cliRoot, repositoryPath: path })),
	{ path: "public/install.sh", url: new URL("public/install.sh", root), repository: root, repositoryPath: "public/install.sh" },
];
contract.provenance.sources = sourceFiles.map((source) => source.path);
contract.provenance.sourceDigests = Object.fromEntries(
	await Promise.all(
		sourceFiles.map(async (source) => [source.path, await sha256(source.url)]),
	),
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
contract.operator.publishedPorts = {
	services: "5380-5405",
	transparentDns: "53/udp -> 5410/udp",
	transparentHttp: `80 -> ${defaults.server.gateway.port}`,
	transparentHttps: `443 -> tls.port (default ${defaults.tls.port})`,
};
contract.operator.manualDockerCommand = `docker volume create localcloud-data\n\ndocker run -d --name localcloud \\\n  -p 127.0.0.1:5380-5405:5380-5405 \\\n  -m 4g \\\n  -v localcloud-data:/var/lib/localcloud \\\n  agentcloud/localcloud:latest`;
contract.cli.releaseBoundary = contract.provenance.worktreeSources.some((path) => path.startsWith("../localcloud-cli/"))
	? `CLI ${cliVersion} behavior is documented from the current sibling source snapshot. Source digests identify working-tree changes not captured by cliRevision. Use localcloud --version to confirm the installed release.`
	: `CLI behavior is documented for version ${cliVersion} from revision ${contract.provenance.cliRevision}. Use localcloud --version to confirm the installed release.`;

const evidencePath = (value) => {
	if (value === "../localcloud/services.yaml") {
		return "../localcloud/localcloud.defaults.yaml";
	}
	if (
		value.startsWith(
			"../localcloud/localcloud-server/src/main/resources/compatibility/services/",
		)
	) {
		return "../localcloud/documentation.yaml";
	}
	return value;
};

const replaceEvidence = (value) => {
	if (Array.isArray(value)) {
		return [...new Set(value.map(replaceEvidence))];
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, replaceEvidence(item)]),
		);
	}
	return typeof value === "string" ? evidencePath(value) : value;
};

const statusMap = {
	supported: "verified",
	partial: "partial",
	unverified: "unknown",
	unsupported: "unsupported",
	prod_only: "unsupported",
};

const seedSource = await read(new URL("localcloud-server/src/main/java/com/localcloud/admin/SeedService.java", runtimeRoot));
const seedServices = seedSource.match(/IMPLEMENTED_SEED_SERVICES = Set\.of\(([\s\S]*?)\);/)?.[1];
const volatileServices = seedSource.match(/VOLATILE_SEED_SERVICES = Set\.of\(([\s\S]*?)\);/)?.[1];
if (seedServices === undefined || volatileServices === undefined) throw new Error("Unable to read seed registrars");
contract.seed.supportedServices = [...seedServices.matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
contract.seed.volatileServices = [...volatileServices.matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
contract.seed.defaultSeedFile = seedSource.match(/getOrDefault\("LOCALCLOUD_SEED_FILE", "([^"]+)"\)/)?.[1];
if (!contract.seed.defaultSeedFile) throw new Error("Unable to read the default seed file");
contract.seed.limitations = [
	"Seed registrars do not establish supported application integrations; consult operation-level compatibility.",
	"POST /reseed replaces sample resources in the selected project, including changes made inside them; unrelated resources are retained.",
	"Managed CLI lifecycle commands do not mount or apply seed files; host.seed is accepted but ignored. Container bootstrap and Console reseeding own samples.",
	"LOCALCLOUD_TERRAFORM_MODE=true skips seeding. Volatile mode currently has no eligible services.",
];
contract.operator.endpoints.readiness = "/readiness";
contract.privacy.runtimeTelemetry.limitations = [
	"LOCALCLOUD_TELEMETRY=false disables regular runtime and Console reporting; a configured event API key still permits one telemetry_disabled startup event.",
	"External lifecycle failures enqueue service_error events; registry snapshots have no exit code. The client uses normal TLS certificate verification.",
	"Console summaries contain aggregate view, action, and error counts and are batched up to once per minute. Failed reports are queued locally for retry.",
];
for (const event of ["service_error", "console_summary"]) {
	if (!contract.privacy.runtimeTelemetry.events.includes(event)) contract.privacy.runtimeTelemetry.events.push(event);
}
// Certificate setup now imports explicitly mounted CAs; the remote probe was removed.
contract.privacy.outboundBehaviors = contract.privacy.outboundBehaviors.filter((item) => item.id !== "ca-probe");
contract.privacy.websiteAnalytics.processor = "PostHog and Cloudflare Web Analytics";
for (const event of ["page-load and performance measurements", "IP-based location information"]) {
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
			evidence: ["../localcloud/documentation.yaml"],
		};
	});

	const rawPort = servicePort(runtime);
	const additionalPorts = { ...(runtime.additionalPorts ?? {}) };
	if (runtime.gcloudPort && !additionalPorts.rest) additionalPorts.rest = runtime.gcloudPort;
	if (runtime.grpcPort && !additionalPorts.grpc) additionalPorts.grpc = runtime.grpcPort;

	return {
		...service,
		implementation: runtime.type === "facade" ? "local-facade" : service.implementation,
		persistence: service.id === "pubsub" ? {
			scope: "service-data",
			backingStore: "PostgreSQL under /var/lib/localcloud/pgdata",
			restartBehavior: "Topics, subscriptions, and queued messages persist in PostgreSQL. Delivery workers and active connections restart; qualify the exact replay and redelivery workflow.",
			recoveryLimitations: ["A mounted volume does not provide production delivery, replication, or recovery guarantees; qualify the assembled image."],
			qualification: "release-unverified",
			evidence: ["../localcloud/documentation.yaml", "../localcloud/localcloud-server/src/main/java/com/localcloud/emulators/pubsub/PubSubStore.java"],
		} : service.id === "firestore" ? {
			scope: "service-data",
			backingStore: "External emulator exports and checkpoint metadata beneath the mounted LocalCloud data root",
			restartBehavior: "Historical isolated clean-restart evidence restored document contents but changed timestamps. Qualify recovery in the exact assembled image.",
			recoveryLimitations: ["Checkpoints and seed registration do not establish timestamp, precondition, listener, or transaction fidelity."],
			qualification: "release-unverified",
			evidence: ["../localcloud/documentation.yaml"],
		} : service.persistence,
		availability: runtime.availability,
		name: runtime.displayName,
		port: rawPort === "gateway" ? defaults.server.gateway.port : rawPort,
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
			evidence: [
				"../localcloud/localcloud.defaults.yaml",
				"../localcloud/documentation.yaml",
			],
			limitation:
				"Default enablement follows the current runtime catalog and remains subject to license-tier gates.",
		},
		status: statusMap[docs.coverage_status],
		// The matrix records concrete gaps; upstream prose still has stale totals and global parity claims.
		limitations: service.id === "bigquery" ? [
			"Coverage classifications are source records, not proof of full Google Cloud semantic parity or assembled-image qualification.",
			...contract.bigqueryCoverage.partialCapabilities.map((capability) => `${capability.id}: ${capability.boundary}`),
			"Google-managed reservations, fleet scale, replication, and IAM integrations require production validation.",
		] : docs.limitations ?? [],
		operations,
		evidence: [
			"../localcloud/localcloud.defaults.yaml",
			"../localcloud/documentation.yaml",
		],
		published: runtime.availability === "available",
	};
});

const refreshed = replaceEvidence(contract);
await writeFile(contractUrl, `${JSON.stringify(refreshed, null, 2)}\n`);
console.log(
	`Synced ${refreshed.services.length} services from runtime ${refreshed.provenance.runtimeRevision.slice(0, 12)} and CLI ${cliVersion}.`,
);
