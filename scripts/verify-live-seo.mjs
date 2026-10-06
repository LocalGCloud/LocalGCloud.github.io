import { readFileSync } from 'node:fs';
import { expectedSearchRoutes, siteOrigin } from './search-routes.mjs';

const baseUrl = process.env.SEO_VERIFY_BASE_URL?.replace(/\/$/, '');
const attempts = Number.parseInt(process.env.SEO_VERIFY_ATTEMPTS ?? '6', 10);
const delayMs = Number.parseInt(process.env.SEO_VERIFY_DELAY_MS ?? '10000', 10);

if (!baseUrl) {
  // CI must always verify the deployment; only local runs may skip.
  if (process.env.CI) {
    console.error('Live SEO verification requires SEO_VERIFY_BASE_URL in CI.');
    process.exit(1);
  }
  console.log('Live SEO verification skipped: set SEO_VERIFY_BASE_URL to enable it.');
  process.exit(0);
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const errors = [];

const fetchWithRetries = async (url) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  throw lastError;
};

for (const route of expectedSearchRoutes) {
  const url = new URL(route.path, `${baseUrl}/`).toString();
  try {
    const response = await fetchWithRetries(url);
    const html = await response.text();
    if (route.path !== '/' && !route.path.endsWith('/')) {
      if (!html.trim()) errors.push(`${route.path}: raw document is empty`);
      if (/^\s*(?:<!doctype\s+html\b|<html\b)/i.test(html)) errors.push(`${route.path}: raw document returned HTML`);
      continue;
    }
    const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    const expectedCanonical = new URL(route.path, siteOrigin).toString();
    if (canonical !== expectedCanonical) errors.push(`${route.path}: canonical ${canonical ?? 'missing'} does not equal ${expectedCanonical}`);
    if (/<title>404\b/i.test(html) || /<h1[^>]*>\s*Page not found/i.test(html)) errors.push(`${route.path}: rendered 404 content`);
  } catch (error) {
    errors.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Served-behavior checks. Each request is made once: a wrong status here is a defect, not lag.
// This script stays dependency-free because the custom-domain CI job runs without pnpm install.
const canonicalHost = new URL(baseUrl).hostname === new URL(siteOrigin).hostname;
const repoFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fetchOnce = (path, init = {}) => fetch(new URL(path, `${baseUrl}/`), { redirect: 'manual', ...init });
const check = async (label, run) => {
  try {
    await run();
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

await check('host indexing', async () => {
  const robots = (await fetchOnce('/docs/')).headers.get('x-robots-tag') ?? '';
  if (canonicalHost && /noindex/i.test(robots)) errors.push(`/docs/: X-Robots-Tag ${robots} blocks indexing on the canonical host`);
  if (!canonicalHost && !/noindex/i.test(robots)) errors.push(`/docs/: ${new URL(baseUrl).hostname} must send X-Robots-Tag: noindex`);
});

await check('compression', async () => {
  const page = await fetchOnce('/docs/', { headers: { 'Accept-Encoding': 'br' } });
  if (page.headers.get('content-encoding') !== 'br') errors.push(`/docs/: expected Brotli for Accept-Encoding: br, got ${page.headers.get('content-encoding') ?? 'none'}`);
  if (!/\bno-transform\b/.test(page.headers.get('cache-control') ?? '')) errors.push('/docs/: HTML must be served with Cache-Control no-transform');
  await page.arrayBuffer();
});

await check('charset', async () => {
  for (const path of ['/docs/', '/llms.txt', '/llms-full.txt', '/ai/agents.md', '/ai/services.md']) {
    const response = await fetchOnce(path);
    if (!/charset=utf-8/i.test(response.headers.get('content-type') ?? '')) errors.push(`${path}: content-type ${response.headers.get('content-type')} has no charset=utf-8`);
    await response.arrayBuffer();
  }
});

await check('robots.txt', async () => {
  const live = await (await fetchOnce('/robots.txt')).text();
  if (live.trim() !== repoFile('public/robots.txt').trim()) errors.push('/robots.txt: live file differs from public/robots.txt');
});

await check('sitemap', async () => {
  const locations = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  const index = await fetchOnce('/sitemap-index.xml');
  if (index.status !== 200) throw new Error(`/sitemap-index.xml returned ${index.status}`);
  const urls = [];
  for (const sitemap of locations(await index.text())) {
    const response = await fetchOnce(new URL(sitemap).pathname);
    if (response.status !== 200) throw new Error(`${new URL(sitemap).pathname} returned ${response.status}`);
    urls.push(...locations(await response.text()));
  }
  if (!urls.length) throw new Error('no URLs listed');
  for (let start = 0; start < urls.length; start += 8) {
    await Promise.all(urls.slice(start, start + 8).map(async (url) => {
      const path = new URL(url).pathname;
      const response = await fetchOnce(path, { method: 'HEAD' });
      if (response.status !== 200) errors.push(`${path}: listed in the sitemap but returned ${response.status}`);
    }));
  }
});

await check('redirects', async () => {
  const rules = repoFile('public/_redirects').split('\n').map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')).map((line) => line.split(/\s+/));
  for (const [source, target] of [...rules, ['/docs', '/docs/']]) {
    const response = await fetchOnce(source);
    const location = response.headers.get('location');
    if (response.status !== 301 || !location || new URL(location, `${baseUrl}/`).pathname !== target) {
      errors.push(`${source}: expected 301 to ${target}, got ${response.status} ${location ?? ''}`.trim());
    }
  }
});

await check('not found', async () => {
  for (const path of ['/this-page-does-not-exist/', '/this-page-does-not-exist', '/404']) {
    const response = await fetchOnce(path);
    if (response.status !== 404) errors.push(`${path}: expected 404, got ${response.status}`);
    await response.arrayBuffer();
  }
});

if (canonicalHost) {
  await check('www redirect', async () => {
    const response = await fetch('https://www.local.cloud/docs/', { redirect: 'manual' });
    if (![301, 308].includes(response.status) || !response.headers.get('location')?.startsWith(`${siteOrigin}/docs/`)) {
      errors.push(`www.local.cloud/docs/: expected a permanent redirect to ${siteOrigin}/docs/, got ${response.status}`);
    }
  });
  await check('edge compression', async () => {
    const response = await fetchOnce('/llms.txt', { headers: { 'Accept-Encoding': 'br, gzip' } });
    if (!response.headers.get('content-encoding')) errors.push('/llms.txt: Cloudflare did not compress the text response');
    await response.arrayBuffer();
  });
  // Agents fetch pages with scripting clients; Browser Integrity Check (error 1010) blocks
  // Python's urllib. The zone setting lives outside the repository (docs/cloudflare-deployment.md).
  await check('scripted clients', async () => {
    for (const path of ['/llms.txt', '/docs/']) {
      const response = await fetchOnce(path, { headers: { 'User-Agent': 'Python-urllib/3.12' } });
      if (response.status !== 200) errors.push(`${path} returned ${response.status} to Python-urllib; turn off Browser Integrity Check for the zone`);
      await response.arrayBuffer();
    }
  });
}


if (errors.length) {
  console.error(`Live SEO verification failed for ${baseUrl}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Live SEO verification passed for ${expectedSearchRoutes.length} priority routes and served-behavior checks at ${baseUrl}.`);
}
