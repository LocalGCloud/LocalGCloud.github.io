import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { expectedSearchRoutes, siteOrigin } from './search-routes.mjs';

const distDirectory = new URL('../dist/', import.meta.url);
const distPath = (file) => join(distDirectory.pathname, file);
const errors = [];
const requiredSchemaTypes = new Map([
  ['/', ['Organization']],
  ['/gcp-emulator/', ['Organization', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList']],
  ['/localstack-for-google-cloud/', ['Organization', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList']],
  ['/compatibility/', ['Organization', 'SoftwareApplication', 'BreadcrumbList']],
  ['/pricing/', ['Organization', 'BreadcrumbList', 'Product']],
  ['/local-cloud-for-ai-agents/', ['Organization', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList']],
  ['/compare/localstack/', ['Organization', 'SoftwareApplication', 'BreadcrumbList']],
  ['/compare/localgcp/', ['Organization', 'SoftwareApplication', 'BreadcrumbList']],
]);

const isHtmlRoute = (route) => route.path === '/' || route.path.endsWith('/');
const routeToGeneratedFile = (route) =>
  isHtmlRoute(route) ? (route.path === '/' ? 'index.html' : `${route.path.replace(/^\//, '')}index.html`) : route.path.replace(/^\//, '');

const readRequired = async (file) => {
  try {
    await access(distPath(file), constants.R_OK);
    return await readFile(distPath(file), 'utf8');
  } catch {
    errors.push(`Missing generated file: dist/${file}`);
    return '';
  }
};

const contentAttribute = (html, name) => {
  const tag = html.match(new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, 'i'))?.[0];
  return tag?.match(/content=["']([^"']+)["']/i)?.[1]?.trim() ?? '';
};

const jsonLdTypes = (html, route) => {
  const types = [];
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(match[1]);
      if (typeof value === 'object' && value && '@type' in value) types.push(value['@type']);
    } catch {
      errors.push(`${route}: contains invalid JSON-LD`);
    }
  }
  return types;
};

for (const route of expectedSearchRoutes) {
  const html = await readRequired(routeToGeneratedFile(route));
  if (!html) continue;
  if (!isHtmlRoute(route)) continue;

  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = contentAttribute(html, 'description');
  const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  const expectedCanonical = new URL(route.path, siteOrigin).toString();

  if (!title) errors.push(`${route.path}: missing title`);
  if (!description) errors.push(`${route.path}: missing meta description`);
  if (canonical !== expectedCanonical) {
    errors.push(`${route.path}: canonical ${canonical ?? 'missing'} does not equal ${expectedCanonical}`);
  }
  if (h1Count !== 1) errors.push(`${route.path}: expected one H1, found ${h1Count}`);
  if (/name=["']robots["'][^>]*noindex|content=["'][^"']*noindex/i.test(html)) {
    errors.push(`${route.path}: unexpectedly contains noindex`);
  }

  const schemaTypes = jsonLdTypes(html, route.path);
  for (const type of requiredSchemaTypes.get(route.path) ?? []) {
    if (!schemaTypes.includes(type)) errors.push(`${route.path}: missing ${type} JSON-LD`);
  }
}

const robots = await readRequired('robots.txt');
if (robots && !robots.includes(`${siteOrigin}/sitemap-index.xml`)) {
  errors.push('robots.txt does not reference the canonical sitemap index');
}
for (const crawler of ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Bingbot']) {
  const crawlerRule = new RegExp(`User-agent:\\s*${crawler}\\s*\\nAllow:\\s*/`, 'i');
  if (robots && !crawlerRule.test(robots)) errors.push(`robots.txt does not explicitly allow ${crawler}`);
}

const sitemapIndex = await readRequired('sitemap-index.xml');
const sitemapAlias = await readRequired('sitemap.xml');
if (sitemapIndex && sitemapAlias && sitemapIndex !== sitemapAlias) {
  errors.push('sitemap.xml does not match sitemap-index.xml');
}

const sitemapFiles = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname.replace(/^\//, ''));
let sitemapXml = '';
for (const sitemapFile of sitemapFiles) sitemapXml += await readRequired(sitemapFile);
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

for (const route of expectedSearchRoutes) {
  const expectedUrl = new URL(route.path, siteOrigin).toString();
  const matches = sitemapUrls.filter((url) => url === expectedUrl).length;
  if (matches !== 1) errors.push(`${route.path}: expected exactly one sitemap entry, found ${matches}`);
}

if (errors.length) {
  console.error('Static SEO verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Static SEO verification passed for ${expectedSearchRoutes.length} priority routes.`);
}
