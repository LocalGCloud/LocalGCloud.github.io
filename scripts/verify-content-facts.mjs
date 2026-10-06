import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { licenseWords } from '../src/utils/license-document.mjs';
import { alternatives, alternativesReviewedAt, comparisonSummary } from '../src/data/alternatives.ts';
import { docsContract } from '../src/data/docs-contract.ts';
import { productFacts } from '../src/data/productFacts.ts';
import { cliQuickStart } from '../src/utils/quickstart.mjs';
import { headingsWithinClass } from './html-structure.mjs';
import { availableServiceCount, services, servicesInCatalogOrder, isServiceDisabledByDefault, proTierLabel } from '../src/data/services.ts';
import { pricingFaq, proTierServiceNames } from '../src/data/pricingFaq.ts';
import { serviceCompatibilityEditorial } from '../src/data/serviceEditorial.ts';
import { relatedAnchor, relatedPagePairs } from '../src/data/relatedPages.ts';
import { emulatorSearchPages, getServiceCodeExamples, serviceGuides, officialSampleLinks, terraformExampleServiceIds } from '../src/data/serviceGuides.ts';
const sdkExamplesSource = await readFile(new URL('../src/pages/docs/sdk-examples.mdx', import.meta.url), 'utf8');

const publicDirectory = new URL('../public/', import.meta.url);
const publicPath = (file) => join(publicDirectory.pathname, file);
const errors = [];
const distDirectory = new URL('../dist/', import.meta.url);
// Files only: a directory such as dist/docs must not satisfy a link to /docs.
const files = new Set((await readdir(distDirectory, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => relative(distDirectory.pathname, join(entry.parentPath, entry.name))));
const htmlPages = new Map(await Promise.all([...files].filter((file) => file.endsWith('.html')).map(async (file) => [file, await readFile(new URL(file, distDirectory), 'utf8')])));

// Resolve a local URL to a built file the way the asset server does, then check any #fragment.
const siteOrigin = new URL(productFacts.siteUrl).origin;
const checkLocalLink = (file, target) => {
  if (target.origin !== siteOrigin) return;
  const path = decodeURIComponent(target.pathname).replace(/^\//, '');
  const resolvedPath = files.has(path)
    ? path
    : [...files].find((f) => f.toLowerCase() === path.toLowerCase());
  const destination = resolvedPath
    ? resolvedPath
    : !path || path.endsWith('/')
    ? `${path}index.html`
    : `${path}/index.html`;
  const resolvedDestination = files.has(destination)
    ? destination
    : [...files].find((f) => f.toLowerCase() === destination.toLowerCase());
  if (!resolvedDestination) errors.push(`${file} links to missing ${target.pathname}`);
  // A page link without its trailing slash costs a redirect hop on every visit and crawl.
  else if (!resolvedPath && path && !path.endsWith('/')) errors.push(`${file} links to ${target.pathname} without a trailing slash; link ${target.pathname}/ instead`);
  else if (target.hash && htmlPages.has(resolvedDestination)) {
    const id = decodeURIComponent(target.hash.slice(1));
    if (!htmlPages.get(resolvedDestination).includes(`id="${id}"`)) errors.push(`${file} links to missing ${target.pathname}#${id}`);
  }
};

// Check every published page, including generated agent routes, for missing local links.
for (const [file, html] of htmlPages) {
  const pageUrl = new URL(file.replace(/index\.html$/, ''), productFacts.siteUrl);
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const [, rawHref] of markup.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    checkLocalLink(file, new URL(rawHref.replaceAll('&amp;', '&'), pageUrl));
  }
}

// compressHTML keeps HTML comments, so a template comment ships in every response and can
// leak commented-out template source. .astro templates use {/* */}, which the build strips.
for (const [file, html] of htmlPages) {
  const comment = html.match(/<!--[\s\S]{0,60}/);
  if (comment) errors.push(`${file} ships an HTML comment (${comment[0].replace(/\s+/g, ' ')}…); use {/* */} in .astro templates`);
}

// A .reveal element starts at opacity 0 and fades in after the reveal script runs, so a
// headline inside one flashes and delays LCP. Hero containers must not carry the class.
for (const [file, html] of htmlPages) {
  for (const { holder } of headingsWithinClass(html, 'reveal')) {
    errors.push(`${file} renders its <h1> inside ${holder}; remove the reveal class from hero containers`);
  }
}

const llms = await readFile(publicPath('llms.txt'), 'utf8');
for (const required of [
  productFacts.availabilityStatement,
  new URL(productFacts.licensingPath, productFacts.siteUrl).toString(),
  new URL(productFacts.pricingPath, productFacts.siteUrl).toString(),
  'https://local.cloud/compatibility/',
  'https://local.cloud/localstack-for-google-cloud/',
  'https://local.cloud/ai/agents.md',
  'https://local.cloud/ai/agent-template.md',
  'https://local.cloud/ai/services.md',
  'https://local.cloud/docs/',
  'https://local.cloud/services/bigquery/',
]) {
  if (!llms.includes(required)) errors.push(`llms.txt must contain ${required}`);
}

// Agent text: the raw files agents and LLM tools read, including the Markdown twins of docs and service pages.
const isMarkdownTwin = (file) => /^(?:docs|services|compare)\/[^/]+\.md$/.test(file);
const agentText = new Map(await Promise.all([...files]
  .filter((file) => /^llms[^/]*\.txt$/.test(file) || /^ai\/[^/]+\.md$/.test(file) || isMarkdownTwin(file))
  .map(async (file) => [file, await readFile(new URL(file, distDirectory), 'utf8')])));

// llms-full.txt is llms.txt followed by one section per Markdown twin.
const llmsFull = agentText.get('llms-full.txt') ?? '';
if (!llmsFull.startsWith(agentText.get('llms.txt')?.trimEnd() ?? '\0')) errors.push('llms-full.txt must start with llms.txt');
for (const [file, text] of agentText) {
  if (!isMarkdownTwin(file)) continue;
  const source = text.match(/^> Source: (\S+)$/m)?.[1];
  if (!source) errors.push(`${file} must name its source page`);
  else if (!llmsFull.includes(`> Source: ${source}\n`)) errors.push(`llms-full.txt omits the section for ${source}`);
}

// Links in agent text resolve like page links: absolute local.cloud URLs and root-relative Markdown links.
for (const [file, text] of agentText) {
  for (const [url] of text.matchAll(/https:\/\/local\.cloud\/[^\s)<>\]"'`|]*/g)) {
    checkLocalLink(file, new URL(url.replace(/[.,;:]+$/, '')));
  }
  for (const [, path] of text.matchAll(/\]\((\/[^)\s]*)\)/g)) checkLocalLink(file, new URL(path, productFacts.siteUrl));
}
const decodeEntities = (text) => text.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (_, number, name) => number
  ? String.fromCodePoint(Number.parseInt(number.replace(/^x/i, ''), /^x/i.test(number) ? 16 : 10))
  : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name.toLowerCase()]);
