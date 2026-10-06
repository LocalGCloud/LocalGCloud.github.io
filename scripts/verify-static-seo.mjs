import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { expectedSearchRoutes, siteOrigin } from './search-routes.mjs';

const distDirectory = new URL('../dist/', import.meta.url);
const distPath = (file) => join(distDirectory.pathname, file);
const errors = [];
const requiredSchemaTypes = new Map([
  ['/', ['Organization', 'Product', 'SoftwareApplication']],
  ['/gcp-emulator/', ['Organization', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList']],
  ['/localstack-for-google-cloud/', ['Organization', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList']],
  ['/compatibility/', ['Organization', 'SoftwareApplication', 'BreadcrumbList']],
  ['/pricing/', ['Organization', 'BreadcrumbList', 'Product']],
  ['/local-cloud-for-ai-agents/', ['Organization', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList']],
  ['/compare/localstack/', ['Organization', 'SoftwareApplication', 'BreadcrumbList']],
  ['/license/', ['Organization', 'WebPage', 'BreadcrumbList']],
  ['/contact/', ['Organization', 'ContactPage', 'BreadcrumbList']],
  ['/security/', ['Organization', 'WebPage', 'BreadcrumbList']],
  ['/about/', ['Organization', 'AboutPage', 'BreadcrumbList']],
  ['/changelog/', ['Organization', 'WebPage', 'BreadcrumbList']],
]);

// The shared Organization node: a stable @id, the people-facing address and the
// agent-facing address as contact points, and public profiles only.
const organizationContract = {
  '@id': `${siteOrigin}/#org`,
  email: 'info@local.cloud',
  contactEmails: ['info@local.cloud', 'agent@local.cloud'],
  sameAs: ['https://github.com/LocalGCloud', 'https://github.com/LocalGCloud/localcloud-cli', 'https://hub.docker.com/r/agentcloud/localcloud'],
};

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
      if (typeof value === 'object' && value && '@type' in value) {
        const schemaTypes = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
        types.push(...schemaTypes);
        if (schemaTypes.includes('Organization')) {
          const contactEmails = (value.contactPoint ?? []).map((point) => point.email).sort();
          if (value['@id'] !== organizationContract['@id']) errors.push(`${route}: Organization JSON-LD must use @id ${organizationContract['@id']}`);
          if (value.email !== organizationContract.email) errors.push(`${route}: Organization JSON-LD email must be ${organizationContract.email}`);
          if (JSON.stringify(contactEmails) !== JSON.stringify([...organizationContract.contactEmails].sort())) errors.push(`${route}: Organization contactPoint emails must be ${organizationContract.contactEmails.join(' and ')}`);
          if (JSON.stringify(value.sameAs) !== JSON.stringify(organizationContract.sameAs)) errors.push(`${route}: Organization sameAs must list the public profiles ${organizationContract.sameAs.join(', ')}`);
        }
        if (schemaTypes.includes('Product')) {
          if (typeof value.image !== 'string' || !URL.canParse(value.image) || new URL(value.image).protocol !== 'https:') {
            errors.push(`${route}: Product JSON-LD must include an absolute HTTPS image URL`);
          }
          if (value.audience != null && value.audience['@type'] !== 'PeopleAudience') {
            errors.push(`${route}: Product JSON-LD audience must use Google's supported PeopleAudience type`);
          }
        }
      }
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

  if (route.path === '/') {
    for (const [rel, file, size] of [['icon', 'favicon.png', 96], ['apple-touch-icon', 'apple-touch-icon.png', 180]]) {
      const link = html.match(new RegExp(`<link\\s+[^>]*rel=["']${rel}["'][^>]*>`, 'i'))?.[0] ?? '';
      if (!link.includes(`href="/${file}"`) || !link.includes(`sizes="${size}x${size}"`)) {
        errors.push(`Homepage must declare the ${size}x${size} /${file} ${rel}`);
      }
      try {
        const png = await readFile(distPath(file));
        if (png.length < 33 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) {
          errors.push(`${file}: expected a ${size}x${size} PNG`);
        }
      } catch {
        errors.push(`Missing generated icon: dist/${file}`);
      }
    }
  }

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
for (const crawler of [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Google-CloudVertexBot',
  'Applebot', 'Applebot-Extended',
  'Bingbot', 'Meta-ExternalAgent', 'Amazonbot', 'DuckAssistBot', 'CCBot',
]) {
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

for (const url of sitemapUrls) {
  const route = { path: new URL(url).pathname };
  if (!isHtmlRoute(route)) continue;
  const html = await readRequired(routeToGeneratedFile(route));
  if (/\bnoindex\b/i.test(contentAttribute(html, 'robots'))) {
    errors.push(`${route.path}: noindex page must not appear in the sitemap`);
  }
}

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
