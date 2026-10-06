import { readFile, readdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { expectedSearchRoutes, siteOrigin } from './search-routes.mjs';

const distDirectory = new URL('../dist/', import.meta.url);
const distPath = (file) => join(distDirectory.pathname, file);
const errors = [];
const warnings = [];

// Search snippet limits for every indexable page: Google shows about 155-160
// characters of a description and about 60 characters of a title.
const descriptionLength = { min: 70, max: 160 };
const titleLength = { warn: 60, max: 65 };
// Internal QA and audit wording that reads as jargon in a search result (A9).
const bannedMetaJargon = [
  [/loopback/i, 'loopback'],
  [/evidence-(?:bounded|backed|scoped|first)/i, 'evidence-* qualifiers'],
  [/license-gated/i, 'license-gated'],
  [/\bboundar(?:y|ies)\b/i, 'boundaries'],
  [/\bcaveats?\b/i, 'caveats'],
  [/unlicensed/i, 'unlicensed'],
];
// The full product entity (Product + SoftwareApplication with offers) lives on / and
// /pricing/ only; every other page is a WebPage, TechArticle or BlogPosting about it.
const requiredSchemaTypes = new Map([
  ['/', ['Organization', 'Product', 'SoftwareApplication', 'FAQPage']],
  ['/gcp-emulator/', ['Organization', 'WebPage', 'FAQPage', 'BreadcrumbList']],
  ['/localstack-for-google-cloud/', ['Organization', 'WebPage', 'FAQPage', 'BreadcrumbList']],
  ['/compatibility/', ['Organization', 'WebPage', 'BreadcrumbList']],
  ['/pricing/', ['Organization', 'BreadcrumbList', 'Product', 'SoftwareApplication']],
  ['/ai/', ['Organization', 'WebPage', 'BreadcrumbList']],
  ['/local-cloud-for-ai-agents/', ['Organization', 'WebPage', 'FAQPage', 'BreadcrumbList']],
  ['/compare/localstack/', ['Organization', 'WebPage', 'BreadcrumbList']],
  ['/license/', ['Organization', 'WebPage', 'BreadcrumbList']],
  ['/contact/', ['Organization', 'ContactPage', 'BreadcrumbList']],
  ['/security/', ['Organization', 'WebPage', 'BreadcrumbList']],
  ['/about/', ['Organization', 'AboutPage', 'BreadcrumbList']],
  ['/changelog/', ['Organization', 'WebPage', 'BreadcrumbList']],
]);

// Required types by page family, on top of the route list above.
const schemaFamilies = [
  [/^\/blog\/[^/]+\/$/, ['BlogPosting', 'BreadcrumbList']],
  [/^\/services\/[^/]+\/$/, ['TechArticle', 'BreadcrumbList']],
  [/^\/(?:agents|workflows)\/[^/]+\/$/, ['TechArticle', 'BreadcrumbList']],
  [/^\/(?:compare|glossary)\/[^/]+\/$/, ['WebPage', 'BreadcrumbList']],
  // The service pages that answer "<service> emulator" searches carry the setup FAQ.
  [/^\/services\/(?:bigquery|bigtable|cloud-storage|firestore|pubsub|spanner)\/$/, ['FAQPage']],
  [/^\/docs\//, ['TechArticle']],
];
const productPages = new Set(['/', '/pricing/']);
const productId = `${siteOrigin}/#localcloud`;
const pageNodeTypes = ['WebPage', 'TechArticle', 'BlogPosting', 'AboutPage', 'ContactPage'];
const isoDate = /^\d{4}-\d{2}-\d{2}/;

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

const decodeEntities = (text) => text
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
// Astro writes attributes in double quotes and escapes quotes inside them.
const metaContent = (html, attribute, name) => {
  const tag = html.match(new RegExp(`<meta\\s+[^>]*${attribute}="${name}"[^>]*>`, 'i'))?.[0];
  const value = tag?.match(/\bcontent="([^"]*)"/i)?.[1];
  return value === undefined ? '' : decodeEntities(value).trim();
};
const contentAttribute = (html, name) => metaContent(html, 'name', name);
const isNoindex = (html) => /\bnoindex\b/i.test(contentAttribute(html, 'robots'));

// Every built page: dist/index.html and dist/**/index.html (404.html is not a route).
const pageFiles = (await readdir(distDirectory, { recursive: true }))
  .filter((file) => (file === 'index.html' || file.endsWith('/index.html')) && !file.startsWith('pagefind/'))
  .sort();
const routeForFile = (file) => (file === 'index.html' ? '/' : `/${file.slice(0, -'index.html'.length)}`);

const jsonLdTypes = (html, route) => {
  const types = [];
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    // Serializers escape "<" as \u003c, so copy cannot close the script element early.
    if (match[1].includes('<')) errors.push(`${route}: JSON-LD contains an unescaped "<"`);
    let value;
    try {
      value = JSON.parse(match[1]);
    } catch {
      errors.push(`${route}: contains invalid JSON-LD`);
      continue;
    }
    {
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
          if (value['@id'] !== productId) errors.push(`${route}: Product JSON-LD must use @id ${productId}`);
          if (!value.offers) errors.push(`${route}: Product JSON-LD must include the public-preview offer`);
        }
        // One product entity: other pages refer to it instead of repeating it (A13).
        if ((schemaTypes.includes('Product') || schemaTypes.includes('SoftwareApplication')) && !productPages.has(route)) {
          errors.push(`${route}: Product and SoftwareApplication JSON-LD belong on / and /pricing/ only; use createWebPageSchema`);
        }
        if (schemaTypes.some((type) => pageNodeTypes.includes(type))) {
          if (value.publisher?.['@id'] !== organizationContract['@id']) errors.push(`${route}: ${schemaTypes.join('/')} JSON-LD must name the publisher by @id ${organizationContract['@id']}`);
          if (!value.url && !value.mainEntityOfPage) errors.push(`${route}: ${schemaTypes.join('/')} JSON-LD must include the page URL`);
        }
        if (schemaTypes.includes('TechArticle') || schemaTypes.includes('BlogPosting')) {
          if (value.about?.['@id'] !== productId) errors.push(`${route}: ${schemaTypes.join('/')} JSON-LD must be about @id ${productId}`);
          if (!value.headline) errors.push(`${route}: ${schemaTypes.join('/')} JSON-LD must include a headline`);
          if (!isoDate.test(value.dateModified ?? '')) errors.push(`${route}: ${schemaTypes.join('/')} JSON-LD must include dateModified`);
        }
        if (schemaTypes.includes('BlogPosting') && !isoDate.test(value.datePublished ?? '')) errors.push(`${route}: BlogPosting JSON-LD must include datePublished`);
      }
    }
  }
  return types;
};

