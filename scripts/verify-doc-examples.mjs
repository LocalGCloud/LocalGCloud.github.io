import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parse as parseYaml } from "yaml";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const assert = (condition, message) => {
	if (!condition)
		throw new Error(`Documentation example verification: ${message}`);
};

let contract;
try {
	contract = JSON.parse(await read("src/data/docs-contract.snapshot.json"));
} catch (error) {
	throw new Error(
		"Documentation example verification: docs contract is invalid JSON",
		{ cause: error },
	);
}

const allowedServices = new Set([
	"gcs",
	"pubsub",
	"bigquery",
	"spanner",
	"secretmanager",
	"cloudtasks",
	"memorystore",
	"workflows",
	"cloudscheduler",
	"scheduler",
	"cloudfunctions",
	"functions",
	"alloydb",
	"dataproc",
	"cloudiam",
	"iam",
	"cloudsql",
	"bigtable",
	"sheets",
	"firestore",
	"kms",
]);

const validateSeedDocument = (document, label) => {
	assert(
		document && typeof document === "object" && !Array.isArray(document),
		`${label} must be a YAML mapping`,
	);
	const serviceMaps =
		document.projects && typeof document.projects === "object"
			? Object.entries(document.projects).map(([project, value]) => {
					assert(project.length > 0, `${label} contains an empty project ID`);
					assert(
						value && typeof value === "object" && !Array.isArray(value),
						`${label} project ${project} must be a mapping`,
					);
					return value.services ?? value;
				})
			: [document.services ?? document];

	for (const services of serviceMaps) {
		assert(
			services && typeof services === "object" && !Array.isArray(services),
			`${label} service envelope must be a mapping`,
		);
		for (const key of Object.keys(services))
			assert(
				allowedServices.has(key),
				`${label} uses unsupported service key ${key}`,
			);
		assert(
			!Object.hasOwn(services, "storage"),
			`${label} uses storage instead of gcs`,
		);
		assert(
			!Object.hasOwn(services, "secrets"),
			`${label} puts secrets outside secretmanager`,
		);

		const bigquery = services.bigquery;
		if (bigquery) {
			for (const table of bigquery.tables ?? []) {
				assert(
					typeof table.dataset === "string" && table.dataset.length > 0,
					`${label} BigQuery table lacks dataset`,
				);
				assert(
					typeof table.name === "string" && table.name.length > 0,
					`${label} BigQuery table lacks name`,
				);
			}
		}
		if (services.secretmanager) {
			assert(
				Array.isArray(services.secretmanager.secrets),
				`${label} Secret Manager must use secretmanager.secrets`,
			);
		}
	}
};

const seedSources = [
	"src/pages/docs/seed-data.mdx",
	"agent-skills/skills/localcloud-seed-data/SKILL.md",
	"agent-skills/skills/localcloud-seed-data/references/seed-data.md",
	"agent-skills/skills/localcloud-seed-data/assets/sample-seed.yaml",
	"test-fixtures/docs/seed-flat.yaml",
	"test-fixtures/docs/seed-services.yaml",
	"test-fixtures/docs/seed-projects.yaml",
];

let parsedSeedExamples = 0;
for (const path of seedSources) {
	const source = await read(path);
	const documents = [".yaml", ".yml"].includes(extname(path))
		? [{ body: source, label: path }]
		: [...source.matchAll(/```ya?ml\s*\n([\s\S]*?)```/g)].map((match, index) => ({
				body: match[1],
				label: `${path} YAML fence ${index + 1}`,
			}));
	for (const item of documents) {
		let document;
		try {
			document = parseYaml(item.body);
		} catch (error) {
			throw new Error(
				`Documentation example verification: ${item.label} is invalid YAML`,
				{ cause: error },
			);
		}
		validateSeedDocument(document, item.label);
		parsedSeedExamples += 1;
	}
}
assert(
	parsedSeedExamples >= 7,
	`expected at least seven parsed seed examples, found ${parsedSeedExamples}`,
);

