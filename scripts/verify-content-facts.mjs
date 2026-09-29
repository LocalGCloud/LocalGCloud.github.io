import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { productFacts } from '../src/data/productFacts.ts';
import { services, isServiceDisabledByDefault } from '../src/data/services.ts';

const publicDirectory = new URL('../public/', import.meta.url);
const publicPath = (file) => join(publicDirectory.pathname, file);
const errors = [];
const distDirectory = new URL('../dist/', import.meta.url);
const files = new Set(await readdir(distDirectory, { recursive: true }));
const htmlPages = new Map(await Promise.all([...files].filter((file) => file.endsWith('.html')).map(async (file) => [file, await readFile(new URL(file, distDirectory), 'utf8')])));

// Check every published page, including generated agent routes, for missing local links.
for (const [file, html] of htmlPages) {
  const pageUrl = new URL(file.replace(/index\.html$/, ''), productFacts.siteUrl);
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const [, rawHref] of markup.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const target = new URL(rawHref.replaceAll('&amp;', '&'), pageUrl);
    if (target.origin !== new URL(productFacts.siteUrl).origin) continue;
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
  }
}

const llms = await readFile(publicPath('llms.txt'), 'utf8');
for (const required of [
  productFacts.availabilityStatement,
  new URL(productFacts.licensingPath, productFacts.siteUrl).toString(),
  new URL(productFacts.pricingPath, productFacts.siteUrl).toString(),
  'https://local.cloud/compatibility/',
  'https://local.cloud/localstack-for-google-cloud/',
]) {
  if (!llms.includes(required)) errors.push(`llms.txt must contain ${required}`);
}

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
