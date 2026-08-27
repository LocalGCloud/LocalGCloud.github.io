import { access, readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile(new URL('../src/data/docs-contract.snapshot.json', import.meta.url), 'utf8'));
const editorialSource = await readFile(new URL('../src/data/serviceEditorial.ts', import.meta.url), 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(`Documentation contract: ${message}`);
};
const object = (value, path) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${path} must be an object`);
  return value;
};
const string = (value, path) => assert(typeof value === 'string' && value.length > 0, `${path} must be a non-empty string`);
const boolean = (value, path) => assert(typeof value === 'boolean', `${path} must be boolean`);
const number = (value, path) => assert(Number.isInteger(value), `${path} must be an integer`);
const array = (value, path, { nonempty = false } = {}) => {
  assert(Array.isArray(value), `${path} must be an array`);
  if (nonempty) assert(value.length > 0, `${path} must not be empty`);
  return value;
};
const exactKeys = (value, keys, path) => {
  object(value, path);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${path} fields differ: expected ${expected.join(', ')}, got ${actual.join(', ')}`);
};
const strings = (value, path, options) => array(value, path, options).forEach((item, index) => string(item, `${path}[${index}]`));
const evidenceStates = new Set(['verified', 'partial', 'release-unverified', 'unsupported', 'unknown']);
const state = (value, path) => assert(evidenceStates.has(value), `${path} has unknown evidence state ${value}`);
const evidence = (value, path) => strings(value, path, { nonempty: true });

exactKeys(contract, ['schemaVersion', 'reviewedAt', 'provenance', 'product', 'operator', 'cli', 'seed', 'terraform', 'privacy', 'licensing', 'services'], 'root');
assert(contract.schemaVersion === 3, 'unsupported schema version');
assert(/^\d{4}-\d{2}-\d{2}$/.test(contract.reviewedAt), 'reviewedAt must be an ISO date');

exactKeys(contract.provenance, ['runtimeRevision', 'cliRevision', 'assembledImageDigest', 'qualification', 'sources', 'sourceDigests', 'worktreeSources', 'dependencyRevalidations'], 'provenance');
assert(contract.provenance.runtimeRevision.length === 40, 'runtime revision must be a full commit');
assert(contract.provenance.cliRevision.length === 40, 'CLI revision must be a full commit');
assert(contract.provenance.assembledImageDigest === null || /^sha256:[a-f0-9]{64}$/.test(contract.provenance.assembledImageDigest), 'assembled image digest must be null or sha256');
state(contract.provenance.qualification, 'provenance.qualification');
evidence(contract.provenance.sources, 'provenance.sources');
object(contract.provenance.sourceDigests, 'provenance.sourceDigests');
assert(Object.keys(contract.provenance.sourceDigests).length === contract.provenance.sources.length, 'every provenance source must have a digest');
for (const source of contract.provenance.sources) {
  assert(/^sha256:[a-f0-9]{64}$/.test(contract.provenance.sourceDigests[source] ?? ''), `${source} must have a SHA-256 digest`);
}
strings(contract.provenance.worktreeSources, 'provenance.worktreeSources');
for (const source of contract.provenance.worktreeSources) assert(contract.provenance.sources.includes(source), `${source} worktree marker is not a provenance source`);
array(contract.provenance.dependencyRevalidations, 'provenance.dependencyRevalidations', { nonempty: true }).forEach((item, index) => {
  exactKeys(item, ['id', 'revision', 'qualification', 'evidence'], `dependencyRevalidations[${index}]`);
  string(item.id, `dependencyRevalidations[${index}].id`);
  assert(/^[a-f0-9]{40}$/.test(item.revision), `${item.id} revision must be a full commit`);
  state(item.qualification, `${item.id}.qualification`);
  evidence(item.evidence, `${item.id}.evidence`);
});
assert(new Set(contract.provenance.dependencyRevalidations.map((item) => item.id)).size === 3, 'dependency provenance IDs must be unique');

