import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { licenseWords } from '../src/utils/license-document.mjs';
import { alternatives, alternativesReviewedAt, comparisonSummary } from '../src/data/alternatives.ts';
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
const illustrationsDirectory = new URL('illustrations/', publicDirectory);
for (const file of (await readdir(illustrationsDirectory)).filter((name) => name.endsWith('.svg'))) {
  const svg = await readFile(new URL(file, illustrationsDirectory), 'utf8');
  const svgText = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((match) => decodeEntities(match[1].replace(/<[^>]+>/g, ''))).join('\n');
  checkVocabulary(`public/illustrations/${file}`, svgText);
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

// The changelog lists every release in the committed data, linked to GitHub.
const releaseData = JSON.parse(await readFile(new URL('../src/data/releases.json', import.meta.url), 'utf8'));
const changelogHtml = htmlPages.get('changelog/index.html') ?? '';
for (const release of releaseData.releases) {
  if (!changelogHtml.includes(`id="${release.tag}"`) || !changelogHtml.includes(`href="${release.url}"`)) errors.push(`changelog omits ${release.tag}`);
}

// /compare/ publishes the alternatives table with its review date, and every fact about
// another product links the official source it was checked against. Facts about other
// products go stale, so an old review warns rather than fails.
const compareHtml = htmlPages.get('compare/index.html') ?? '';
const compareTable = compareHtml.match(/<table\b[^>]*data-alternatives-table="full"[\s\S]*?<\/table>/)?.[0] ?? '';
if (!compareTable) errors.push('compare/index.html must publish the full alternatives table');
else {
  if (!compareTable.includes(`data-reviewed-at="${alternativesReviewedAt}"`) || !compareTable.includes(`<time datetime="${alternativesReviewedAt}"`)) errors.push(`the /compare/ table must show its review date ${alternativesReviewedAt}`);
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

// The runtime repository is private: no page or agent text may link it.
for (const file of [...files].filter((name) => /\.(?:html|md|txt|xml|json)$/.test(name) && !name.startsWith('pagefind/'))) {
  const text = htmlPages.get(file) ?? agentText.get(file) ?? await readFile(new URL(file, distDirectory), 'utf8');
  if (/github\.com\/jhsenjaliya\b/i.test(text)) errors.push(`${file} links the private runtime repository; link /license/ or a public page instead`);
}

if (errors.length) {
  console.error('Product facts verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Product facts verification passed; local links, anchors, and site marketing principles verified across ${htmlPages.size} published pages.`);
}
