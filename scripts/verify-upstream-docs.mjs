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

// Freshness warnings; strict mode (re-sync sessions) turns them into failures.
function report() {
	for (const warning of warnings) console.warn(process.env.GITHUB_ACTIONS ? `::warning title=Upstream documentation::${warning}` : `Warning: ${warning}`);
	if (strict && warnings.length) throw new Error("Upstream documentation: UPSTREAM_DOCS_STRICT=1 requires the snapshot to match upstream HEAD and committed sources");
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

// The snapshot must match the upstream commits it records (integrity). Upstream moving past
// them (freshness) is reported as a warning, or an error with UPSTREAM_DOCS_STRICT=1 when
// re-syncing (see BUILD.md).
const strict = process.env.UPSTREAM_DOCS_STRICT === "1";
const warnings = [];
const bigqueryRoot = new URL("../../local_cloud_dependencies/bigquery-emulator-on-duckdb/", import.meta.url);
const { runtimeRevision, cliRevision } = contract.provenance;
const worktreeSources = new Set(contract.provenance.worktreeSources);
assert(commitExists(runtimeRoot, runtimeRevision), "runtime revision does not exist");
assert(commitExists(cliRoot, cliRevision), "CLI revision does not exist");
assert(commitExists(bigqueryRoot, contract.bigqueryCoverage.revision), "BigQuery coverage revision does not exist");
for (const [name, repository, recorded] of [
	["localcloud", runtimeRoot, runtimeRevision],
	["localcloud-cli", cliRoot, cliRevision],
	["bigquery-emulator-on-duckdb", bigqueryRoot, contract.bigqueryCoverage.revision],
]) {
	const head = revision(repository);
	if (head === recorded) continue;
	const ahead = execFileSync("git", ["rev-list", "--count", `${recorded}..${head}`], { cwd: repository, encoding: "utf8" }).trim();
	warnings.push(`${name} is ${ahead} commit(s) ahead of the snapshot (${recorded.slice(0, 12)} → ${head.slice(0, 12)}); run scripts/sync-upstream-docs.mjs to publish newer upstream facts`);
}
const gitShow = (repository, commit, path) => {
	try {
		return execFileSync("git", ["show", `${commit}:${path}`], { cwd: repository, maxBuffer: 64 * 1024 * 1024 });
	} catch {
		return null;
	}
};
const readOptional = async (url) => {
	try {
		return await readFile(url);
	} catch {
		return null;
	}
};
const digestOf = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const upstreamPath = (path) =>
	path.startsWith("../localcloud-cli/") ? [cliRoot, cliRevision, path.slice("../localcloud-cli/".length)]
		: path.startsWith("../localcloud/") ? [runtimeRoot, runtimeRevision, path.slice("../localcloud/".length)]
			: null;

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
// Each source resolves to the bytes the snapshot was synced from: the recorded commit or, for
// files synced from uncommitted upstream changes, the working copy while it still matches.
const sources = new Map();
for (const [path, url] of upstreamSources) {
	const expected = contract.provenance.sourceDigests[path];
	const location = upstreamPath(path);
	const candidates = location ? [gitShow(...location)] : [];
	if (!location || worktreeSources.has(path)) candidates.push(await readOptional(url));
	const bytes = candidates.find((candidate) => candidate && digestOf(candidate) === expected);
	if (bytes) sources.set(path, bytes);
	else if (location && worktreeSources.has(path)) warnings.push(`${path} was synced from uncommitted changes that no longer match upstream; checks that read it are skipped`);
	else assert(false, `${path} digest differs from the ${location ? "recorded revision" : "snapshot"}`);
}
const sourceText = (path) => sources.get(path)?.toString("utf8");

const coveragePath = "../local_cloud_dependencies/bigquery-emulator-on-duckdb/docs/coverage-matrix.csv";
const coverageProjection = (csvBytes) => JSON.parse(execFileSync("python3", ["-c", `
import csv, io, json, sys
from collections import Counter
rows = list(csv.DictReader(io.StringIO(sys.stdin.read())))
print(json.dumps({
    'total': len(rows),
    'development': dict(Counter(row['development_status'] for row in rows)),
    'production': dict(Counter(row['production_parity'] for row in rows)),
    'partialCapabilities': [{'id': row['capability_id'], 'name': row['feature_name'], 'boundary': row['production_limitations'], 'notes': row['notes']} for row in rows if row['development_status'] == 'partial'],
}))
`], { input: csvBytes, encoding: "utf8" }));
const coverageCandidates = [gitShow(bigqueryRoot, contract.bigqueryCoverage.revision, "docs/coverage-matrix.csv")];
if (worktreeSources.has(coveragePath)) coverageCandidates.push(await readOptional(new URL("docs/coverage-matrix.csv", bigqueryRoot)));
const coverageMatches = coverageCandidates.some((csvBytes) => csvBytes &&
	JSON.stringify(contract.bigqueryCoverage) === JSON.stringify({ ...coverageProjection(csvBytes), revision: contract.bigqueryCoverage.revision }));
if (!coverageMatches && worktreeSources.has(coveragePath)) warnings.push(`${coveragePath} was synced from uncommitted changes that no longer match upstream`);
else assert(coverageMatches, "BigQuery coverage projection differs from the matrix at the recorded revision");

const defaultsText = sourceText("../localcloud/localcloud.defaults.yaml");
const documentationText = sourceText("../localcloud/documentation.yaml");
if (!defaultsText || !documentationText) {
	report();
	console.log("Upstream documentation integrity verified; service-level checks skipped (see warnings).");
	process.exit(0);
}
const defaults = parse(defaultsText);
const catalog = defaults.services.catalog;
const documentation = parse(documentationText);
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
const cliConfig = sourceText("../localcloud-cli/src/localcloud_cli/config.py") ?? "";
if (cliConfig) assert(cliConfig.includes("local_only: bool = False") && contract.cli.bindAddress === "0.0.0.0", "CLI host binding default differs");
const seedSource = sourceText("../localcloud/localcloud-server/src/main/java/com/localcloud/admin/SeedService.java") ?? "";
if (seedSource) for (const [field, constant] of [["supportedServices", "IMPLEMENTED_SEED_SERVICES"], ["volatileServices", "VOLATILE_SEED_SERVICES"]]) {
	const body = seedSource.match(new RegExp(`${constant} = Set\\.of\\(([\\s\\S]*?)\\);`))?.[1];
	assert(body !== undefined, `cannot resolve ${constant}`);
	assert(JSON.stringify(contract.seed[field]) === JSON.stringify([...body.matchAll(/"([a-z]+)"/g)].map((match) => match[1])), `${field} differs`);
}
if (seedSource) assert(seedSource.includes(`getOrDefault("LOCALCLOUD_SEED_FILE", "${contract.seed.defaultSeedFile}")`), "seed file default differs");

assert(contract.operator.gatewayPort === defaults.server.gateway.port, "gateway port differs");
assert(contract.operator.publishedPorts.services === "5380-5405", "services published range differs");
assert(contract.operator.publishedPorts.transparentDns === "53/udp -> 5410/udp", "transparent DNS mapping differs");
assert(contract.operator.publishedPorts.transparentHttp === `80 -> ${defaults.server.gateway.port}`, "transparent HTTP mapping differs");
assert(contract.operator.publishedPorts.transparentHttps === `443 -> tls.port (default ${defaults.tls.port})`, "transparent HTTPS mapping differs");

const cliVersionSource = sourceText("../localcloud-cli/src/localcloud_cli/__init__.py");
const cliVersion = cliVersionSource?.match(/__version__ = "([^"]+)"/)?.[1];
if (cliVersionSource) assert(cliVersion && contract.cli.releaseBoundary.includes(cliVersion), "CLI version boundary differs");

report();
console.log(`Upstream documentation verified against the recorded revisions: ${contract.services.length} runtime services, CLI ${cliVersion ?? "(version source skipped)"}.`);