exactKeys(contract.product, ['name', 'siteUrl', 'imageQualification', 'defaultProject', 'defaultUser', 'defaultDataVolume', 'memory', 'serviceCount', 'productionBoundary', 'runtimeImage'], 'product');
for (const key of ['name', 'siteUrl', 'defaultProject', 'defaultUser', 'defaultDataVolume', 'memory', 'productionBoundary']) string(contract.product[key], `product.${key}`);
number(contract.product.serviceCount, 'product.serviceCount');
state(contract.product.imageQualification, 'product.imageQualification');
exactKeys(contract.product.runtimeImage, ['repository', 'tag', 'digest', 'qualification', 'evidence', 'limitation'], 'product.runtimeImage');
assert(contract.product.runtimeImage.repository === 'jaysen2apache/localcloud', 'reviewed image repository drifted');
assert(contract.product.runtimeImage.tag === 'latest', 'reviewed image tag drifted');
assert(contract.product.runtimeImage.digest === null, 'snapshot must not invent an image digest');
assert(contract.product.runtimeImage.qualification === 'release-unverified', 'mutable latest image must remain release-unverified');
evidence(contract.product.runtimeImage.evidence, 'product.runtimeImage.evidence');
string(contract.product.runtimeImage.limitation, 'product.runtimeImage.limitation');

exactKeys(contract.operator, ['gatewayPort', 'publishedPorts', 'endpoints', 'manualDockerCommand'], 'operator');
number(contract.operator.gatewayPort, 'operator.gatewayPort');
object(contract.operator.publishedPorts, 'operator.publishedPorts');
object(contract.operator.endpoints, 'operator.endpoints');
string(contract.operator.manualDockerCommand, 'operator.manualDockerCommand');
for (const [name, route] of Object.entries(contract.operator.endpoints)) {
  string(route, `operator.endpoints.${name}`);
  assert(route.startsWith('/') && !route.startsWith('/_localcloud/'), `${name} must use a root operator route`);
}
assert(contract.operator.endpoints.health === '/health', 'health endpoint must be /health');
assert(contract.operator.endpoints.environment === '/env', 'environment endpoint must be /env');
assert(contract.operator.endpoints.seed === '/seed', 'seed endpoint must be /seed');
assert(contract.operator.endpoints.reset === '/reset', 'reset endpoint must be /reset');
assert(contract.operator.endpoints.terraformReadiness === '/terraform/readiness', 'Terraform readiness endpoint drifted');
assert(contract.operator.manualDockerCommand.includes('127.0.0.1:24080-24092:24080-24092'), 'manual Docker must be loopback-bound');
assert(contract.operator.manualDockerCommand.includes('jaysen2apache/localcloud:latest'), 'manual Docker image drifted');
assert(!contract.operator.manualDockerCommand.includes('/var/run/docker.sock'), 'manual beginner Docker must not mount Docker socket');

exactKeys(contract.cli, ['installScriptUrl', 'installCommand', 'homebrewCommand', 'supportedHosts', 'requiresDocker', 'frozenBinaryRequiresPython', 'commands', 'quickStart', 'doctorSuccessStatus', 'startSuccessStatuses', 'dataDefault', 'dockerSocketDefault', 'transparentNetworkDefault', 'bindAddress', 'dynamicPortMapping', 'environmentFormats', 'integrity', 'releaseBoundary'], 'cli');
for (const key of ['installScriptUrl', 'installCommand', 'homebrewCommand', 'doctorSuccessStatus', 'dataDefault', 'bindAddress', 'integrity', 'releaseBoundary']) string(contract.cli[key], `cli.${key}`);
for (const key of ['requiresDocker', 'frozenBinaryRequiresPython', 'dockerSocketDefault', 'transparentNetworkDefault', 'dynamicPortMapping']) boolean(contract.cli[key], `cli.${key}`);
for (const key of ['supportedHosts', 'commands', 'quickStart', 'startSuccessStatuses', 'environmentFormats']) strings(contract.cli[key], `cli.${key}`, { nonempty: true });
assert(contract.cli.doctorSuccessStatus === 'ok', 'CLI doctor success state drifted');
assert(JSON.stringify(contract.cli.startSuccessStatuses) === JSON.stringify(['started', 'already_running', 'reconfigured', 'restarted']), 'CLI start states drifted');
assert(contract.cli.bindAddress === '127.0.0.1', 'CLI must remain loopback-bound');
assert(contract.cli.dockerSocketDefault === false, 'Docker socket must remain opt-in');
assert(contract.cli.transparentNetworkDefault === false, 'transparent networking must remain opt-in');
assert(contract.cli.integrity.includes('SHA-256') && contract.cli.integrity.includes('does not verify'), 'installer integrity boundary is incomplete');

