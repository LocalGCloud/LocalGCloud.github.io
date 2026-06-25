import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { productFacts } from '../src/data/productFacts.ts';

const publicDirectory = new URL('../public/', import.meta.url);
const publicPath = (file) => join(publicDirectory.pathname, file);
const errors = [];

const llms = await readFile(publicPath('llms.txt'), 'utf8');
for (const required of [
  productFacts.availabilityStatement,
  new URL(productFacts.licensingPath, productFacts.siteUrl).toString(),
  'https://local.cloud/compatibility/',
  'https://local.cloud/localstack-for-google-cloud/',
]) {
  if (!llms.includes(required)) errors.push(`llms.txt must contain ${required}`);
}

for (const prohibited of [/\benterprise\b/i, /sales@/i, /\$\d/, /\bprice\s*:/i]) {
  if (prohibited.test(JSON.stringify(productFacts))) {
    errors.push(`productFacts contains prohibited commercial term: ${prohibited}`);
  }
  if (prohibited.test(llms)) errors.push(`llms.txt contains prohibited commercial term: ${prohibited}`);
}

try {
  await access(publicPath('pricing.md'), constants.F_OK);
  errors.push('public/pricing.md must not be published');
} catch {
  // Expected: public pricing is intentionally absent.
}

try {
  await access(new URL('../dist/pricing/index.html', import.meta.url), constants.F_OK);
  errors.push('dist/pricing/index.html must not be published');
} catch {
  // Expected: no human-readable public pricing route.
}

if (errors.length) {
  console.error('Product facts verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Product facts verification passed.');
}
