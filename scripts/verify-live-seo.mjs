import { expectedSearchRoutes, siteOrigin } from './search-routes.mjs';

const baseUrl = process.env.SEO_VERIFY_BASE_URL?.replace(/\/$/, '');
const attempts = Number.parseInt(process.env.SEO_VERIFY_ATTEMPTS ?? '6', 10);
const delayMs = Number.parseInt(process.env.SEO_VERIFY_DELAY_MS ?? '10000', 10);

if (!baseUrl) {
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
    const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    const expectedCanonical = new URL(route.path, siteOrigin).toString();
    if (canonical !== expectedCanonical) errors.push(`${route.path}: canonical ${canonical ?? 'missing'} does not equal ${expectedCanonical}`);
    if (/<title>404\b/i.test(html) || /<h1[^>]*>\s*Page not found/i.test(html)) errors.push(`${route.path}: rendered 404 content`);
  } catch (error) {
    errors.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (errors.length) {
  console.error(`Live SEO verification failed for ${baseUrl}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Live SEO verification passed for ${expectedSearchRoutes.length} priority routes at ${baseUrl}.`);
}