const visibleText = (markup) => decodeEntities(markup.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ''));

// Vocabulary gate: QA-ledger and audit wording never reaches readers or agents
// (AGENTS.md section 1). Contract prose is rewritten by src/utils/contract-presentation.mjs;
// hand-written copy must avoid these terms. Scanned: the visible text and title,
// description, og: and twitter: meta of every page; llms*.txt, /ai/*.md and the
// Markdown twins; and <text> nodes in the public illustrations.
const bannedVocabulary = [
  [/\bpartial(?:ly)?\b/gi, '"partial" support wording'],
  [/\b\d+\s+partial\b/gi, 'a classification count'],
  [/\[partial\]/gi, 'an evidence tag'],
  [/accepted-no-op/gi, 'a classification count'],
  [/production-only exclusions?/gi, 'a classification count'],
  [/release-unverified/gi, 'release-QA status'],
  [/validation pending/gi, 'release-QA status'],
  [/candidate image/gi, 'release-QA status'],
  [/qualification/gi, 'release-QA status'],
  [/semantic-compatibility:/gi, 'a capability-ID prefix'],
  [/evidence-bounded/gi, 'audit jargon'],
  [/loopback-bound/gi, 'audit jargon'],
  [/license-gated/gi, 'audit jargon'],
  [/\b[0-9a-f]{40}\b/gi, 'a commit SHA'],
];
// Technical phrases where "partial" names an API behavior, not a support status.
const allowedPartialPhrases = /\bpartial (?:index(?:es)?|updates?|responses?)\b/gi;
const metaText = (html) => [
  html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '',
  ...[...html.matchAll(/<meta\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /\b(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)"/.test(tag))
    .map((tag) => tag.match(/\bcontent="([^"]*)"/)?.[1] ?? ''),
].map(decodeEntities).join('\n');
// Link targets are addresses, not copy: HTML hrefs are never part of visible text, and
// Markdown link targets and bare URLs are skipped the same way.
const withoutUrls = (text) => text.replace(/\]\([^)\s]*\)/g, ']').replace(/https?:\/\/[^\s)<>\]"'`|]+/g, '');
const checkVocabulary = (source, text) => {
  const scanned = text.replace(allowedPartialPhrases, '');
  for (const [pattern, label] of bannedVocabulary) {
    for (const match of scanned.matchAll(pattern)) {
      const context = scanned.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50).replace(/\s+/g, ' ').trim();
      errors.push(`${source} publishes ${label} "${match[0]}": …${context}…`);
    }
  }
};
for (const [file, html] of htmlPages) {
  checkVocabulary(file, visibleText(html.replace(/<!--[\s\S]*?-->/g, '')));
  checkVocabulary(`${file} (meta)`, metaText(html));
}
for (const [file, text] of agentText) checkVocabulary(file, withoutUrls(text));
// Illustration text states the same facts as the pages: every port number (a 4-5 digit number)
// is a port in the services data, and no prices or startup-time promises appear.
const servicePorts = new Set(docsContract.services.flatMap((service) => [service.port, ...Object.values(service.additionalPorts)]).map(String));
const illustrationsDirectory = new URL('illustrations/', publicDirectory);
for (const file of (await readdir(illustrationsDirectory)).filter((name) => name.endsWith('.svg'))) {
  const svg = await readFile(new URL(file, illustrationsDirectory), 'utf8');
  const svgText = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((match) => decodeEntities(match[1].replace(/<[^>]+>/g, ''))).join('\n');
  checkVocabulary(`public/illustrations/${file}`, svgText);
  for (const [port] of svgText.matchAll(/(?<![\d.,])\d{4,5}(?![\d.,])/g)) {
    if (!servicePorts.has(port)) errors.push(`public/illustrations/${file} shows port ${port}, which no service uses (service ports: ${[...servicePorts].sort().join(', ')})`);
  }
  for (const [pattern, claim] of [[/\$\s*\d/, 'a price'], [/<\s*\d+\s*(?:s|sec|seconds?|min|minutes?)\b/i, 'a startup-time promise']]) {
    if (pattern.test(svgText)) errors.push(`public/illustrations/${file} states ${claim}: "${svgText.match(pattern)[0]}"`);
  }
}

// One quick start: the CLI lines appear verbatim and in order on every agent entry point.
const quickStart = cliQuickStart(docsContract);
for (const file of ['llms.txt', 'ai/agents.md', 'ai/agent-template.md', 'ai/docs.md']) {
  if (!(agentText.get(file) ?? '').includes(`\`\`\`bash\n${quickStart.script}\n\`\`\``)) errors.push(`${file} must contain the shared CLI quick start verbatim`);
}
const homepageQuickStart = htmlPages.get('index.html')?.match(/<section\b[^>]*id="manual-quickstart"[\s\S]*?<\/section>/)?.[0] ?? '';
const renderedLines = [...homepageQuickStart.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)]
  .flatMap((match) => visibleText(match[1]).split('\n')).map((line) => line.trim());
let renderedCursor = 0;
for (const line of quickStart.lines) {
  const index = renderedLines.indexOf(line, renderedCursor);
  if (index === -1) {
    errors.push(`homepage quick start omits or reorders: ${line}`);
    break;
  }
  renderedCursor = index + 1;
}

// Every agent path installs the CLI before it runs the CLI.
const agentPages = [...htmlPages.keys()].filter((file) => /^(?:ai|local-cloud-for-ai-agents|blog\/localcloud-for-ai-agents|agents\/[^/]+)\/index\.html$/.test(file));
const agentEntryText = [...agentText].filter(([file]) => !isMarkdownTwin(file) && file !== 'llms-full.txt');
for (const [file, text] of [...agentEntryText, ...agentPages.map((file) => [file, visibleText(htmlPages.get(file))])]) {
  const firstCliUse = Math.min(...['localcloud doctor', 'eval "$(localcloud env)"'].map((command) => text.indexOf(command)).filter((index) => index !== -1));
  if (Number.isFinite(firstCliUse) && !text.slice(0, firstCliUse).includes(quickStart.install)) errors.push(`${file} runs the LocalCloud CLI before installing it`);
}

// Joins strip each item's final period, so ".." and ".;" never appear outside code.
for (const [file, text] of agentText) {
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const match = prose.match(/(?<!\.)\.\.(?!\.)|\.;/);
  if (match) errors.push(`${file} contains "${match[0]}" from a list join: ${prose.slice(Math.max(0, match.index - 40), match.index + 20).replace(/\s+/g, ' ')}`);
}

