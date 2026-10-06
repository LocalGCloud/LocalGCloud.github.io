import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { docsContract } from '../src/data/docs-contract.ts';
import { productFacts } from '../src/data/productFacts.ts';
import { cliQuickStart } from '../src/utils/quickstart.mjs';
import { services, isServiceDisabledByDefault } from '../src/data/services.ts';
import { serviceCompatibilityEditorial } from '../src/data/serviceEditorial.ts';
import { getServiceCodeExamples, serviceGuides, officialSampleLinks, terraformExampleServiceIds } from '../src/data/serviceGuides.ts';
const sdkExamplesSource = await readFile(new URL('../src/pages/docs/sdk-examples.mdx', import.meta.url), 'utf8');

const publicDirectory = new URL('../public/', import.meta.url);
const publicPath = (file) => join(publicDirectory.pathname, file);
const errors = [];
const distDirectory = new URL('../dist/', import.meta.url);
const files = new Set(await readdir(distDirectory, { recursive: true }));
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
const isMarkdownTwin = (file) => /^(?:docs|services)\/[^/]+\.md$/.test(file);
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
if (compatibilityRows.length !== services.length) errors.push('Compatibility table must include every published service');
for (const service of services) {
  const row = compatibilityRows.find((markup) => markup.includes(`/services/${service.slug}/`)) ?? '';
  const serviceCell = row.match(/<th\b[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? '';
  const unsupported = service.catalogState === 'coming-soon' || service.marketingStatus === 'unsupported';
  if (serviceCell.includes('>Planned...</span>') !== unsupported) errors.push(`Compatibility tag disagrees with support state for ${service.id}`);
  if (service.catalogState !== 'coming-soon' && !serviceCell.includes(service.endpointLabel)) errors.push(`Compatibility service cell omits protocol/ports for ${service.id}`);
  if (unsupported && !row.includes('colspan="2"')) errors.push(`Unsupported compatibility row ${service.id} must span its two detail columns`);
}
if (/partial support|partially supported|semantic-compatibility:|\[partial\]/i.test(compatibilityTable)) errors.push('Compatibility table exposes internal audit classifications');

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
  for (const required of [guide.intro, guide.whenToUse, ...guide.typicalUses, ...(codeExamples.length ? [] : [guide.example.title, ...guide.example.steps]), 'Related guides']) {
    if (!text.includes(required)) errors.push(`Service ${service.id} omits guide content: ${required}`);
  }
  if (!html.includes(`href="${guide.reference}"`)) errors.push(`Service ${service.id} omits official reference`);
  const planned = service.catalogState === 'coming-soon' || service.marketingStatus === 'unsupported';
  if (planned !== html.includes('>Planned...</span>')) errors.push(`Service ${service.id} planned tag disagrees with compatibility`);
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

// 4. Prohibit 'partial local emulation' or service status badging as 'partial' in published pages
for (const [file, html] of htmlPages) {
  if (/class="[^"]*badge[^"]*"[^>]*>\s*partial\s*</i.test(html) || /partial local emulation/i.test(html)) {
    errors.push(`${file} contains prohibited 'partial' status badge or phrasing`);
  }
}

if (errors.length) {
  console.error('Product facts verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Product facts verification passed; local links, anchors, and site marketing principles verified across ${htmlPages.size} published pages.`);
}
