import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

const distDirectory = new URL('../dist/', import.meta.url);
const sitemapIndex = new URL('sitemap-index.xml', distDirectory);
const sitemapAlias = new URL('sitemap.xml', distDirectory);

try {
  await access(sitemapIndex, constants.R_OK);
} catch {
  throw new Error('Expected dist/sitemap-index.xml after Astro build.');
}

await copyFile(sitemapIndex, sitemapAlias);
console.log(`Wrote ${join('dist', 'sitemap.xml')} from sitemap-index.xml`);