// What the old page-acceptance checklists promised, asserted here instead of published.
for (const file of ['ai/agents.md', 'ai/agent-template.md']) {
  const text = agentText.get(file) ?? '';
  for (const [pattern, promise] of [
    [/Public Preview License/, 'state the license boundary'],
    [/If a step would need real Google Cloud or real credentials, stop/, 'stop rather than use real credentials'],
    [/If Docker or LocalCloud is unavailable, stop/, 'stop when Docker or LocalCloud is unavailable'],
    [/validate the change against real Google Cloud/, 'require production validation against real Google Cloud'],
    [/https:\/\/local\.cloud\/ai\/services\.md/, 'link the service matrix'],
    [/https:\/\/local\.cloud\/ai\/compatibility\.md/, 'link per-service boundaries'],
  ]) {
    if (!pattern.test(text)) errors.push(`${file} must ${promise}`);
  }
}
// The service matrix lives in services.md only, and the repository template stays short.
for (const [file, text] of agentText) {
  if (file !== 'ai/services.md' && text.includes('| Service | Default | Endpoints |')) errors.push(`${file} repeats the service matrix; link https://local.cloud/ai/services.md instead`);
}
const templateWords = (agentText.get('ai/agent-template.md') ?? '').split(/\s+/).filter(Boolean).length;
if (templateWords > 550) errors.push(`ai/agent-template.md has ${templateWords} words; keep the AGENTS.md template near 500`);

for (const prohibited of [/\benterprise\b/i, /sales@/i, /\bcommercial license\b/i, /\$\d/, /\bprice\s*:/i]) {
  if (prohibited.test(JSON.stringify(productFacts))) {
    errors.push(`productFacts contains prohibited commercial term: ${prohibited}`);
  }
  if (prohibited.test(llms)) errors.push(`llms.txt contains prohibited commercial term: ${prohibited}`);
}

try {
  const pricing = await readFile(new URL('../dist/pricing/index.html', import.meta.url), 'utf8');
  for (const required of ['Public preview', 'Free to use', 'Available to everyone', 'No payment method or license key required']) {
    if (!pricing.includes(required)) errors.push(`rendered pricing page must contain ${required}`);
  }
  for (const prohibited of ['Contact us', 'Commercial license']) {
    if (pricing.includes(prohibited)) errors.push(`rendered pricing page must not contain ${prohibited}`);
  }
} catch {
  errors.push('dist/pricing/index.html must be published');
}

// "Pro" is explained once, on the pricing page, and every page that shows a service's tier uses
// the same label and links there. Raw tier values (pro, community) never render.
const pricingHtml = htmlPages.get('pricing/index.html') ?? '';
const pricingText = visibleText(pricingHtml).replace(/\s+/g, ' ');
for (const entry of pricingFaq) {
  if (!pricingHtml.includes(`id="${entry.id}"`)) errors.push(`pricing page FAQ omits the #${entry.id} anchor`);
  for (const text of [entry.question, entry.answer]) {
    if (!pricingText.includes(text)) errors.push(`pricing page FAQ omits: ${text}`);
  }
}
if (!proTierServiceNames.length || !proTierServiceNames.every((name) => (pricingFaq.find((entry) => entry.id === 'pro-tier')?.answer ?? '').includes(name))) errors.push('the pricing Pro-tier answer must name every supported Pro-tier service');
const proTierLink = /<a\b[^>]*href="\/pricing\/#pro-tier"[^>]*data-service-tier="pro"[^>]*>([^<]*)<\/a>/;
for (const service of services.filter((item) => item.minTier === 'pro' && item.marketingStatus === 'supported')) {
  const html = htmlPages.get(`services/${service.slug}/index.html`) ?? '';
  if (html.match(proTierLink)?.[1] !== proTierLabel) errors.push(`services/${service.slug}/ must show the tier as "${proTierLabel}" linked to /pricing/#pro-tier`);
  if (!service.description.endsWith(`${proTierLabel}.`)) errors.push(`${service.id} catalog description must end with "${proTierLabel}."`);
}
for (const [file, html] of htmlPages) {
  const raw = html.match(/<(?:dd|td)\b[^>]*>\s*(?:pro|community)\s*<\/(?:dd|td)>/);
  if (raw) errors.push(`${file} renders a raw service tier (${raw[0]}); use the ServiceTier component`);
}

// The cost page leads with installing LocalCloud and works from labeled assumptions; licensing
// is a secondary link, never the primary call to action.
const costMain = htmlPages.get('reduce-gcp-dev-costs/index.html')?.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const costPrimary = [...costMain.matchAll(/<a\b([^>]*class="[^"]*site-button--primary[^"]*"[^>]*)>/g)].map(([, attributes]) => attributes.match(/\bhref="([^"]+)"/)?.[1]);
if (!costPrimary.length || costPrimary.some((href) => href !== '/docs/#install-the-cli')) errors.push(`reduce-gcp-dev-costs primary buttons must open /docs/#install-the-cli (found ${costPrimary.join(', ') || 'none'})`);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
if (!new RegExp(`<code\\b[^>]*>${escapeRegExp(productFacts.installScriptCommand)}</code>`).test(costMain)) errors.push('reduce-gcp-dev-costs must show the install command');
if (!costMain.includes('id="worked-example"') || !/Assumptions/.test(costMain)) errors.push('reduce-gcp-dev-costs must publish the assumption-labeled worked example');

// Marketing Presentation Principles Verification:
// 1. Exactly two categories: 'supported' or 'unsupported' (no 'partial' status)
for (const service of services) {
  if (!['supported', 'unsupported'].includes(service.marketingStatus)) {
    errors.push(`Service ${service.id} has invalid marketingStatus '${service.marketingStatus}'; must be 'supported' or 'unsupported'`);
  }
}

// 2. Firestore is supported (disabled by default)
const firestore = services.find((s) => s.id === 'firestore');
if (!firestore || firestore.marketingStatus !== 'supported' || !isServiceDisabledByDefault(firestore)) {
  errors.push("Firestore must have marketingStatus: 'supported' and be disabled by default (!registryDefaultEnabled)");
}

// 3. Dataproc is supported
const dataproc = services.find((s) => s.id === 'dataproc');
if (!dataproc || dataproc.marketingStatus !== 'supported') {
  errors.push("Dataproc must have marketingStatus: 'supported'");
}

