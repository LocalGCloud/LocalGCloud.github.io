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
	console.log("Upstream documentation verification skipped: sibling projects are not present.");
	process.exit(0);
}

const assert = (condition, message) => {
	if (!condition) throw new Error(`Upstream documentation: ${message}`);
};
assert(await exists(new URL("docs/MCP_INTEGRATION.md", runtimeRoot)), "runtime MCP guide is missing");
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
	["../localcloud/docs/SERVICE_STATUS.md", new URL("docs/SERVICE_STATUS.md", runtimeRoot)],
	["../localcloud/docs/TLS_AND_TRANSPARENT_NETWORKING.md", new URL("docs/TLS_AND_TRANSPARENT_NETWORKING.md", runtimeRoot)],
	["../localcloud/docs/MCP_INTEGRATION.md", new URL("docs/MCP_INTEGRATION.md", runtimeRoot)],
	["../localcloud/specs/api/catalog.json", new URL("specs/api/catalog.json", runtimeRoot)],
	["../localcloud-cli/README.md", new URL("README.md", cliRoot)],
	["../localcloud-cli/src/localcloud_cli/config.py", new URL("src/localcloud_cli/config.py", cliRoot)],
	["../localcloud-cli/src/localcloud_cli/__init__.py", new URL("src/localcloud_cli/__init__.py", cliRoot)],
	["public/install.sh", new URL("public/install.sh", root)],
]);
for (const [path, url] of upstreamSources) {
	assert(contract.provenance.sourceDigests[path] === await sha256(url), `${path} digest differs`);
}

const defaults = parse(await readFile(new URL("localcloud.defaults.yaml", runtimeRoot), "utf8"));
const catalog = defaults.services.catalog;
assert(Object.keys(catalog).length === contract.services.length, "service count differs from localcloud.defaults.yaml");

for (const service of contract.services) {
	const upstream = catalog[service.id];
	assert(upstream, `${service.id} is absent from localcloud.defaults.yaml`);
	assert(service.availability === upstream.availability, `${service.id} availability differs`);
	assert(service.registryDefaultEnabled === upstream.defaultEnabled, `${service.id} default enablement differs`);
	assert(service.port === (upstream.port === "gateway" ? defaults.server.gateway.port : upstream.port), `${service.id} port differs`);
	assert(service.protocol === upstream.protocol, `${service.id} protocol differs`);
	assert(service.type === upstream.type, `${service.id} runtime type differs`);
	assert(service.minTier === upstream.minTier, `${service.id} minimum tier differs`);
}

assert(contract.operator.gatewayPort === defaults.server.gateway.port, "gateway port differs");
assert(contract.operator.publishedPorts.transparentDns === "53/udp -> 24093/udp", "transparent DNS mapping differs");
assert(contract.operator.publishedPorts.transparentHttp === `80 -> ${defaults.server.gateway.port}`, "transparent HTTP mapping differs");
assert(contract.operator.publishedPorts.transparentHttps === `443 -> tls.port (default ${defaults.tls.port})`, "transparent HTTPS mapping differs");

const cliVersionSource = await readFile(new URL("src/localcloud_cli/__init__.py", cliRoot), "utf8");
const cliVersion = cliVersionSource.match(/__version__ = "([^"]+)"/)?.[1];
assert(cliVersion && contract.cli.releaseBoundary.includes(cliVersion), "CLI version boundary differs");

console.log(`Upstream documentation verified against ${contract.services.length} runtime services and CLI ${cliVersion}.`);
