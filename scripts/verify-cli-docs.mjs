import { readFile } from "node:fs/promises";

const contractUrl = new URL(
	"../src/data/docs-contract.snapshot.json",
	import.meta.url,
);
let contract;
try {
	contract = JSON.parse(await readFile(contractUrl, "utf8"));
} catch (error) {
	throw new Error(`CLI documentation: could not parse ${contractUrl.pathname}`, {
		cause: error,
	});
}
const sources = new Map();
for (const path of [
	"src/pages/index.astro",
	"src/pages/docs/index.mdx",
	"src/pages/docs/configuration.mdx",
	"src/pages/docs/architecture.mdx",
	"src/components/HomepageVariationFieldManual.astro",
	"src/pages/docs/terraform.mdx",
	"src/components/InstallationMethods.astro",
	"src/pages/gcp-emulator.astro",
	"src/pages/how-to-run-google-cloud-locally.astro",
	"src/pages/local-cloud-development.astro",
	"src/pages/404.astro",
	"public/install.sh",
]) {
	sources.set(
		path,
		await readFile(new URL(`../${path}`, import.meta.url), "utf8"),
	);
}
const tutorial = sources.get("src/pages/docs/index.mdx");
const installer = sources.get("public/install.sh");
const homepageInstall = sources.get("src/components/InstallationMethods.astro");
const assert = (condition, message) => {
	if (!condition) throw new Error(`CLI documentation: ${message}`);
};

for (const command of [
	contract.cli.installCommand,
	...contract.cli.quickStart,
]) {
	assert(tutorial.includes(command), `getting started omits ${command}`);
}
for (const phrase of [
	"macOS 13+",
	"glibc 2.35+",
	"local-gcp-project",
	"local-developer",
	"already_running",
	"reconfigured",
	"restarted",
	"remap host ports",
]) {
	assert(
		tutorial.includes(phrase),
		`getting started omits CLI contract phrase: ${phrase}`,
	);
}
for (const phrase of [
	"built-in `localcloud-data` fallback",
	"durable runtime identity",
	"--data-volume NAME",
	"never removes or relabels Docker resources it does not own",
]) {
	const normalizedPhrase = phrase.replace(/\s+/g, " ");
	const found = [...sources.values()].some((source) =>
		source.replace(/\s+/g, " ").includes(normalizedPhrase),
	);
	assert(found, `public docs omit data-volume contract phrase: ${phrase}`);
}
assert(
	tutorial.includes("SHA-256"),
	"getting started must describe checksum verification",
);
assert(
	tutorial.includes("does not verify those bundles"),
	"getting started must distinguish Sigstore publication from installer verification",
);
assert(
	tutorial.includes("except NotFound"),
	"tutorial quick start must reuse its persistent bucket safely",
);
assert(
	tutorial.includes("bucket.reload()"),
	"tutorial quick start must detect existing local state",
);
assert(
	tutorial.includes("Hello, LocalCloud!"),
	"tutorial quick start must document a deterministic result",
);
assert(
	tutorial.includes("so it can run repeatedly"),
	"tutorial must explain repeatability",
);
assert(
	tutorial.includes("docsContract.cli.releaseBoundary"),
	"tutorial must identify the documented CLI release and show how to check it",
);
assert(
	tutorial.includes("127.0.0.1:5380-5405:5380-5405"),
	"manual Docker fallback is not loopback-bound",
);
assert(
	tutorial.includes("agentcloud/localcloud:latest"),
	"manual Docker fallback image does not match reviewed launcher/CLI evidence",
);