// Keep compatibility copy tied to current operations rather than a frozen feature list.
for (const service of services) {
  const editorial = serviceCompatibilityEditorial[service.id];
  if (!editorial?.boundaries.length) {
    errors.push(`Compatibility summary missing for ${service.id}`);
    continue;
  }
  const supportedOperations = new Set(service.operations
    .filter((operation) => ['verified', 'partial', 'release-unverified'].includes(operation.status))
    .map((operation) => operation.id));
  const referencedOperations = new Set();
  for (const capability of editorial.capabilities) {
    if (!capability.summary.trim() || !capability.operations.length) errors.push(`Empty compatibility capability for ${service.id}`);
    for (const id of capability.operations) {
      if (!supportedOperations.has(id)) errors.push(`Compatibility claim ${id} is missing or unsupported upstream`);
      referencedOperations.add(id);
    }
  }
  if (service.marketingStatus === 'unsupported' && editorial.capabilities.length) errors.push(`Unsupported service ${service.id} advertises local capabilities`);
  if (service.marketingStatus === 'supported' && !editorial.capabilities.length) errors.push(`Supported service ${service.id} has no compatibility capabilities`);
  for (const id of supportedOperations) {
    if (!referencedOperations.has(id)) errors.push(`New upstream operation ${id} needs a compatibility summary`);
  }
}