const surfacePaths = [
	"src/components/FAQPageSchema.astro",
	"src/data/faqContent.ts",
	"src/pages/docs/configuration.mdx",
	"src/pages/docs/sdk-examples.mdx",
	"src/pages/docs/console.mdx",
	"src/pages/docs/architecture.mdx",
	"src/pages/docs/faq.mdx",
	"src/pages/docs/seed-data.mdx",
	"src/pages/docs/terraform.mdx",
	"src/pages/docs/services-overview.mdx",
	"src/pages/docs/what-is-gcp-emulator.mdx",
	"src/pages/docs/bigquery-emulator-features.mdx",
	"src/pages/docs/bigtable-emulator-features.mdx",
	"src/pages/docs/spanner-emulator-features.mdx",
	"src/pages/bigquery-emulator.astro",
	"src/pages/bigtable-emulator.astro",
	"src/pages/spanner-emulator.astro",
	"src/pages/gcp-integration-testing.astro",
	"src/data/agenticContent.ts",
	"agent-skills/skills/localcloud-seed-data/SKILL.md",
	"agent-skills/skills/localcloud-seed-data/references/seed-data.md",
	"agent-skills/skills/localcloud-terraform/SKILL.md",
	"agent-skills/skills/localcloud-terraform/references/terraform.md",
];
const docs = new Map(
	await Promise.all(surfacePaths.map(async (path) => [path, await read(path)])),
);
const combined = [...docs.values()].join("\n");
for (const stale of [
	"/_localcloud/",
	'project="local-project"',
	"GOOGLE_CLOUD_PROJECT=local-project",
	"24080",
	"24081",
	"24082",
	"24083",
	"24084",
	"24085",
	"24086",
	"24087",
	"24088",
	"24089",
	"24090",
	"24091",
	"24092",
	"24443",
	"6379:6379",
	"free for developers",
	"~96%",
	"936 collected",
	"200+ mapped",
	"Start in 60 seconds",
	"Sub-millisecond latency",
	"any CI platform",
])
	assert(
		!combined.toLowerCase().includes(stale.toLowerCase()),
		`Phase 3-4 surfaces contain stale or unsupported claim ${stale}`,
	);
assert(
	!combined.includes(
		`${contract.product.runtimeImage.repository}:${contract.product.runtimeImage.tag}:latest`,
	),
	"generated content appends a duplicate image tag",
);
assert(
	!/curl\s+-[^\n]*f[^\n]*\/health[^\n]*&&\s*break/.test(combined),
	"Phase 3-4 surface contains a fail-open health loop",
);

// The BigQuery comparison lives in agenticContent.ts (/compare/bigquery-emulator-alternatives/).
const dependencyPaths = [
	"src/pages/docs/bigquery-emulator-features.mdx",
	"src/data/agenticContent.ts",
	"src/pages/docs/bigtable-emulator-features.mdx",
	"src/pages/docs/spanner-emulator-features.mdx",
	"src/pages/bigquery-emulator.astro",
	"src/pages/bigtable-emulator.astro",
	"src/pages/spanner-emulator.astro",
];
const dependencyDocs = dependencyPaths.map((path) => docs.get(path)).join("\n");
for (const claim of [
	"~96%",
	"936",
	"932",
	"958",
	"813",
	"175+",
	"200+",
	"95% feature coverage",
]) {
	assert(
		!dependencyDocs.toLowerCase().includes(claim.toLowerCase()),
		`dependency-sensitive docs contain prohibited quantified claim ${claim}`,
	);
}
for (const claim of [
	"postgresql+psycopg2",
	"PostgreSQL port",
	"includes PGAdapter",
	"all 17 filter types",
	"Provides functional and API parity",
]) {
	assert(
		!dependencyDocs.toLowerCase().includes(claim.toLowerCase()),
		`dependency-sensitive docs contain prohibited parity claim ${claim}`,
	);
}
for (const service of ["bigquery", "bigtable", "spanner"]) {
	assert(
		docs
			.get(`src/pages/${service}-emulator.astro`)
			.includes("ServiceOverviewLanding"),
		`${service} landing is not contract-derived`,
	);
}
const bigqueryFeatures = docs.get(
	"src/pages/docs/bigquery-emulator-features.mdx",
);
for (const phrase of [
	"GoogleSQL Analyzer",
	"DuckDB",
	"Storage API",
	"BQML",
	"Vector Search",
]) {
	assert(
		bigqueryFeatures.includes(phrase),
		`BigQuery feature reference omits ${phrase}`,
	);
}
// The coverage matrix is a section of the feature reference.
const bigqueryHistory = bigqueryFeatures;
for (const phrase of [
	"GoogleSQL",
	"DuckDB",
	// The matrix file lives in a private repository, so the page summarizes it without a link.
	"versioned coverage matrix",
	"recorded classifications",
]) {
	assert(
		bigqueryHistory.includes(phrase),
		`BigQuery documentation analyses must cover current architecture: ${phrase}`,
	);
}
const bigtableFeatures = docs.get(
	"src/pages/docs/bigtable-emulator-features.mdx",
);
for (const phrase of [
	"Docker build pins a source commit",
	"PostgreSQL under the mounted",
	"bigtable.operations.map",
	"Metadata-only backup",
	"PrepareQuery",
]) {
	assert(
		bigtableFeatures.includes(phrase),
		`Bigtable feature reference omits ${phrase}`,
	);
}
const spannerFeatures = docs.get(
	"src/pages/docs/spanner-emulator-features.mdx",
);
for (const phrase of [
	"gRPC API",
	"5386",
	"5387",
	"PGAdapter",
	"wound-wait",
	"LevelDB",
]) {
	assert(
		spannerFeatures.toLowerCase().includes(phrase.toLowerCase()),
		`Spanner feature reference omits ${phrase}`,
	);
}