exactKeys(contract.seed, ['status', 'endpoint', 'reseedEndpoint', 'importEndpoint', 'seedFileVariable', 'defaultSeedFile', 'terraformModeVariable', 'acceptedEnvelopes', 'supportedServices', 'volatileServices', 'limitations', 'evidence'], 'seed');
state(contract.seed.status, 'seed.status');
for (const key of ['endpoint', 'reseedEndpoint', 'importEndpoint', 'seedFileVariable', 'defaultSeedFile', 'terraformModeVariable']) string(contract.seed[key], `seed.${key}`);
for (const key of ['supportedServices', 'limitations', 'evidence']) strings(contract.seed[key], `seed.${key}`, { nonempty: true });
strings(contract.seed.volatileServices, 'seed.volatileServices');
array(contract.seed.acceptedEnvelopes, 'seed.acceptedEnvelopes', { nonempty: true }).forEach((item, index) => {
  exactKeys(item, ['id', 'description', 'evidence'], `seed.acceptedEnvelopes[${index}]`);
  string(item.id, `seed.acceptedEnvelopes[${index}].id`);
  string(item.description, `seed.acceptedEnvelopes[${index}].description`);
  evidence(item.evidence, `seed.acceptedEnvelopes[${index}].evidence`);
});
assert(!contract.seed.supportedServices.includes('firestore'), 'Firestore must not be advertised as seedable');

exactKeys(contract.terraform, ['status', 'readinessEndpoint', 'modeVariable', 'providerConstraint', 'credentialRequirement', 'networkModes', 'qualifiedResources', 'limitations', 'evidence'], 'terraform');
state(contract.terraform.status, 'terraform.status');
for (const key of ['readinessEndpoint', 'modeVariable', 'providerConstraint', 'credentialRequirement']) string(contract.terraform[key], `terraform.${key}`);
for (const key of ['qualifiedResources', 'limitations', 'evidence']) strings(contract.terraform[key], `terraform.${key}`, { nonempty: true });
array(contract.terraform.networkModes, 'terraform.networkModes', { nonempty: true }).forEach((item, index) => {
  exactKeys(item, ['id', 'description', 'requirements', 'evidence'], `terraform.networkModes[${index}]`);
  string(item.id, `terraform.networkModes[${index}].id`);
  string(item.description, `terraform.networkModes[${index}].description`);
  strings(item.requirements, `terraform.networkModes[${index}].requirements`, { nonempty: true });
  evidence(item.evidence, `terraform.networkModes[${index}].evidence`);
});
assert(contract.terraform.readinessEndpoint === '/terraform/readiness', 'Terraform readiness endpoint drifted');

exactKeys(contract.privacy, ['status', 'runtimeTelemetry', 'outboundBehaviors', 'websiteAnalytics', 'limitations', 'evidence'], 'privacy');
state(contract.privacy.status, 'privacy.status');
strings(contract.privacy.limitations, 'privacy.limitations', { nonempty: true });
evidence(contract.privacy.evidence, 'privacy.evidence');
exactKeys(contract.privacy.runtimeTelemetry, ['defaultEnabled', 'destination', 'disableVariable', 'identifier', 'retryPersistence', 'events', 'limitations', 'evidence'], 'privacy.runtimeTelemetry');
boolean(contract.privacy.runtimeTelemetry.defaultEnabled, 'privacy.runtimeTelemetry.defaultEnabled');
boolean(contract.privacy.runtimeTelemetry.retryPersistence, 'privacy.runtimeTelemetry.retryPersistence');
for (const key of ['destination', 'disableVariable', 'identifier']) string(contract.privacy.runtimeTelemetry[key], `privacy.runtimeTelemetry.${key}`);
strings(contract.privacy.runtimeTelemetry.events, 'privacy.runtimeTelemetry.events', { nonempty: true });
strings(contract.privacy.runtimeTelemetry.limitations, 'privacy.runtimeTelemetry.limitations', { nonempty: true });
evidence(contract.privacy.runtimeTelemetry.evidence, 'privacy.runtimeTelemetry.evidence');
array(contract.privacy.outboundBehaviors, 'privacy.outboundBehaviors', { nonempty: true }).forEach((item, index) => {
  exactKeys(item, ['id', 'default', 'destination', 'control', 'evidence'], `privacy.outboundBehaviors[${index}]`);
  for (const key of ['id', 'default', 'destination', 'control']) string(item[key], `privacy.outboundBehaviors[${index}].${key}`);
  evidence(item.evidence, `privacy.outboundBehaviors[${index}].evidence`);
});
exactKeys(contract.privacy.websiteAnalytics, ['processor', 'events', 'evidence'], 'privacy.websiteAnalytics');
string(contract.privacy.websiteAnalytics.processor, 'privacy.websiteAnalytics.processor');
strings(contract.privacy.websiteAnalytics.events, 'privacy.websiteAnalytics.events', { nonempty: true });
evidence(contract.privacy.websiteAnalytics.evidence, 'privacy.websiteAnalytics.evidence');

