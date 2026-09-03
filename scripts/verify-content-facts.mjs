import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { productFacts } from '../src/data/productFacts.ts';

const publicDirectory = new URL('../public/', import.meta.url);
const publicPath = (file) => join(publicDirectory.pathname, file);
const errors = [];

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

if (errors.length) {
  console.error('Product facts verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Product facts verification passed.');
}