assert(
	combined.includes(contract.product.defaultProject),
	"docs omit contract default project",
);
for (const endpoint of [
	contract.operator.endpoints.health,
	contract.operator.endpoints.services,
	contract.operator.endpoints.environment,
	contract.operator.endpoints.seed,
	contract.operator.endpoints.reset,
	contract.terraform.readinessEndpoint,
])
	assert(combined.includes(endpoint), `docs omit contract endpoint ${endpoint}`);

const configuration = docs.get("src/pages/docs/configuration.mdx");
// The registry table lists every docsContract service, in the shared catalog order.
assert(
	configuration.includes("registry = inCatalogOrder(docsContract.services)") && configuration.includes("registry.map"),
	"configuration must list all registry services, not only published routes",
);

const terraformSurfaces = [
	docs.get("src/pages/docs/terraform.mdx"),
	docs.get("agent-skills/skills/localcloud-terraform/SKILL.md"),
	docs.get("agent-skills/skills/localcloud-terraform/references/terraform.md"),
];
for (const [index, source] of terraformSurfaces.entries()) {
	assert(
		source.includes("LOCALCLOUD_TERRAFORM_MODE"),
		`Terraform surface ${index + 1} omits runtime Terraform mode`,
	);
	assert(
		source.includes("localcloud.yaml"),
		`Terraform surface ${index + 1} does not configure Terraform mode before startup`,
	);
}
const terraform = terraformSurfaces[0];
for (const fact of [
	"hashicorp/google",
	"~> 7.0",
	"7.34.0",
	contract.terraform.readinessEndpoint,
	"http://localhost:5382/storage/v1/",
	"http://localhost:5380/v2/",
	"http://localhost:5387/v1/",
	"valid fake service-account",
])
	assert(terraform.includes(fact), `Terraform guide omits ${fact}`);
for (const block of [...terraform.matchAll(/```hcl\s*\n([\s\S]*?)```/g)].map(
	(match) => match[1],
)) {
	assert(
		/terraform\s*\{/.test(block),
		"Terraform HCL fence lacks terraform block",
	);
	assert(
		/required_providers\s*\{/.test(block),
		"Terraform HCL fence lacks required_providers",
	);
	assert(
		/provider\s+"google"\s*\{/.test(block),
		"Terraform HCL fence lacks google provider block",
	);
	assert(
		(block.match(/{/g) ?? []).length === (block.match(/}/g) ?? []).length,
		"Terraform HCL fence has unbalanced braces",
	);
}
assert(terraform.includes("Confirm `/terraform/readiness` succeeds"), "Terraform guide omits the user-facing readiness gate");
assert(
	!terraform.includes("Zero .tf changes"),
	"Terraform guide retains zero-change claim",
);

const seed = docs.get("src/pages/docs/seed-data.mdx");
for (const key of [
	"gcs:",
	"secretmanager:",
	"bigquery:",
	"tables:",
	"projects:",
])
	assert(seed.includes(key), `seed guide omits ${key}`);
assert(
	seed.includes("Firestore has a seed registrar"),
	"seed guide omits Firestore limitation",
);

const sdk = docs.get("src/pages/docs/sdk-examples.mdx");
assert(
	sdk.includes("AnonymousCredentials"),
	"SDK guide BigQuery example can trigger ADC discovery",
);
assert(sdk.includes('client_options={"api_endpoint": os.environ["BIGQUERY_EMULATOR_HOST"]}'), "BigQuery example must use the generated local endpoint explicitly");
const agentic = docs.get("src/data/agenticContent.ts");
assert(
	!agentic.includes("bigquery.Client("),
	"agentic content must not publish an unqualified executable BigQuery client example",
);

console.log(
	`Documentation examples verified: ${parsedSeedExamples} parsed seed examples, ${docs.size} Phase 3-4 surfaces, root endpoints, Terraform readiness, and distributed safety facts.`,
);