// Check the emitted table, including the compact unsupported rows and protocol/port labels.
const compatibilityHtml = htmlPages.get('compatibility/index.html') ?? '';
const compatibilityTable = compatibilityHtml.match(/<table\b[^>]*>[\s\S]*?<\/table>/)?.[0] ?? '';
const compatibilityHead = compatibilityTable.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/)?.[1] ?? '';
const compatibilityHeaders = [...compatibilityHead.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((match) => match[1].replace(/<[^>]+>/g, '').trim());
if (JSON.stringify(compatibilityHeaders) !== JSON.stringify(['Service', 'Local capabilities', 'Boundaries'])) errors.push('Compatibility table must contain only Service, Local capabilities, and Boundaries columns');
const compatibilityBody = compatibilityTable.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? '';
const compatibilityRows = [...compatibilityBody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1]);
// Unsupported is the one status label for services that do not run locally.
const unsupportedChip = /<span\b[^>]*data-unsupported-chip[^>]*>Unsupported<\/span>/;
for (const [file, html] of htmlPages) {
  if (html.includes('Planned...')) errors.push(`${file} uses the retired "Planned..." status label; use Unsupported`);
}
if (compatibilityRows.length !== services.length) errors.push('Compatibility table must include every published service');
for (const service of services) {
  const row = compatibilityRows.find((markup) => markup.includes(`/services/${service.slug}/`)) ?? '';
  const serviceCell = row.match(/<th\b[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? '';
  const unsupported = service.catalogState === 'coming-soon' || service.marketingStatus === 'unsupported';
  if (unsupportedChip.test(serviceCell) !== unsupported) errors.push(`Compatibility tag disagrees with support state for ${service.id}`);
  if (service.catalogState !== 'coming-soon' && !serviceCell.includes(service.endpointLabel)) errors.push(`Compatibility service cell omits protocol/ports for ${service.id}`);
  if (unsupported && !row.includes('colspan="2"')) errors.push(`Unsupported compatibility row ${service.id} must span its two detail columns`);
}
if (/partial support|partially supported|semantic-compatibility:|\[partial\]/i.test(compatibilityTable)) errors.push('Compatibility table exposes internal audit classifications');

// One catalog order (S13): every page that renders the full service list follows
// servicesInCatalogOrder, the order of the canonical /services/ catalog. The homepage lists
// only the services that run locally.
const catalogSlugs = servicesInCatalogOrder.map((service) => service.slug);
const localSlugs = servicesInCatalogOrder.filter((service) => service.catalogState === 'available' && service.marketingStatus === 'supported').map((service) => service.slug);
for (const [file, expected] of [
  ['index.html', localSlugs],
  ['services/index.html', catalogSlugs],
  ['gcp-emulator/index.html', catalogSlugs],
  ['compatibility/index.html', catalogSlugs],
  ['docs/services-overview/index.html', catalogSlugs],
  ['ai/index.html', catalogSlugs],
]) {
  const main = htmlPages.get(file)?.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
  const listed = [...new Set([...main.matchAll(/href="\/services\/([a-z0-9-]+)\/"/g)].map((match) => match[1]))].filter((slug) => catalogSlugs.includes(slug));
  if (JSON.stringify(listed) !== JSON.stringify(expected)) errors.push(`${file} must list ${expected.length} services in the shared catalog order (servicesInCatalogOrder); found ${listed.join(', ') || 'none'}`);
}
// The same order in generated text: the service tables in llms.txt and /ai/services.md, and the
// service registry table on /docs/configuration/.
for (const file of ['llms.txt', 'ai/services.md']) {
  const rows = (agentText.get(file) ?? '').split('\n').filter((line) => line.startsWith('| '));
  const listed = [...new Set(rows.flatMap((line) => [...line.matchAll(/https:\/\/local\.cloud\/services\/([a-z0-9-]+)\//g)].map((match) => match[1])))];
  if (JSON.stringify(listed) !== JSON.stringify(localSlugs)) errors.push(`${file} must list its ${localSlugs.length} local services in the shared catalog order (servicesInCatalogOrder); found ${listed.join(', ') || 'none'}`);
}
const registryTable = htmlPages.get('docs/configuration/index.html')?.match(/<table\b[\s\S]*?<\/table>/g)?.find((table) => table.includes('<th>Service ID</th>')) ?? '';
const registryIds = [...registryTable.matchAll(/<td><code>([a-z0-9-]+)<\/code><\/td>/g)].map((match) => match[1]);
if (JSON.stringify(registryIds) !== JSON.stringify(servicesInCatalogOrder.map((service) => service.id))) errors.push(`docs/configuration/ must list the service registry in the shared catalog order; found ${registryIds.join(', ') || 'none'}`);

// Keep every service page aligned with the compatibility table, including future updates.
const plainText = (markup) => markup.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replace(/\s+/g, ' ').trim();
const listItems = (markup) => [...markup.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => plainText(match[1]));
for (const service of services) {
  const guide = serviceGuides[service.id];
  const editorial = serviceCompatibilityEditorial[service.id];
  if (!guide?.intro || !guide.whenToUse?.trim() || !guide.typicalUses.length || !guide.example?.steps.length || !guide.reference) {
    errors.push(`Service introduction, usage, or reference missing for ${service.id}`);
    continue;
  }
  const html = htmlPages.get(`services/${service.slug}/index.html`) ?? '';
  const text = plainText(html);
  const capabilities = html.match(/<ul\b[^>]*data-service-capabilities[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? '';
  const boundaries = html.match(/<ul\b[^>]*data-service-boundaries[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? '';
  if (JSON.stringify(listItems(capabilities)) !== JSON.stringify(editorial.capabilities.map((item) => item.summary))) errors.push(`Service ${service.id} workflows differ from compatibility`);
  if (JSON.stringify(listItems(boundaries)) !== JSON.stringify(editorial.boundaries)) errors.push(`Service ${service.id} boundaries differ from compatibility`);
  const codeExamples = getServiceCodeExamples(service.id, sdkExamplesSource);
  const renderedCodes = [...html.matchAll(/<code\b[^>]*data-example-code[^>]*>([\s\S]*?)<\/code>/g)].map((match) => plainText(match[1]));
  if (JSON.stringify(renderedCodes) !== JSON.stringify(codeExamples.map((example) => example.code.replace(/\s+/g, ' ').trim()))) errors.push(`Service ${service.id} inline code differs from the SDK guide`);
  for (const example of codeExamples) {
    for (const command of [example.setup, example.run, example.filename]) {
      if (!text.includes(command.replace(/\s+/g, ' ').trim())) errors.push(`Service ${service.id} omits SDK setup or run instructions`);
    }
  }
  if (html.includes('id="performance"') || text.includes('Measure your workload') || text.includes('Performance considerations')) errors.push(`Service ${service.id} still renders the removed performance section`);
  const planned = service.catalogState === 'coming-soon' || service.marketingStatus === 'unsupported';
  // An unsupported service page is condensed: status, what to use instead, and the official docs.
  const requiredGuideContent = planned
    ? [guide.intro, 'Related guides']
    : [guide.intro, guide.whenToUse, ...guide.typicalUses, ...(codeExamples.length ? [] : [guide.example.title, ...guide.example.steps]), 'Related guides'];
  for (const required of requiredGuideContent) {
    if (!text.includes(required)) errors.push(`Service ${service.id} omits guide content: ${required}`);
  }
  if (!html.includes(`href="${guide.reference}"`)) errors.push(`Service ${service.id} omits official reference`);
  if (planned !== unsupportedChip.test(html)) errors.push(`Service ${service.id} Unsupported tag disagrees with compatibility`);
  if (planned && /<section\b[^>]*(?:\sdata-service-typical-uses|\sid="usage")/.test(html)) errors.push(`Unsupported service ${service.id} renders the supported-service template`);
  if (planned && html.includes('data-service-example')) errors.push(`Planned service ${service.id} advertises local example links`);
  if (!planned && !html.includes('data-service-example')) errors.push(`Service ${service.id} omits integration guides`);
  if (!planned && (!html.includes('data-example-environment') || !text.includes('eval "$(localcloud env)"') || !text.includes(service.envVar.split('=')[0]) || !text.includes('GOOGLE_CLOUD_PROJECT'))) errors.push(`Service ${service.id} omits generated environment setup`);
  if (planned && html.includes('data-example-environment')) errors.push(`Planned service ${service.id} advertises local environment setup`);
  for (const example of guide.examples ?? []) {
    if (!html.includes(`href="${example.href}"`)) errors.push(`Service ${service.id} omits example ${example.href}`);
  }
  if (officialSampleLinks[service.id] && !html.includes(`href="${officialSampleLinks[service.id]}"`)) errors.push(`Service ${service.id} omits official samples`);
  if (terraformExampleServiceIds.includes(service.id) && !html.includes('/docs/terraform/#supported-terraform-resources')) errors.push(`Service ${service.id} omits maintained Terraform examples`);
}
for (const id of Object.keys(serviceGuides)) {
  if (!services.some((service) => service.id === id)) errors.push(`Service guide ${id} has no published service`);
}

// The service pages that replaced the root /<service>-emulator/ pages (plan R7, S11): the
// head-term title, only ports the service uses in the description, and FAQPage JSON-LD that
// holds exactly the questions and answers the page shows.
for (const [id, searchPage] of Object.entries(emulatorSearchPages)) {
  const service = services.find((item) => item.id === id);
  const contractService = docsContract.services.find((item) => item.id === id);
  const html = htmlPages.get(`services/${service?.slug}/index.html`);
  if (!service || !contractService || !html) {
    errors.push(`emulatorSearchPages.${id} has no built service page`);
    continue;
  }
  const route = `services/${service.slug}/`;
  if (decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '') !== searchPage.title) errors.push(`${route} must use the title "${searchPage.title}"`);
  const ports = new Set([contractService.port, ...Object.values(contractService.additionalPorts)].map(String));
  for (const [port] of searchPage.description.matchAll(/\b\d{4,5}\b/g)) {
    if (!ports.has(port)) errors.push(`${route} description names port ${port}, which ${service.name} does not use`);
  }
  const faqJson = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, json]) => JSON.parse(json)).find((schema) => schema['@type'] === 'FAQPage');
  const faqSection = html.match(/<section\b[^>]*\bid="faq"[\s\S]*?<\/section>/)?.[0] ?? '';
  const shown = [...faqSection.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/g)]
    .map(([, question, answer]) => [question, answer].map((text) => visibleText(text).replace(/\s+/g, ' ').trim()));
  const published = (faqJson?.mainEntity ?? []).map((entry) => [entry.name, entry.acceptedAnswer?.text]);
  if (!shown.length) errors.push(`${route} must show its emulator FAQ in <section id="faq">`);
  if (JSON.stringify(published) !== JSON.stringify(shown)) errors.push(`${route} FAQPage JSON-LD must hold exactly the questions and answers the page shows`);
}

// 4. Prohibit 'partial local emulation' or service status badging as 'partial' in published pages
for (const [file, html] of htmlPages) {
  if (/class="[^"]*badge[^"]*"[^>]*>\s*partial\s*</i.test(html) || /partial local emulation/i.test(html)) {
    errors.push(`${file} contains prohibited 'partial' status badge or phrasing`);
  }
}

// The governing license: /license.txt is the committed copy byte for byte and /license/
// renders every word of it in order; both match the digest the documentation contract records.
const recordedLicenseDigest = docsContract.provenance.sourceDigests[docsContract.licensing.governingLicense];
try {
  const licenseFile = await readFile(new URL('license.txt', distDirectory));
  const digest = `sha256:${createHash('sha256').update(licenseFile).digest('hex')}`;
  if (digest !== recordedLicenseDigest) errors.push(`dist/license.txt (${digest}) differs from the governing license digest ${recordedLicenseDigest}`);
  const licensePage = htmlPages.get('license/index.html') ?? '';
  const article = licensePage.match(/<article\b[^>]*class="[^"]*license-document[^"]*"[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? '';
  const renderedWords = visibleText(article.replace(/<nav\b[\s\S]*?<\/nav>/g, '').replace(/<\/(?:p|li|h\d)>|<br\b[^>]*>/g, ' ')).split(/\s+/).filter(Boolean);
  const expectedWords = licenseWords(licenseFile.toString('utf8'));
  const firstDifference = expectedWords.findIndex((word, index) => renderedWords[index] !== word);
  if (firstDifference !== -1 || renderedWords.length !== expectedWords.length) {
    const at = firstDifference === -1 ? Math.min(renderedWords.length, expectedWords.length) : firstDifference;
    errors.push(`license/index.html does not render the license text verbatim; first difference at word ${at}: "${expectedWords.slice(at, at + 6).join(' ')}" vs "${renderedWords.slice(at, at + 6).join(' ')}"`);
  }
} catch (error) {
  errors.push(`dist/license.txt must be published: ${error.message}`);
}
// People reach LocalCloud at info@ from every page's footer; agents get agent@ in the
// text written for them. The contact page lists both.
const peopleEmail = productFacts.contactEmail;
const agentEmail = productFacts.agentContactEmail;
for (const [file, html] of htmlPages) {
  const footer = html.match(/<footer\b[^>]*class="[^"]*site-footer[^"]*"[^>]*>([\s\S]*?)<\/footer>/)?.[1];
  if (footer === undefined) errors.push(`${file} has no site footer`);
  else if (!footer.includes(`href="mailto:${peopleEmail}"`)) errors.push(`${file} footer must link mailto:${peopleEmail}`);
}
const contactHtml = htmlPages.get('contact/index.html') ?? '';
if (!contactHtml) errors.push('dist/contact/index.html must be published');
for (const address of [peopleEmail, agentEmail]) {
  if (contactHtml && !contactHtml.includes(`href="mailto:${address}`)) errors.push(`contact page must link mailto:${address}`);
}
if (!/^## Contact\n[\s\S]*?agent@local\.cloud[\s\S]*?info@local\.cloud/m.test(llms) || !llms.includes(agentEmail)) errors.push(`llms.txt needs a Contact section with ${agentEmail} and ${peopleEmail}`);
for (const file of ['ai/agents.md', 'ai/agent-template.md']) {
  if (!(agentText.get(file) ?? '').includes(agentEmail)) errors.push(`${file} must name ${agentEmail} for agent integrations`);
}
if (!(htmlPages.get('ai/index.html') ?? '').includes(`href="mailto:${agentEmail}"`)) errors.push(`/ai/ must link mailto:${agentEmail}`);

// security.txt (RFC 9116): required Contact and a single unexpired Expires; Canonical and
// Policy point at this site. Renew it before it lapses.
try {
  const securityTxt = await readFile(new URL('.well-known/security.txt', distDirectory), 'utf8');
  const fields = securityTxt.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('#')).map((line) => {
    const match = line.match(/^([A-Za-z-]+):\s*(\S.*)$/);
    if (!match) errors.push(`security.txt has a malformed line: ${line}`);
    return match ? [match[1].toLowerCase(), match[2].trim()] : ['', ''];
  });
  const values = (name) => fields.filter(([field]) => field === name).map(([, value]) => value);
  const expires = values('expires');
  if (!values('contact').includes(`mailto:${peopleEmail}`)) errors.push(`security.txt must list Contact: mailto:${peopleEmail}`);
  if (expires.length !== 1 || Number.isNaN(Date.parse(expires[0]))) errors.push('security.txt needs exactly one Expires date');
  else {
    const daysLeft = (Date.parse(expires[0]) - Date.now()) / 86_400_000;
    if (daysLeft <= 0) errors.push(`security.txt expired on ${expires[0]}; set a new Expires date`);
    else if (daysLeft > 366) errors.push(`security.txt Expires ${expires[0]} is more than a year away (RFC 9116 recommends less)`);
    else if (daysLeft < 60) console.warn(`::warning::security.txt expires in ${Math.floor(daysLeft)} days (${expires[0]}); renew it.`);
  }
  if (values('preferred-languages').length > 1) errors.push('security.txt may list Preferred-Languages once');
  if (!values('canonical').includes(`${siteOrigin}/.well-known/security.txt`)) errors.push('security.txt Canonical must be its own https://local.cloud URL');
  for (const policy of values('policy')) checkLocalLink('.well-known/security.txt', new URL(policy));
} catch (error) {
  errors.push(`dist/.well-known/security.txt must be published: ${error.message}`);
}

// The changelog lists every release in the committed data and links only the GitHub releases
// list, never individual release pages (older release notes predate the current image name).
const releaseData = JSON.parse(await readFile(new URL('../src/data/releases.json', import.meta.url), 'utf8'));
const changelogHtml = htmlPages.get('changelog/index.html') ?? '';
for (const release of releaseData.releases) {
  if (!changelogHtml.includes(`id="${release.tag}"`)) errors.push(`changelog omits ${release.tag}`);
}
if (/\/releases\/tag\//.test(changelogHtml)) errors.push('changelog must link the GitHub releases list, not individual release pages');
if (!changelogHtml.includes(`href="${productFacts.cliReleasesUrl}"`)) errors.push('changelog must link the GitHub releases list');

// /compare/ publishes the alternatives table with its review date, and every fact about
// another product links the official source it was checked against. Facts about other
// products go stale, so an old review warns rather than fails.
const compareHtml = htmlPages.get('compare/index.html') ?? '';
const compareTable = compareHtml.match(/<table\b[^>]*data-alternatives-table="full"[\s\S]*?<\/table>/)?.[0] ?? '';
if (!compareTable) errors.push('compare/index.html must publish the full alternatives table');
else {
  if (!compareTable.includes(`data-reviewed-at="${alternativesReviewedAt}"`) || !compareHtml.includes(`<time datetime="${alternativesReviewedAt}"`)) errors.push(`the /compare/ table must show its review date ${alternativesReviewedAt}`);
  for (const option of alternatives) {
    if (!compareTable.includes(option.name)) errors.push(`the /compare/ table omits ${option.name}`);
    for (const [row, cell] of Object.entries(option.cells)) {
      // A generic category (community emulators) names no projects and links nothing;
      // every named product cites its source.
      if (option.generic && cell.sources.length) errors.push(`alternatives: ${option.id}.${row} is a generic category and must not link a project`);
      if (!option.generic && !cell.sources.length) errors.push(`alternatives: ${option.id}.${row} has no source`);
      for (const { href } of cell.sources) {
        if (option.id !== 'localcloud' && !href.startsWith('https://')) errors.push(`alternatives: ${option.id}.${row} must cite an official https source, not ${href}`);
        if (!compareTable.includes(`href="${href}"`)) errors.push(`the /compare/ table omits the source ${href} for ${option.id}.${row}`);
      }
      if (/\$\d|\bprice\s*:/i.test(cell.text)) errors.push(`alternatives: ${option.id}.${row} states a price; describe plans, not amounts`);
    }
  }
}
const reviewAgeDays = (Date.now() - Date.parse(`${alternativesReviewedAt}T00:00:00Z`)) / 86_400_000;
if (reviewAgeDays > 120) console.warn(`::warning::The alternatives comparison was reviewed ${Math.floor(reviewAgeDays)} days ago (${alternativesReviewedAt}); re-check src/data/alternatives.ts against its sources.`);
if (!llms.includes('\n## How LocalCloud compares\n') || !comparisonSummary.every((line) => llms.includes(line))) errors.push('llms.txt must include the "How LocalCloud compares" section from src/data/alternatives.ts');

// Homepage first screen: a search-sized title and description, an H1 that names the
// audience, a definition, a real "Start free" link to the install section of the docs, the
// install command, and the trust strip with its evidence links and verification commands.
const homepage = htmlPages.get('index.html') ?? '';
const homepageMain = homepage.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const homepageTitle = decodeEntities(homepage.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
const homepageDescription = decodeEntities(homepage.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/)?.[1] ?? '');
if (!homepageTitle || homepageTitle.length > 60) errors.push(`homepage title must be 1-60 characters (${homepageTitle.length}): ${homepageTitle}`);
if (!homepageDescription || homepageDescription.length > 155) errors.push(`homepage description must be 1-155 characters (${homepageDescription.length}): ${homepageDescription}`);
const homepageH1 = visibleText(homepageMain.match(/<h1\b[\s\S]*?<\/h1>/)?.[0] ?? '').replace(/\s+/g, ' ').trim();
if (homepageH1 !== 'Google Cloud In-a-Box for developers, CI and AI agents.') errors.push(`homepage H1 reads "${homepageH1}"`);
const homepageDefinition = visibleText(homepageMain.match(/<\/h1>\s*<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '');
if (!homepageDefinition.startsWith(`LocalCloud is a local Google Cloud emulator: one Docker container that serves ${availableServiceCount} Google Cloud services on localhost`)) {
  errors.push(`the paragraph under the homepage H1 must define LocalCloud with the service count: "${homepageDefinition.slice(0, 120)}"`);
}
const startFree = [...homepageMain.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].find(([, , text]) => /Start free/.test(visibleText(text)));
if (!startFree) errors.push('homepage needs an <a> whose text contains "Start free"');
else {
  const href = decodeEntities(startFree[1].match(/\bhref="([^"]+)"/)?.[1] ?? '');
  const target = new URL(href, productFacts.siteUrl);
  const targetFile = `${target.pathname.replace(/^\//, '')}${target.pathname.endsWith('/') ? 'index.html' : ''}`;
  if (target.origin !== siteOrigin || !htmlPages.has(targetFile)) errors.push(`homepage "Start free" link ${href} must resolve to a built page`);
  else if (target.hash !== '#install-the-cli' || !htmlPages.get(targetFile).includes('id="install-the-cli"')) errors.push(`homepage "Start free" link ${href} must open the docs section with id="install-the-cli"`);
}
const homepageHero = homepageMain.match(/<section\b[^>]*class="field-hero"[\s\S]*?<\/section>/)?.[0] ?? '';
const installCode = new RegExp(`<code\\b[^>]*>${productFacts.installScriptCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</code>`);
if (!installCode.test(homepageHero) || !homepageHero.includes('aria-label="Copy install command"')) errors.push('the homepage hero must show the install command with a "Copy install command" button');
const trustStrip = homepageMain.match(/<section\b[^>]*class="field-trust"[\s\S]*?<\/section>/)?.[0] ?? '';
for (const href of ['/changelog/', '/security/', '/contact/', '/license/', '/docs/privacy/', '/compatibility/', productFacts.cliReleasesUrl]) {
  if (!trustStrip.includes(`href="${href}`)) errors.push(`homepage trust strip must link ${href}`);
}
for (const command of ['cosign verify-blob', '--certificate-oidc-issuer https://token.actions.githubusercontent.com', 'docker buildx imagetools inspect']) {
  if (!trustStrip.includes(command)) errors.push(`homepage "Verify it yourself" must include ${command}`);
}
const homepageFaqJson = [...homepage.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map(([, json]) => JSON.parse(json)).find((schema) => schema['@type'] === 'FAQPage');
const visibleQuestions = [...homepageMain.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)].map(([, text]) => visibleText(text).trim());
for (const question of homepageFaqJson?.mainEntity ?? []) {
  if (!visibleQuestions.includes(question.name)) errors.push(`homepage FAQPage JSON-LD question is not shown on the page: ${question.name}`);
}
if (!homepageFaqJson) errors.push('homepage must publish FAQPage JSON-LD for its FAQ');
if (!homepageMain.includes('data-alternatives-table="compact"')) errors.push('the homepage comparison answer must include the compact alternatives table');

// LocalStack is the only competitor the site names; Google's own emulators and the Firebase
// Local Emulator Suite are the platform vendor's tools. Small and upcoming projects are never
// named or linked: comparisons say "single-service community emulators" instead. A project
// LocalCloud is built on may be credited where the page documents that component (the
// attribution files listed); llms-full.txt may repeat those credits through the twins only.
const deniedProjects = [
  { pattern: /\blocalgcp\b/gi, name: 'localgcp' },
  { pattern: /slokam-ai/gi, name: 'localgcp (slokam-ai)' },
  { pattern: /\bgoccy\b/gi, name: 'goccy/bigquery-emulator' },
  { pattern: /\bdaytona\b/gi, name: 'Daytona' },
  { pattern: /\bnorthflank\b/gi, name: 'Northflank' },
  // Case-sensitive so the UI word "modal" (search-modal) stays allowed.
  { pattern: /\bModal\b|modal\.com/g, name: 'Modal' },
  { pattern: /fake-gcs-server|fsouza\//gi, name: 'fake-gcs-server', attribution: ['docs/architecture/index.html', 'docs/architecture.md'] },
  { pattern: /little[_-]bigtable/gi, name: 'little_bigtable', attribution: ['docs/architecture/index.html', 'docs/architecture.md', 'docs/bigtable-emulator-features/index.html', 'docs/bigtable-emulator-features.md'] },
];
const publishedText = new Map([...htmlPages, ...agentText]);
for (const { pattern, name, attribution = [] } of deniedProjects) {
  const count = (text) => (text.match(pattern) ?? []).length;
  const creditedInTwins = attribution.filter((file) => file.endsWith('.md')).reduce((sum, file) => sum + count(publishedText.get(file) ?? ''), 0);
  for (const [file, text] of publishedText) {
    if (attribution.includes(file)) continue;
    const found = count(text) - (file === 'llms-full.txt' ? creditedInTwins : 0);
    if (found > 0) errors.push(`${file} names or links ${name}; LocalStack is the only competitor the site names (use "single-service community emulators")`);
  }
}

// The runtime repository is private: no page or agent text may link it.
for (const file of [...files].filter((name) => /\.(?:html|md|txt|xml|json)$/.test(name) && !name.startsWith('pagefind/'))) {
  const text = htmlPages.get(file) ?? agentText.get(file) ?? await readFile(new URL(file, distDirectory), 'utf8');
  if (/github\.com\/jhsenjaliya\b/i.test(text)) errors.push(`${file} links the private runtime repository; link /license/ or a public page instead`);
}

// The docs sidebar (src/layouts/DocsLayout.astro) lists every built docs page.
const docsSidebar = htmlPages.get('docs/index.html')?.match(/<aside\b[^>]*class="[^"]*docs-sidebar[\s\S]*?<\/aside>/)?.[0] ?? '';
if (!docsSidebar) errors.push('docs/index.html renders no docs sidebar');
for (const file of htmlPages.keys()) {
  const slug = file.match(/^docs\/(?:([^/]+)\/)?index\.html$/);
  const route = slug && `/docs/${slug[1] ? `${slug[1]}/` : ''}`;
  if (route && !docsSidebar.includes(`href="${route}"`)) errors.push(`the docs sidebar omits ${route}; add it to sidebarSections in DocsLayout.astro`);
}

// The glossary hub works as a reference: each entry shows its term's one-sentence definition,
// the first sentence of the term page's lede, not a templated description.
const glossaryHubMain = htmlPages.get('glossary/index.html')?.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const glossaryEntries = [...glossaryHubMain.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(([card]) => card);
const glossaryTerms = [...htmlPages.keys()].filter((file) => /^glossary\/[^/]+\/index\.html$/.test(file));
if (glossaryEntries.length !== glossaryTerms.length) errors.push(`the glossary hub lists ${glossaryEntries.length} entries for ${glossaryTerms.length} glossary pages`);
for (const card of glossaryEntries) {
  const href = card.match(/<a\b[^>]*href="\/(glossary\/[^"/]+\/)"/)?.[1];
  const shown = visibleText(card.match(/<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '').trim();
  const lede = visibleText(htmlPages.get(`${href}index.html`)?.match(/<\/h1>\s*<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '').trim();
  if (!href || !lede) errors.push(`a glossary hub entry links no built glossary page: ${visibleText(card).replace(/\s+/g, ' ').trim().slice(0, 80)}`);
  else if (!/^[^.!?]+[.!?]$/.test(shown) || !lede.startsWith(shown)) errors.push(`the glossary hub entry for /${href} must show the first sentence of its definition ("${lede.match(/^.+?[.!?](?=\s|$)/)?.[0]}"), not "${shown}"`);
}

// The /agents/ hub covers one family (S28): every agent setup page, plus one link to each other
// section hub instead of repeating their page lists.
const agentsHubMain = htmlPages.get('agents/index.html')?.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const agentsHubLinks = new Set([...agentsHubMain.matchAll(/<a\b[^>]*href="([^"#?]+)/g)].map(([, href]) => href));
for (const file of htmlPages.keys()) {
  const setup = file.match(/^(agents\/[^/]+\/)index\.html$/)?.[1];
  if (setup && !agentsHubLinks.has(`/${setup}`)) errors.push(`the /agents/ hub must list /${setup}`);
}
for (const hub of ['/services/', '/workflows/', '/compare/', '/glossary/', '/blog/']) {
  if (!agentsHubLinks.has(hub)) errors.push(`the /agents/ hub must link the ${hub} hub`);
}
const repeatedHubPages = [...agentsHubLinks].filter((href) => /^\/(?:workflows|compare|glossary|blog)\/[^/]+\/$|^\/services\/[^/]+\/ai-agent-local-testing\/$/.test(href));
if (repeatedHubPages.length) errors.push(`the /agents/ hub repeats pages its section hubs list: ${repeatedHubPages.join(', ')}`);

// Overlapping pages wait for search data before any merge (plan R7). Meanwhile each pair in
// src/data/relatedPages.ts keeps its own title and H1 and links the other page inside <main>,
// and at least one of those links uses the target's canonical anchor text (case aside). No link
// uses a page's anchor for a different page. A card link is named by its heading; aria-hidden
// arrows don't count.
const anchorText = (inner) => {
  const named = inner.replace(/<(\w+)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, '');
  const heading = named.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/)?.[1];
  return visibleText(heading ?? named).replace(/\s+/g, ' ').trim();
};
const routeOf = (file) => `/${file.replace(/index\.html$/, '')}`;
const mainLinks = (file) => {
  const main = htmlPages.get(file).match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
  return [...main.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].flatMap(([, attributes, inner]) => {
    const href = attributes.match(/\bhref="([^"]+)"/)?.[1];
    return href ? [{ path: new URL(decodeEntities(href), new URL(routeOf(file), productFacts.siteUrl)).pathname, text: anchorText(inner) }] : [];
  });
};
const pairPage = (route) => {
  const file = `${route.replace(/^\//, '')}index.html`;
  const html = htmlPages.get(file);
  if (!html) return undefined;
  const text = (pattern) => visibleText(html.match(pattern)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  return { title: text(/<title>([\s\S]*?)<\/title>/), h1: text(/<h1\b[^>]*>([\s\S]*?)<\/h1>/), links: mainLinks(file) };
};
for (const { pages: [first, second], finding } of relatedPagePairs) {
  const built = [first, second].map(pairPage);
  if (built.some((page) => !page)) {
    errors.push(`related pages ${first} and ${second} (${finding}) must both be built`);
    continue;
  }
  if (built[0].title === built[1].title || built[0].h1 === built[1].h1) errors.push(`related pages ${first} and ${second} (${finding}) need their own title and H1`);
  for (const [from, page, to] of [[first, built[0], second], [second, built[1], first]]) {
    const anchor = relatedAnchor(to);
    const links = page.links.filter((link) => link.path === to);
    if (!links.length) errors.push(`${from} must link ${to} inside <main> (related pair ${finding}) with the anchor "${anchor}" from src/data/relatedPages.ts`);
    else if (!links.some((link) => link.text.toLowerCase() === anchor.toLowerCase())) errors.push(`${from} links ${to} as ${links.map((link) => `"${link.text}"`).join(', ')}; use the anchor "${anchor}" from src/data/relatedPages.ts`);
  }
}
const anchorOwners = new Map(relatedPagePairs.flatMap(({ pages }) => pages.map((path) => [relatedAnchor(path).toLowerCase(), path])));
const misusedAnchors = new Set();
for (const file of htmlPages.keys()) {
  for (const link of mainLinks(file)) {
    const owner = anchorOwners.get(link.text.toLowerCase());
    if (owner && link.path !== owner) misusedAnchors.add(`"${link.text}" links ${link.path} on ${routeOf(file)}, but it is the anchor for ${owner}`);
  }
}
errors.push(...misusedAnchors);

if (errors.length) {
  console.error('Product facts verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Product facts verification passed; local links, anchors, and site marketing principles verified across ${htmlPages.size} published pages.`);
}