exactKeys(contract.licensing, ['status', 'governingLicense', 'summary', 'permittedUse', 'excludedUse', 'commercialLicenseAvailable', 'technicalEnforcement', 'limitations', 'evidence'], 'licensing');
state(contract.licensing.status, 'licensing.status');
for (const key of ['governingLicense', 'summary', 'permittedUse']) string(contract.licensing[key], `licensing.${key}`);
boolean(contract.licensing.commercialLicenseAvailable, 'licensing.commercialLicenseAvailable');
strings(contract.licensing.excludedUse, 'licensing.excludedUse', { nonempty: true });
strings(contract.licensing.limitations, 'licensing.limitations', { nonempty: true });
evidence(contract.licensing.evidence, 'licensing.evidence');
exactKeys(contract.licensing.technicalEnforcement, ['developmentBuild', 'enforcedBuild', 'serviceTiers', 'evidence'], 'licensing.technicalEnforcement');
for (const key of ['developmentBuild', 'enforcedBuild', 'serviceTiers']) string(contract.licensing.technicalEnforcement[key], `licensing.technicalEnforcement.${key}`);
evidence(contract.licensing.technicalEnforcement.evidence, 'licensing.technicalEnforcement.evidence');
assert(contract.licensing.commercialLicenseAvailable === false, 'commercial license availability drifted');

