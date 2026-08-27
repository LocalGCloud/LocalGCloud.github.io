import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
const runtimeRoot = new URL("../../localcloud/", import.meta.url);
const cliRoot = new URL("../../localcloud-cli/", import.meta.url);
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
	{ path: "../localcloud/localcloud.defaults.yaml", url: new URL("localcloud.defaults.yaml", runtimeRoot), repository: runtimeRoot, repositoryPath: "localcloud.defaults.yaml" },
	{ path: "../localcloud/documentation.yaml", url: new URL("documentation.yaml", runtimeRoot), repository: runtimeRoot, repositoryPath: "documentation.yaml" },
	{ path: "../localcloud/docs/SERVICE_STATUS.md", url: new URL("docs/SERVICE_STATUS.md", runtimeRoot), repository: runtimeRoot, repositoryPath: "docs/SERVICE_STATUS.md" },
	{ path: "../localcloud/docs/TLS_AND_TRANSPARENT_NETWORKING.md", url: new URL("docs/TLS_AND_TRANSPARENT_NETWORKING.md", runtimeRoot), repository: runtimeRoot, repositoryPath: "docs/TLS_AND_TRANSPARENT_NETWORKING.md" },
	{ path: "../localcloud/docs/MCP_INTEGRATION.md", url: new URL("docs/MCP_INTEGRATION.md", runtimeRoot), repository: runtimeRoot, repositoryPath: "docs/MCP_INTEGRATION.md" },
	{ path: "../localcloud/specs/api/catalog.json", url: new URL("specs/api/catalog.json", runtimeRoot), repository: runtimeRoot, repositoryPath: "specs/api/catalog.json" },
	{ path: "../localcloud-cli/README.md", url: new URL("README.md", cliRoot), repository: cliRoot, repositoryPath: "README.md" },
	{ path: "../localcloud-cli/src/localcloud_cli/config.py", url: new URL("src/localcloud_cli/config.py", cliRoot), repository: cliRoot, repositoryPath: "src/localcloud_cli/config.py" },
	{ path: "../localcloud-cli/src/localcloud_cli/__init__.py", url: new URL("src/localcloud_cli/__init__.py", cliRoot), repository: cliRoot, repositoryPath: "src/localcloud_cli/__init__.py" },
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
contract.product.serviceCount = Object.keys(runtimeCatalog).length;
contract.product.defaultProject = defaults.context.project;
contract.operator.gatewayPort = defaults.server.gateway.port;
contract.operator.publishedPorts = {
	services: "24080-24092",
	transparentDns: "53/udp -> 24093/udp",
	transparentHttp: `80 -> ${defaults.server.gateway.port}`,
	transparentHttps: `443 -> tls.port (default ${defaults.tls.port})`,
};
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

const envValue = (service) => {
	const port = service.port === "gateway" ? defaults.server.gateway.port : service.port;
	return `${service.envValuePrefix ?? ""}localhost:${port}`;
};

contract.services = contract.services.map((service) => {
	const runtime = runtimeCatalog[service.id];
	const docs = documentationServices[service.id];
	if (!runtime || !docs) {
		throw new Error(`Upstream documentation is missing service ${service.id}`);
	}

	const operations = docs.operations.map((operation) => {
		const status = statusMap[operation.status];
		if (!status) {
			throw new Error(
				`Unknown operation status ${operation.status} for ${service.id}.${operation.id}`,
			);
		}
		const limitations = [];
		if (operation.notes && status !== "verified") limitations.push(operation.notes);
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

	return {
		...service,
		availability: runtime.availability,
		name: runtime.displayName,
		port:
			runtime.port === "gateway" ? defaults.server.gateway.port : runtime.port,
		additionalPorts: runtime.additionalPorts ?? {},
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
		status: statusMap[docs.coverage_status] ?? service.status,
		limitations: docs.limitations ?? [],
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
