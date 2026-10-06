import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import {
  builtFileFor,
  findChangedUrls,
  findDroppedUrls,
  indexNowKey,
  indexNowPayloads,
  parseRedirectSources,
  parseSitemap,
  runIndexNow,
} from './sitemap-guard.mjs';

const run = promisify(execFile);
const guard = new URL('./sitemap-guard.mjs', import.meta.url).pathname;
const urlset = (entries) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
    .map(([url, lastmod]) => `<url><loc>${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('')}</urlset>`;

test('parses sitemap entries and normalizes lastmod to a date', () => {
  assert.deepEqual(parseSitemap(urlset([['https://local.cloud/', '2026-10-06T00:00:00.000Z'], ['https://local.cloud/docs/']])), [
    { url: 'https://local.cloud/', lastmod: '2026-10-06' },
    { url: 'https://local.cloud/docs/', lastmod: undefined },
  ]);
});

test('reads redirect sources and ignores comments and blank lines', () => {
  assert.deepEqual(parseRedirectSources('# moved\n/old /new/ 301\n\n/legacy/* /docs/ 301\n'), ['/old', '/legacy/*']);
});

test('maps URL paths to the files that serve them', () => {
  assert.equal(builtFileFor('/'), 'index.html');
  assert.equal(builtFileFor('/docs/console/'), 'docs/console/index.html');
  assert.equal(builtFileFor('/llms.txt'), 'llms.txt');
});

test('flags live URLs that are neither built nor redirected', () => {
  const built = new Set(['index.html', 'docs/index.html', 'ai/agents.md']);
  const live = parseSitemap(urlset([
    ['https://local.cloud/'],
    ['https://local.cloud/docs/'],
    ['https://local.cloud/ai/agents.md'],
    ['https://local.cloud/docs/bigquery-locally/'],
    ['https://local.cloud/archive/2025/post/'],
    ['https://local.cloud/gone/'],
  ]));
  const dropped = findDroppedUrls(live, { isBuilt: (file) => built.has(file), redirectSources: ['/docs/bigquery-locally/', '/archive/*'] });
  assert.deepEqual(dropped, ['https://local.cloud/gone/']);
});

test('submits new URLs and URLs whose lastmod changed', () => {
  const live = parseSitemap(urlset([['https://local.cloud/', '2026-10-01'], ['https://local.cloud/docs/', '2026-10-01'], ['https://local.cloud/old/', '2026-09-01']]));
  const next = parseSitemap(urlset([['https://local.cloud/', '2026-10-01'], ['https://local.cloud/docs/', '2026-10-06'], ['https://local.cloud/new/', '2026-10-06']]));
  assert.deepEqual(findChangedUrls(live, next), ['https://local.cloud/docs/', 'https://local.cloud/new/']);
  assert.equal(findChangedUrls(live, live).length, 0);
});

test('builds IndexNow payloads for this host with the hosted key', async () => {
  const [payload, ...rest] = indexNowPayloads(['https://local.cloud/docs/', 'https://example.com/elsewhere/']);
  assert.equal(rest.length, 0);
  assert.deepEqual(payload, {
    host: 'local.cloud',
    key: indexNowKey,
    keyLocation: `https://local.cloud/${indexNowKey}.txt`,
    urlList: ['https://local.cloud/docs/'],
  });
  assert.equal(indexNowPayloads(Array.from({ length: 10_001 }, (_, index) => `https://local.cloud/p${index}/`)).length, 2);
  assert.match(indexNowKey, /^[0-9a-f]{32}$/);
  assert.equal(await readFile(new URL(`../public/${indexNowKey}.txt`, import.meta.url), 'utf8'), indexNowKey);
});

const withSite = async (t, { liveSitemap, builtFiles, redirects = '' }) => {
  const root = await mkdtemp(join(tmpdir(), 'sitemap-guard-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dist = join(root, 'dist');
  await mkdir(dist);
  for (const file of builtFiles) {
    await mkdir(join(dist, file, '..'), { recursive: true });
    await writeFile(join(dist, file), '');
  }
  const redirectsFile = join(root, '_redirects');
  await writeFile(redirectsFile, redirects);
  const server = createServer((request, response) => {
    if (request.url === '/sitemap-0.xml' && liveSitemap) response.writeHead(200).end(liveSitemap);
    else response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return { root, dist, redirectsFile, liveUrl: `http://127.0.0.1:${server.address().port}/sitemap-0.xml` };
};

const check = (site, extra = []) =>
  run(process.execPath, [guard, 'check', '--live-url', site.liveUrl, '--dist', site.dist, '--redirects', site.redirectsFile, ...extra]).then(
    (result) => ({ code: 0, ...result }),
    (error) => ({ code: error.code, stdout: error.stdout, stderr: error.stderr }),
  );

test('check passes and saves the live sitemap when every URL is built or redirected', async (t) => {
  const liveSitemap = urlset([['https://local.cloud/'], ['https://local.cloud/moved/']]);
  const site = await withSite(t, { liveSitemap, builtFiles: ['index.html'], redirects: '/moved/ / 301\n' });
  const saved = join(site.root, 'live.xml');
  const result = await check(site, ['--save', saved]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /all 2 live sitemap URLs are built or redirected/);
  assert.equal(await readFile(saved, 'utf8'), liveSitemap);
});

test('check fails when a live URL would return 404', async (t) => {
  const site = await withSite(t, { liveSitemap: urlset([['https://local.cloud/'], ['https://local.cloud/gone/']]), builtFiles: ['index.html'] });
  const result = await check(site);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /::error::https:\/\/local\.cloud\/gone\/ would return 404/);
});

test('check warns and passes when the live sitemap cannot be fetched', async (t) => {
  const site = await withSite(t, { liveSitemap: undefined, builtFiles: ['index.html'] });
  const result = await check(site);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /::warning::Skipped the dropped-URL check/);
});

test('indexnow dry run lists only new and changed URLs', async (t) => {
  const site = await withSite(t, { liveSitemap: undefined, builtFiles: [] });
  await writeFile(join(site.dist, 'sitemap-index.xml'), '<sitemapindex><sitemap><loc>https://local.cloud/sitemap-0.xml</loc></sitemap></sitemapindex>');
  await writeFile(join(site.dist, 'sitemap-0.xml'), urlset([['https://local.cloud/', '2026-10-01'], ['https://local.cloud/docs/', '2026-10-06']]));
  const live = join(site.root, 'live.xml');
  await writeFile(live, urlset([['https://local.cloud/', '2026-10-01T00:00:00.000Z'], ['https://local.cloud/docs/', '2026-10-01']]));
  const { stdout } = await run(process.execPath, [guard, 'indexnow', '--live', live, '--dist', site.dist, '--dry-run']);
  assert.match(stdout, /would submit 1 URLs/);
  assert.match(stdout, /https:\/\/local\.cloud\/docs\//);
  assert.doesNotMatch(stdout, /https:\/\/local\.cloud\/\n/);
});

test('indexnow logs the HTTP status when the submission is accepted', async (t) => {
  const site = await withSite(t, { liveSitemap: undefined, builtFiles: [] });
  await writeFile(join(site.dist, 'sitemap-index.xml'), '<sitemapindex><sitemap><loc>https://local.cloud/sitemap-0.xml</loc></sitemap></sitemapindex>');
  await writeFile(join(site.dist, 'sitemap-0.xml'), urlset([['https://local.cloud/', '2026-10-01'], ['https://local.cloud/docs/', '2026-10-06']]));
  const submitted = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    submitted.push({ url, body: JSON.parse(init.body) });
    return new Response(null, { status: 202 });
  });
  const logged = [];
  t.mock.method(console, 'log', (line) => logged.push(line));
  assert.equal(await runIndexNow(['--dist', site.dist]), 0);
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].body.urlList.length, 2);
  assert.ok(logged.includes('IndexNow accepted 2 URLs (HTTP 202).'), logged.join('\n'));
});
