import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
const runtimeRoot = new URL("../../localcloud/", import.meta.url);
const cliRoot = new URL("../../localcloud-cli/", import.meta.url);
const contract = JSON.parse(
	await readFile(new URL("src/data/docs-contract.snapshot.json", root), "utf8"),
);

const exists = async (url) => {
	try {
		await access(url);
		return true;
	} catch {
		return false;
	}
};

if (!(await exists(new URL("localcloud.defaults.yaml", runtimeRoot)))) {
	const message = "Upstream documentation verification skipped: sibling projects are not present.";
	// CI never has the siblings, so make the skip visible in the run summary.
	console.log(process.env.GITHUB_ACTIONS ? `::warning title=Upstream documentation::${message}` : message);
	process.exit(0);
}

const assert = (condition, message) => {
	if (!condition) throw new Error(`Upstream documentation: ${message}`);
};
assert(await exists(new URL("docs/guides/mcp-integration.md", runtimeRoot)), "runtime MCP guide is missing");
const revision = (url) =>
	execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: url,
		encoding: "utf8",
	}).trim();
const commitExists = (url, commit) => {
	try {
		execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
			cwd: url,
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
};
const sha256 = async (url) =>
	`sha256:${createHash("sha256").update(await readFile(url)).digest("hex")}`;

assert(commitExists(runtimeRoot, contract.provenance.runtimeRevision), "runtime revision does not exist");
assert(commitExists(cliRoot, contract.provenance.cliRevision), "CLI revision does not exist");
assert(contract.provenance.runtimeRevision === revision(runtimeRoot), "snapshot is not synced to the runtime HEAD");
assert(contract.provenance.cliRevision === revision(cliRoot), "snapshot is not synced to the CLI HEAD");

const upstreamSources = new Map([
	["../localcloud/localcloud.defaults.yaml", new URL("localcloud.defaults.yaml", runtimeRoot)],
	["../localcloud/documentation.yaml", new URL("documentation.yaml", runtimeRoot)],
	["../localcloud/docs/status/service-status.md", new URL("docs/status/service-status.md", runtimeRoot)],
	["../localcloud/docs/architecture/networking-and-tls.md", new URL("docs/architecture/networking-and-tls.md", runtimeRoot)],
	["../localcloud/docs/guides/mcp-integration.md", new URL("docs/guides/mcp-integration.md", runtimeRoot)],
	["../localcloud/specs/api/catalog.json", new URL("specs/api/catalog.json", runtimeRoot)],
	...["Dockerfile", "LICENSE", "docker/bigquery-start.sh", "docker/docker-entrypoint.sh", "localcloud-server/src/main/java/com/localcloud/admin/SeedService.java", "localcloud-server/src/main/java/com/localcloud/emulators/pubsub/PubSubStore.java", "localcloud-server/src/main/java/com/localcloud/admin/TelemetryService.java", "localcloud-server/src/main/java/com/localcloud/LocalCloudApplication.java"].map((path) => [`../localcloud/${path}`, new URL(path, runtimeRoot)]),
	["../localcloud-cli/README.md", new URL("README.md", cliRoot)],
	["../localcloud-cli/src/localcloud_cli/config.py", new URL("src/localcloud_cli/config.py", cliRoot)],
	["../localcloud-cli/src/localcloud_cli/__init__.py", new URL("src/localcloud_cli/__init__.py", cliRoot)],
	...["src/localcloud_cli/constants.py", "src/localcloud_cli/docker_runtime.py"].map((path) => [`../localcloud-cli/${path}`, new URL(path, cliRoot)]),
	["public/install.sh", new URL("public/install.sh", root)],
	["../local_cloud_dependencies/bigquery-emulator-on-duckdb/docs/coverage-matrix.csv", new URL("../../local_cloud_dependencies/bigquery-emulator-on-duckdb/docs/coverage-matrix.csv", import.meta.url)],
]);
for (const [path, url] of upstreamSources) {
	assert(contract.provenance.sourceDigests[path] === await sha256(url), `${path} digest differs`);
}

const bigqueryRoot = new URL("../../local_cloud_dependencies/bigquery-emulator-on-duckdb/", import.meta.url);
const expectedCoverage = JSON.parse(execFileSync("python3", ["-c", `
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
expectedCoverage.revision = revision(bigqueryRoot);
assert(JSON.stringify(contract.bigqueryCoverage) === JSON.stringify(expectedCoverage), "BigQuery coverage projection differs from the matrix");

const defaults = parse(await readFile(new URL("localcloud.defaults.yaml", runtimeRoot), "utf8"));
const catalog = defaults.services.catalog;
const documentation = parse(await readFile(new URL("documentation.yaml", runtimeRoot), "utf8"));
const statusMap = { supported: "verified", partial: "partial", unverified: "unknown", unsupported: "unsupported", prod_only: "unsupported" };
assert(Object.keys(catalog).length === contract.services.length, "service count differs from localcloud.defaults.yaml");

for (const service of contract.services) {
	const upstream = catalog[service.id];
	assert(upstream, `${service.id} is absent from localcloud.defaults.yaml`);
	assert(service.availability === upstream.availability, `${service.id} availability differs`);
	assert(service.registryDefaultEnabled === upstream.defaultEnabled, `${service.id} default enablement differs`);
	const expectedPort = (upstream.plaintextPort ?? upstream.port) === "gateway" ? defaults.server.gateway.port : (upstream.plaintextPort ?? upstream.port);
	assert(service.port === expectedPort, `${service.id} port differs`);
	assert(service.protocol === upstream.protocol, `${service.id} protocol differs`);
	assert(service.type === upstream.type, `${service.id} runtime type differs`);
	assert(service.minTier === upstream.minTier, `${service.id} minimum tier differs`);
	assert(service.envVar === upstream.envVar, `${service.id} environment variable differs`);
	assert(service.envValue === `${upstream.envValuePrefix ?? ""}localhost:${expectedPort}`, `${service.id} environment value differs`);
	const docs = documentation.services[service.id];
	assert(service.status === statusMap[docs.coverage_status], `${service.id} compatibility status differs`);
	const expectedLimitations = service.id === "bigquery" ? [
		"Coverage classifications are source records, not proof of full Google Cloud semantic parity or assembled-image qualification.",
		...contract.bigqueryCoverage.partialCapabilities.map((capability) => `${capability.id}: ${capability.boundary}`),
		"Google-managed reservations, fleet scale, replication, and IAM integrations require production validation.",
	] : docs.limitations ?? [];
	assert(JSON.stringify(service.limitations) === JSON.stringify(expectedLimitations), `${service.id} limitations differ`);
	const operations = docs.operations.map((operation) => {
		const status = statusMap[operation.status];
		assert(status, `${service.id}.${operation.id} has an unknown upstream status`);
		return {
			id: `${service.id}.${operation.id}`, label: operation.operation, status,
			limitations: service.id === "bigquery" && operation.id === "sql.query"
				? ["Query coverage varies by capability and input. Review the dependency matrix, including partial and unsupported records; qualify semantics and errors with application queries."]
				: operation.notes ? [operation.notes] : status === "unsupported" ? ["This operation is not available in LocalCloud."] : [],
			evidence: ["../localcloud/documentation.yaml"],
		};
	});
	assert(JSON.stringify(service.operations) === JSON.stringify(operations), `${service.id} operation status or boundaries differ`);
	if (upstream.type === "facade") assert(service.implementation === "local-facade", `${service.id} facade implementation differs`);
}

assert(contract.cli.dockerSocketDefault === defaults.host.docker_socket, "Docker access mode differs");
const cliConfig = await readFile(new URL("src/localcloud_cli/config.py", cliRoot), "utf8");
assert(cliConfig.includes("local_only: bool = False") && contract.cli.bindAddress === "0.0.0.0", "CLI host binding default differs");
const seedSource = await readFile(new URL("localcloud-server/src/main/java/com/localcloud/admin/SeedService.java", runtimeRoot), "utf8");
for (const [field, constant] of [["supportedServices", "IMPLEMENTED_SEED_SERVICES"], ["volatileServices", "VOLATILE_SEED_SERVICES"]]) {
	const body = seedSource.match(new RegExp(`${constant} = Set\\.of\\(([\\s\\S]*?)\\);`))?.[1];
	assert(body !== undefined, `cannot resolve ${constant}`);
	assert(JSON.stringify(contract.seed[field]) === JSON.stringify([...body.matchAll(/"([a-z]+)"/g)].map((match) => match[1])), `${field} differs`);
}
assert(seedSource.includes(`getOrDefault("LOCALCLOUD_SEED_FILE", "${contract.seed.defaultSeedFile}")`), "seed file default differs");

assert(contract.operator.gatewayPort === defaults.server.gateway.port, "gateway port differs");
assert(contract.operator.publishedPorts.services === "5380-5405", "services published range differs");
assert(contract.operator.publishedPorts.transparentDns === "53/udp -> 5410/udp", "transparent DNS mapping differs");
assert(contract.operator.publishedPorts.transparentHttp === `80 -> ${defaults.server.gateway.port}`, "transparent HTTP mapping differs");
assert(contract.operator.publishedPorts.transparentHttps === `443 -> tls.port (default ${defaults.tls.port})`, "transparent HTTPS mapping differs");

const cliVersionSource = await readFile(new URL("src/localcloud_cli/__init__.py", cliRoot), "utf8");
const cliVersion = cliVersionSource.match(/__version__ = "([^"]+)"/)?.[1];
assert(cliVersion && contract.cli.releaseBoundary.includes(cliVersion), "CLI version boundary differs");

console.log(`Upstream documentation verified against ${contract.services.length} runtime services and CLI ${cliVersion}.`);