// Priority routes must be built, and their HTML pages must stay indexable.
for (const route of expectedSearchRoutes) {
  const html = await readRequired(routeToGeneratedFile(route));
  if (html && isHtmlRoute(route) && isNoindex(html)) errors.push(`${route.path}: unexpectedly contains noindex`);
}

// PNG signature plus IHDR width and height; undefined when the file is not a PNG.
const pngSize = (png) =>
  png.length >= 33 && png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
    ? { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
    : undefined;
// JPEG starts with FF D8 FF; WebP is a RIFF container tagged WEBP.
const isRaster = (image) =>
  pngSize(image) !== undefined ||
  image.subarray(0, 3).toString('hex') === 'ffd8ff' ||
  (image.subarray(0, 4).toString() === 'RIFF' && image.subarray(8, 12).toString() === 'WEBP');
const shareImages = new Map();
const readShareImage = async (url) => {
  if (!shareImages.has(url)) {
    let image;
    try {
      const { origin, pathname } = new URL(url);
      if (origin === siteOrigin) image = await readFile(distPath(decodeURIComponent(pathname).replace(/^\//, '')));
    } catch {
      image = undefined;
    }
    shareImages.set(url, image);
  }
  return shareImages.get(url);
};
const propertyContent = (html, property) => metaContent(html, 'property', property);

const indexableRoutes = [];
const seenTitles = new Map();
const seenDescriptions = new Map();
// Site search (Pagefind) indexes only bodies marked data-pagefind-body: every indexable page, never a noindex one.
const hasPagefindBody = (html) => /<body\b[^>]*\bdata-pagefind-body\b/i.test(html);
if (hasPagefindBody(await readRequired('404.html'))) errors.push('404.html: the 404 page must not be indexed by site search');
for (const file of pageFiles) {
  const route = { path: routeForFile(file) };
  const html = await readRequired(file);
  if (!html) continue;
  if (isNoindex(html)) {
    if (hasPagefindBody(html)) errors.push(`${route.path}: noindex page must not carry data-pagefind-body`);
    continue;
  }
  indexableRoutes.push(route.path);
  if (!hasPagefindBody(html)) errors.push(`${route.path}: indexable page must mark <body> with data-pagefind-body`);

  if (route.path === '/') {
    for (const [rel, file, size] of [['icon', 'favicon.png', 96], ['apple-touch-icon', 'apple-touch-icon.png', 180]]) {
      const link = html.match(new RegExp(`<link\\s+[^>]*rel=["']${rel}["'][^>]*>`, 'i'))?.[0] ?? '';
      if (!link.includes(`href="/${file}"`) || !link.includes(`sizes="${size}x${size}"`)) {
        errors.push(`Homepage must declare the ${size}x${size} /${file} ${rel}`);
      }
      try {
        const dimensions = pngSize(await readFile(distPath(file)));
        if (dimensions?.width !== size || dimensions?.height !== size) {
          errors.push(`${file}: expected a ${size}x${size} PNG`);
        }
      } catch {
        errors.push(`Missing generated icon: dist/${file}`);
      }
    }
  }

  const title = decodeEntities(html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '').trim();
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

  // Share previews: a raster og:image served by this site, with its size and alt text,
  // and a large Twitter card. Social networks and chat apps ignore SVG images.
  const ogImage = propertyContent(html, 'og:image');
  const ogImageWidth = Number(propertyContent(html, 'og:image:width'));
  const ogImageHeight = Number(propertyContent(html, 'og:image:height'));
  const image = ogImage ? await readShareImage(ogImage) : undefined;
  if (!ogImage) errors.push(`${route.path}: missing og:image`);
  else if (!ogImage.startsWith(`${siteOrigin}/`)) errors.push(`${route.path}: og:image must be an absolute ${siteOrigin} URL: ${ogImage}`);
  else if (!image) errors.push(`${route.path}: og:image ${ogImage} is not a built file`);
  else if (!isRaster(image)) errors.push(`${route.path}: og:image ${ogImage} must be a PNG, JPEG or WebP image`);
  else if (pngSize(image) && (pngSize(image).width !== ogImageWidth || pngSize(image).height !== ogImageHeight)) {
    errors.push(`${route.path}: og:image:width and og:image:height must match the ${pngSize(image).width}x${pngSize(image).height} PNG`);
  }
  if (!propertyContent(html, 'og:image:alt')) errors.push(`${route.path}: missing og:image:alt`);
  if (propertyContent(html, 'og:site_name') !== 'LocalCloud') errors.push(`${route.path}: og:site_name must be LocalCloud`);
  if (propertyContent(html, 'og:url') !== expectedCanonical) errors.push(`${route.path}: og:url must equal the canonical URL`);
  if (contentAttribute(html, 'twitter:card') !== 'summary_large_image') errors.push(`${route.path}: twitter:card must be summary_large_image`);
  if (contentAttribute(html, 'twitter:image') !== ogImage) errors.push(`${route.path}: twitter:image must match og:image`);
  // Blog posts are articles with publish and update times; every other page is a website.
  const isBlogPost = /^\/blog\/[^/]+\/$/.test(route.path);
  const ogType = propertyContent(html, 'og:type');
  if (ogType !== (isBlogPost ? 'article' : 'website')) errors.push(`${route.path}: og:type must be ${isBlogPost ? 'article' : 'website'}, found ${ogType || 'none'}`);
  if (isBlogPost) {
    for (const property of ['article:published_time', 'article:modified_time']) {
      if (!/^\d{4}-\d{2}-\d{2}/.test(propertyContent(html, property))) errors.push(`${route.path}: missing ${property}`);
    }
  }

  if (title.length > titleLength.max) errors.push(`${route.path}: title is ${title.length} characters (max ${titleLength.max}): ${title}`);
  else if (title.length > titleLength.warn) warnings.push(`${route.path}: title is ${title.length} characters (aim for ${titleLength.warn} or fewer): ${title}`);
  if ((title.match(/LocalCloud/g) ?? []).length > 1) errors.push(`${route.path}: title repeats the brand: ${title}`);
  if (description && (description.length < descriptionLength.min || description.length > descriptionLength.max)) {
    errors.push(`${route.path}: description is ${description.length} characters (${descriptionLength.min}-${descriptionLength.max}): ${description}`);
  }
  for (const [pattern, label] of bannedMetaJargon) {
    if (pattern.test(title)) errors.push(`${route.path}: title uses audit jargon (${label}): ${title}`);
    if (pattern.test(description)) errors.push(`${route.path}: description uses audit jargon (${label}): ${description}`);
  }
  for (const [value, seen, kind] of [[title, seenTitles, 'title'], [description, seenDescriptions, 'description']]) {
    if (!value) continue;
    if (seen.has(value)) errors.push(`${route.path}: duplicate ${kind} with ${seen.get(value)}`);
    else seen.set(value, route.path);
  }

  const schemaTypes = jsonLdTypes(html, route.path);
  if (!schemaTypes.includes('Organization')) errors.push(`${route.path}: missing Organization JSON-LD`);
  const requiredTypes = [
    ...(requiredSchemaTypes.get(route.path) ?? []),
    ...schemaFamilies.filter(([pattern]) => pattern.test(route.path)).flatMap(([, types]) => types),
  ];
  for (const type of new Set(requiredTypes)) {
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
const sitemapEntries = [...sitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
  url: entry.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '',
  lastmod: entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
}));
const sitemapUrls = sitemapEntries.map((entry) => entry.url);

for (const { url, lastmod } of sitemapEntries) {
  const route = { path: new URL(url).pathname };
  // Raw Markdown and text routes are linked from llms.txt, not listed in the sitemap.
  if (!isHtmlRoute(route)) {
    errors.push(`${route.path}: only HTML pages belong in the sitemap`);
    continue;
  }
  const html = await readRequired(routeToGeneratedFile(route));
  if (isNoindex(html)) {
    errors.push(`${route.path}: noindex page must not appear in the sitemap`);
  }
  if (!isoDate.test(lastmod ?? '')) errors.push(`${route.path}: sitemap entry has no lastmod`);
  else if (new Date(lastmod) > new Date()) errors.push(`${route.path}: sitemap lastmod ${lastmod} is in the future`);
}

// Every indexable page is discoverable through the sitemap (V2).
const sitemapUrlSet = new Set(sitemapUrls);
for (const path of indexableRoutes) {
  if (!sitemapUrlSet.has(new URL(path, siteOrigin).toString())) errors.push(`${path}: indexable page is missing from the sitemap`);
}

for (const route of expectedSearchRoutes.filter(isHtmlRoute)) {
  const expectedUrl = new URL(route.path, siteOrigin).toString();
  const matches = sitemapUrls.filter((url) => url === expectedUrl).length;
  if (matches !== 1) errors.push(`${route.path}: expected exactly one sitemap entry, found ${matches}`);
}

if (warnings.length) {
  console.warn('Static SEO warnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length) {
  console.error('Static SEO verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Static SEO verification passed for ${indexableRoutes.length} indexable pages and ${expectedSearchRoutes.length} priority routes.`);
}
