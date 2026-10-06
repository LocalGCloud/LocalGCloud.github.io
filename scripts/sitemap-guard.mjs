// Keeps published URLs alive across deploys and tells IndexNow (Bing, Yandex, Seznam and
// other participating engines) which URLs changed. Used by .github/workflows/deploy.yml:
//
//   node scripts/sitemap-guard.mjs check --live-url https://local.cloud/sitemap-0.xml --save <file>
//     Before deploying: every URL in the live sitemap must still be built in dist/ or be a
//     public/_redirects source. A failed fetch is a warning, not a failure.
//   node scripts/sitemap-guard.mjs indexnow --live <file> [--dry-run]
//     After deploying: POST the URLs that are new or whose lastmod changed, compared with
//     the live sitemap saved before the deploy.
//
// --dist <dir> and --redirects <file> override the defaults (dist/ and public/_redirects).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const siteHost = 'local.cloud';
export const siteOrigin = `https://${siteHost}`;
// IndexNow proves site ownership with a key file at the site root (public/<key>.txt).
export const indexNowKey = 'adc621f44f079b05ec91fa754dd7ca07';
export const indexNowEndpoint = 'https://api.indexnow.org/indexnow';
const indexNowBatchSize = 10_000;

/** The <url> entries of a sitemap urlset: { url, lastmod } with lastmod as YYYY-MM-DD. */
export const parseSitemap = (xml) =>
  [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, entry]) => ({
      url: entry.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1] ?? '',
      lastmod: entry.match(/<lastmod>\s*(\d{4}-\d{2}-\d{2})/)?.[1],
    }))
    .filter((entry) => entry.url);

/** Source paths of a Cloudflare _redirects file; a trailing * matches any suffix. */
export const parseRedirectSources = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/)[0]);

const redirectMatches = (sources, pathname) =>
  sources.some((source) => (source.endsWith('*') ? pathname.startsWith(source.slice(0, -1)) : source === pathname));

/** The dist file that serves a URL path: /docs/ -> docs/index.html, /llms.txt -> llms.txt. */
export const builtFileFor = (pathname) => {
  const path = decodeURIComponent(pathname).replace(/^\//, '');
  return !path || path.endsWith('/') ? `${path}index.html` : path;
};

/**
 * Live sitemap URLs that the new build would turn into 404s: neither built nor redirected.
 * @param {{ url: string }[]} liveEntries
 * @param {{ isBuilt: (file: string) => boolean, redirectSources: string[] }} site
 */
export const findDroppedUrls = (liveEntries, { isBuilt, redirectSources }) =>
  liveEntries
    .map(({ url }) => url)
    .filter((url) => {
      const { pathname } = new URL(url);
      return !isBuilt(builtFileFor(pathname)) && !redirectMatches(redirectSources, pathname);
    });

/** URLs in the new sitemap that the live one lacks, or whose lastmod differs. */
export const findChangedUrls = (liveEntries, newEntries) => {
  const live = new Map(liveEntries.map((entry) => [entry.url, entry.lastmod]));
  return newEntries.filter(({ url, lastmod }) => !live.has(url) || live.get(url) !== lastmod).map(({ url }) => url);
};

/** IndexNow request bodies, one per batch of at most 10,000 URLs on this host. */
export const indexNowPayloads = (urls) => {
  const own = urls.filter((url) => new URL(url).host === siteHost);
  const payloads = [];
  for (let start = 0; start < own.length; start += indexNowBatchSize) {
    payloads.push({ host: siteHost, key: indexNowKey, keyLocation: `${siteOrigin}/${indexNowKey}.txt`, urlList: own.slice(start, start + indexNowBatchSize) });
  }
  return payloads;
};

const readBuiltSitemap = (dist) => {
  const index = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
  return [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap(([, location]) =>
    parseSitemap(readFileSync(join(dist, builtFileFor(new URL(location).pathname)), 'utf8')),
  );
};

const option = (args, name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const fetchText = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'localcloud-site-deploy' } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
};

export const runCheck = async (args) => {
  const liveUrl = option(args, '--live-url', `${siteOrigin}/sitemap-0.xml`);
  const dist = option(args, '--dist', fileURLToPath(new URL('../dist/', import.meta.url)));
  const redirectsFile = option(args, '--redirects', fileURLToPath(new URL('../public/_redirects', import.meta.url)));
  const save = option(args, '--save');
  let xml;
  try {
    xml = await fetchText(liveUrl);
  } catch (error) {
    console.log(`::warning::Skipped the dropped-URL check: could not fetch the live sitemap (${error instanceof Error ? error.message : error}).`);
    return 0;
  }
  if (save) writeFileSync(save, xml);
  const liveEntries = parseSitemap(xml);
  const redirectSources = existsSync(redirectsFile) ? parseRedirectSources(readFileSync(redirectsFile, 'utf8')) : [];
  const dropped = findDroppedUrls(liveEntries, { isBuilt: (file) => existsSync(join(dist, file)), redirectSources });
  if (dropped.length) {
    console.error(`These ${dropped.length} URLs are in the live sitemap but neither built nor redirected; add a public/_redirects rule or restore the page:`);
    for (const url of dropped) console.error(`::error::${url} would return 404 after this deploy`);
    return 1;
  }
  console.log(`Sitemap guard passed: all ${liveEntries.length} live sitemap URLs are built or redirected.`);
  return 0;
};

export const runIndexNow = async (args) => {
  const dist = option(args, '--dist', fileURLToPath(new URL('../dist/', import.meta.url)));
  const liveFile = option(args, '--live');
  const dryRun = args.includes('--dry-run');
  const liveEntries = liveFile && existsSync(liveFile) ? parseSitemap(readFileSync(liveFile, 'utf8')) : [];
  if (!liveEntries.length) console.log('No saved live sitemap; submitting every sitemap URL.');
  const payloads = indexNowPayloads(findChangedUrls(liveEntries, readBuiltSitemap(dist)));
  if (!payloads.length) {
    console.log('IndexNow: no new or changed URLs.');
    return 0;
  }
  for (const payload of payloads) {
    console.log(`IndexNow: ${dryRun ? 'would submit' : 'submitting'} ${payload.urlList.length} URLs.`);
    payload.urlList.forEach((url) => console.log(`  ${url}`));
    if (dryRun) continue;
    const response = await fetch(indexNowEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    // 200 OK and 202 Accepted both mean the submission was received.
    if (response.status !== 200 && response.status !== 202) {
      console.log(`::warning::IndexNow returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return 1;
    }
    console.log(`IndexNow accepted ${payload.urlList.length} URLs (HTTP ${response.status}).`);
  }
  return 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  const run = { check: runCheck, indexnow: runIndexNow }[command];
  if (!run) {
    console.error('Usage: node scripts/sitemap-guard.mjs check|indexnow [options]');
    process.exit(2);
  }
  process.exitCode = await run(args);
}