const serviceIds = contract.services.map((service) => service.id);
const uniqueIds = new Set(serviceIds);
assert(contract.services.length === 27, `expected 27 services, found ${contract.services.length}`);
assert(uniqueIds.size === 27, 'service IDs are not unique');
assert(contract.product.serviceCount === contract.services.length, 'product service count differs from registry');
const persistenceScopes = new Set(['volatile', 'metadata', 'service-data', 'stateless']);
const availabilityStates = new Set(['available', 'coming_soon', 'unsupported']);
for (const [index, service] of contract.services.entries()) {
  const path = `services[${index}](${service.id})`;
  exactKeys(service, ['id', 'name', 'availability', 'port', 'additionalPorts', 'protocol', 'type', 'registryDefaultEnabled', 'assembledDefault', 'minTier', 'envVar', 'envValue', 'terraformEnvVar', 'implementation', 'persistence', 'status', 'operations', 'limitations', 'evidence', 'published'], path);
  for (const key of ['id', 'name', 'protocol', 'type', 'minTier', 'envVar', 'envValue', 'implementation']) string(service[key], `${path}.${key}`);
  number(service.port, `${path}.port`);
  object(service.additionalPorts, `${path}.additionalPorts`);
  boolean(service.registryDefaultEnabled, `${path}.registryDefaultEnabled`);
  boolean(service.published, `${path}.published`);
  assert(availabilityStates.has(service.availability), `${path}.availability is invalid`);
  assert(service.published === (service.availability === 'available'), `${path}.published must follow runtime availability`);
  assert(service.terraformEnvVar === null || typeof service.terraformEnvVar === 'string', `${path}.terraformEnvVar must be string or null`);
  state(service.status, `${path}.status`);
  strings(service.limitations, `${path}.limitations`, { nonempty: true });
  evidence(service.evidence, `${path}.evidence`);
  exactKeys(service.assembledDefault, ['enabled', 'qualification', 'evidence', 'limitation'], `${path}.assembledDefault`);
  boolean(service.assembledDefault.enabled, `${path}.assembledDefault.enabled`);
  state(service.assembledDefault.qualification, `${path}.assembledDefault.qualification`);
  evidence(service.assembledDefault.evidence, `${path}.assembledDefault.evidence`);
  string(service.assembledDefault.limitation, `${path}.assembledDefault.limitation`);
  exactKeys(service.persistence, ['scope', 'backingStore', 'restartBehavior', 'recoveryLimitations', 'qualification', 'evidence'], `${path}.persistence`);
  assert(persistenceScopes.has(service.persistence.scope), `${path}.persistence.scope is invalid`);
  string(service.persistence.backingStore, `${path}.persistence.backingStore`);
  string(service.persistence.restartBehavior, `${path}.persistence.restartBehavior`);
  strings(service.persistence.recoveryLimitations, `${path}.persistence.recoveryLimitations`, { nonempty: true });
  state(service.persistence.qualification, `${path}.persistence.qualification`);
  evidence(service.persistence.evidence, `${path}.persistence.evidence`);
  const operations = array(service.operations, `${path}.operations`, { nonempty: true });
  const operationIds = new Set();
  operations.forEach((operation, operationIndex) => {
    const operationPath = `${path}.operations[${operationIndex}]`;
    exactKeys(operation, ['id', 'label', 'status', 'limitations', 'evidence'], operationPath);
    string(operation.id, `${operationPath}.id`);
    string(operation.label, `${operationPath}.label`);
    state(operation.status, `${operationPath}.status`);
    strings(operation.limitations, `${operationPath}.limitations`);
    evidence(operation.evidence, `${operationPath}.evidence`);
    assert(!operationIds.has(operation.id), `${path} has duplicate operation ${operation.id}`);
    operationIds.add(operation.id);
    if (operation.status === 'partial' || operation.status === 'release-unverified') {
      assert(operation.limitations.length > 0, `${operationPath} must document limitations`);
    }
  });
  assert(editorialSource.includes(`  ${service.id}: {`), `${service.id} has no editorial overlay`);
}
const cloudSql = contract.services.find((service) => service.id === 'cloudsql');
assert(cloudSql.registryDefaultEnabled === true, 'Cloud SQL registry default drifted');
assert(cloudSql.assembledDefault.enabled === true, 'Cloud SQL current runtime default must be enabled');
assert(cloudSql.assembledDefault.qualification === 'verified', 'Cloud SQL current runtime default must come from the canonical catalog');
const firestore = contract.services.find((service) => service.id === 'firestore');
assert(firestore.availability === 'available', 'Firestore must be available');
assert(firestore.registryDefaultEnabled === false, 'Firestore must remain disabled by default');
const sheets = contract.services.find((service) => service.id === 'sheets');
assert(sheets.availability === 'available' && sheets.published, 'Google Sheets must be an available published service');