const forbidden = [
	{ pattern: "/_localcloud/", label: "legacy operator endpoint" },
	{ pattern: "localcloud/localcloud:", label: "unreviewed image repository" },
	{ pattern: "local-project", label: "stale default project" },
	{ pattern: "24080", label: "legacy gateway port" },
	{ pattern: "24081", label: "legacy storage port" },
	{ pattern: "24082", label: "legacy pubsub port" },
	{ pattern: "24083", label: "legacy firestore port" },
	{ pattern: "24084", label: "legacy bigtable port" },
	{ pattern: "24085", label: "legacy spanner port" },
	{ pattern: "24086", label: "legacy spanner rest port" },
	{ pattern: "24087", label: "legacy bigquery port" },
	{ pattern: "24088", label: "legacy bigquery grpc port" },
	{ pattern: "24089", label: "legacy memorystore port" },
	{ pattern: "-v /var/run/docker.sock", label: "beginner Docker socket mount" },
	{ pattern: "zero code changes", label: "blanket code-compatibility claim" },
	{ pattern: "free for developers", label: "unsafe licensing claim" },
	{ pattern: "96% SQL", label: "unsupported coverage percentage" },
	{ pattern: "95% feature", label: "unsupported coverage percentage" },
	{ pattern: "813 passing", label: "unsupported exact test total" },
	{
		pattern: "process in microseconds",
		label: "unsupported performance claim",
	},
	{
		pattern: "queries return instantly",
		label: "unsupported performance claim",
	},
	{ pattern: "no internet required", label: "categorical offline claim" },
	{ pattern: "selected instance", label: "removed runtime-instance wording" },
	{
		pattern: "Terraform-managed instances",
		label: "removed runtime-instance wording",
	},
];
for (const [path, source] of sources) {
	const lowered = source.toLowerCase();
	for (const item of forbidden) {
		assert(
			!lowered.includes(item.pattern.toLowerCase()),
			`${path} contains ${item.label}: ${item.pattern}`,
		);
	}
}

assert(
	installer.includes("MANUAL_URL=https://local.cloud/docs/#manual-docker-path"),
	"installer manual fallback anchor drifted",
);
assert(
	installer.includes("Next steps:"),
	"installer lacks non-interactive next steps",
);
assert(
	installer.includes(
		"lc is an alias for localcloud; both commands behave identically.",
	),
	"installer lacks the lc alias contract",
);
assert(installer.includes("source %s"), "installer lacks PATH source recovery");
assert(
	installer.includes("persistent volumes remain intact"),
	"installer lacks uninstall preservation note",
);
assert(
	installer.includes("[ ! -r /dev/tty ] || [ ! -w /dev/tty ]") &&
		installer.includes(": </dev/tty >/dev/tty"),
	"installer lacks genuine non-TTY path",
);
assert(
	installer.includes("Run LocalCloud doctor and start now? [Y/n]"),
	"installer lacks interactive prompt",
);
assert(
	homepageInstall.includes("productFacts.installScriptCommand"),
	"homepage does not derive the install command",
);
assert(
	homepageInstall.includes("default port is already in use"),
	"homepage does not warn that the CLI can pick another port",
);

const configuration = sources.get("src/pages/docs/configuration.mdx");
for (const phrase of [
	"version: 1",
	"context:",
	"host:",
	"services:",
	"enabled: default",
	"server:",
	"host.data_volume",
]) {
	assert(configuration.includes(phrase), `configuration omits current schema phrase: ${phrase}`);
}
assert(
	!/^project:\s|^data_volume:\s|^transparent_network:\s/m.test(configuration),
	"configuration contains a removed flat-key example",
);
for (const path of ["src/pages/docs/architecture.mdx", "src/pages/docs/terraform.mdx"]) {
	const source = sources.get(path);
	assert(!source.includes("24094") && !source.includes("24095"), `${path} retains retired transparent-network ports`);
	assert(source.includes("5381"), `${path} omits native TLS default port`);
}

const catalogSurfaces = [
	"src/pages/docs/index.mdx",
	"src/pages/gcp-emulator.astro",
	"src/pages/how-to-run-google-cloud-locally.astro",
	"src/pages/local-cloud-development.astro",
];
for (const path of catalogSurfaces) {
	const source = sources.get(path);
	assert(
		source.includes("publishedServiceCount"),
		`${path} does not distinguish published service guides from the 27-entry runtime registry`,
	);
}

console.log(
	`CLI documentation verified across ${sources.size} Phase 2 surfaces: commands, defaults, safety boundaries, repeatability, and installer recovery paths.`,
);