const editorialIds = [...editorialSource.matchAll(/^ {2}([a-z0-9]+): \{/gm)].map((match) => match[1]);
assert(editorialIds.length === 27, `expected 27 editorial overlays, found ${editorialIds.length}`);
assert(new Set(editorialIds).size === 27, 'editorial overlay IDs are not unique');
for (const id of editorialIds) assert(uniqueIds.has(id), `editorial overlay ${id} is not in the runtime contract`);
const publishedContractServices = contract.services.filter((service) => service.published);
assert(publishedContractServices.length === 27, `expected all 27 runtime surfaces published in the contract, found ${publishedContractServices.length}`);
const publicServiceIds = publishedContractServices.map((service) => service.id);
assert(publicServiceIds.length === 27, `expected 27 public service guides, found ${publicServiceIds.length}`);
assert(!editorialSource.includes('catalogState'), 'availability must come from the runtime contract, not editorial copy');

const editorialEntries = new Map(
  [...editorialSource.matchAll(/^ {2}([a-z0-9]+): \{ slug: '([^']+)', category: '[^']+', iconId: '([^']+)'/gm)]
    .map((match) => [match[1], { slug: match[2], iconId: match[3] }]),
);
assert(editorialEntries.size === 27, `expected 27 parseable editorial route entries, found ${editorialEntries.size}`);
const slugs = new Set();
for (const service of contract.services) {
  const entry = editorialEntries.get(service.id);
  assert(entry, `${service.id} has no parseable editorial route`);
  assert(!slugs.has(entry.slug), `duplicate service slug ${entry.slug}`);
  slugs.add(entry.slug);
  await access(new URL(`../public/icons/${entry.iconId}.svg`, import.meta.url));
}

const routeSources = new Map();
for (const path of [
  'src/data/services.ts',
  'src/data/agenticFacts.ts',
  'src/data/agenticContent.ts',
  'src/pages/services/index.astro',
  'src/pages/services/[slug].astro',
  'src/pages/services/[slug]/ai-agent-local-testing.astro',
  'src/pages/compatibility.astro',
  'src/components/ServiceOverviewLanding.astro',
  'src/pages/docs/services-overview.mdx',
]) routeSources.set(path, await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const servicesSource = routeSources.get('src/data/services.ts');
assert(servicesSource.includes('docsContract.services.flatMap'), 'service adapter must classify runtime surfaces before publishing routes');
assert(servicesSource.includes('contractService.published'), 'service adapter does not honor runtime publication state');
assert(servicesSource.includes('catalogState === "coming-soon"'), 'service adapter does not preserve coming-soon services');
assert(servicesSource.includes('operation.status === "verified"') && servicesSource.includes('operation.status === "partial"') && servicesSource.includes('operation.status === "release-unverified"'), 'service adapter does not constrain positive operations by evidence state');
assert(servicesSource.includes('Object.entries(contractService.additionalPorts)') && servicesSource.includes('endpointLabel'), 'service adapter must preserve protocol labels for additional ports');
const catalogSource = routeSources.get('src/pages/services/index.astro');
assert(!catalogSource.includes('data-service-enabled'), 'catalog still filters public availability from assembled default');
assert(!catalogSource.includes('data-service-status'), 'catalog still exposes negative evidence-state filtering');
assert(!catalogSource.includes('getServiceStatusLabel'), 'catalog still renders aggregate evidence labels');
assert(catalogSource.includes('getServiceSignalLabel'), 'catalog lacks positive workflow signals');
const detailSource = routeSources.get('src/pages/services/[slug].astro');
assert(!detailSource.includes('getServiceStatusLabel'), 'detail route still renders aggregate evidence labels');
assert(detailSource.includes('documentedOperations.map'), 'detail route does not render documented workflows');
assert(detailSource.includes('unavailableOperations.map'), 'detail route does not render unavailable operation boundaries');
assert(detailSource.includes("operation.limitations.join(' ')"), 'detail route omits operation-specific limitations');
assert(!detailSource.includes('<strong>{operation.label}</strong>: Coming soon.'), 'detail route turns unsupported operations into roadmap promises');
for (const fact of ['registryDefaultEnabled', 'assembledDefaultEnabled', 'defaultQualification', 'minTier', 'persistence']) {
  assert(routeSources.get('src/data/agenticFacts.ts').includes(fact), `agentic metadata omits ${fact}`);
}
const agenticContentSource = routeSources.get('src/data/agenticContent.ts');
assert(agenticContentSource.includes('.filter((service) => service.status !== "planned")'), 'agent-testing pages must exclude coming-soon services');
assert(!agenticContentSource.includes('BigQuery, Pub/Sub, Firestore'), 'agent content still claims Firestore is available');
const compatibilitySource = routeSources.get('src/pages/compatibility.astro');
assert(compatibilitySource.includes("service.catalogState === 'coming-soon'") && compatibilitySource.includes('colspan="6"'), 'compatibility page does not collapse coming-soon services to a roadmap row');
assert(compatibilitySource.includes('service.operations.map'), 'compatibility page does not render operation-level evidence');
const overviewSource = routeSources.get('src/components/ServiceOverviewLanding.astro');
assert(overviewSource.includes('operationBoundaries.map') && overviewSource.includes('service.notSupported.map'), 'shared emulator landing pages omit service and operation boundaries');
const servicesOverviewSource = routeSources.get('src/pages/docs/services-overview.mdx');
assert(servicesOverviewSource.includes('<tbody>') && servicesOverviewSource.includes('service.endpointLabel'), 'services overview does not render semantic endpoint rows');
assert(!servicesOverviewSource.includes(".join('\\\\n')"), 'services overview still emits pipe-delimited row text');

for (const retiredPath of ['../localcloud/services.yaml', '../localcloud/localcloud-server/src/main/resources/compatibility/services/']) {
  assert(!JSON.stringify(contract).includes(retiredPath), `retired evidence path remains: ${retiredPath}`);
}

console.log(`Documentation contract verified: ${contract.services.length} runtime surfaces, ${editorialEntries.size} overlays/icons, ${publicServiceIds.length} public service routes, ${publicServiceIds.length} available agent-testing routes, schema v${contract.schemaVersion}.`);
