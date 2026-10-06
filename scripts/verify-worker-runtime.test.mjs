import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { request } from 'node:http';
import { after, before, test } from 'node:test';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { unstable_startWorker } from 'wrangler';

// Runs the Worker and the built dist/ in workerd, so _headers, _redirects, html_handling and
// encodeBody behave as they do on Cloudflare. Node-only unit tests cannot observe any of these.
const site = 'https://local.cloud';
const distFile = (path) => readFileSync(new URL(`../dist/${path}`, import.meta.url));
let worker;

before(async () => {
  worker = await unstable_startWorker({
    config: new URL('../wrangler.jsonc', import.meta.url).pathname,
    dev: { server: { hostname: '127.0.0.1', port: 0 }, inspector: false, watch: false, logLevel: 'error' },
    // An empty key turns off the /install.sh event, so tests never send analytics to PostHog.
    bindings: { POSTHOG_PROJECT_KEY: { type: 'plain_text', value: '' } },
  });
  await worker.ready;
}, { timeout: 120_000 });

after(async () => worker?.dispose());

const get = (path, headers = {}, init = {}) => worker.fetch(`${site}${path}`, { headers, redirect: 'manual', ...init });
// worker.fetch decodes bodies itself, so encoding checks read raw bytes over HTTP instead.
const raw = async (path, headers = {}) => {
  const url = new URL(path, await worker.url);
  return new Promise((resolve, reject) => {
    request(url, { headers }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject).end();
  });
};

test('HTML decodes exactly once to the built bytes for Brotli, gzip and identity', async () => {
  const built = distFile('docs/index.html');
  const br = await raw('/docs/', { 'Accept-Encoding': 'br' });
  assert.equal(br.status, 200);
  assert.equal(br.headers['content-encoding'], 'br');
  assert.ok(brotliDecompressSync(br.body).equals(built));
  const gzip = await raw('/docs/', { 'Accept-Encoding': 'gzip' });
  assert.equal(gzip.headers['content-encoding'], 'gzip');
  assert.ok(gunzipSync(gzip.body).equals(built));
  assert.ok(br.body.length < gzip.body.length, 'Brotli must beat gzip');
  const identity = await raw('/docs/', { 'Accept-Encoding': 'identity' });
  assert.equal(identity.headers['content-encoding'], undefined);
  assert.ok(identity.body.equals(built));
  for (const response of [br, gzip, identity]) assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
});

test('_headers apply: no-transform only on HTML, immutable bundles, security headers', async () => {
  const page = await get('/docs/', { 'Accept-Encoding': 'br' });
  assert.match(page.headers.get('Cache-Control'), /max-age=0, must-revalidate, no-transform/);
  assert.match(page.headers.get('Strict-Transport-Security'), /max-age=31536000/);
  assert.equal(page.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(page.headers.get('Content-Security-Policy'), "frame-ancestors 'none'");
  for (const path of ['/llms.txt', '/ai/agents.md', '/robots.txt', '/install.sh']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.doesNotMatch(response.headers.get('Cache-Control'), /no-transform/, path);
  }
  const html = await (await get('/', { 'Accept-Encoding': 'identity' })).text();
  const bundle = html.match(/\/_astro\/[^"']+\.(?:js|woff2|css)/)[0];
  assert.equal((await get(bundle)).headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  assert.equal((await get('/brand/localcloud-mark.svg')).headers.get('Cache-Control'), 'public, max-age=604800');
  assert.match((await get('/brand/icons/')).headers.get('Cache-Control'), /max-age=0/);
  assert.match((await get('/ai/agent-template.md')).headers.get('Content-Disposition'), /filename="AGENTS\.md"/);
});

test('text and Markdown assets declare UTF-8 and preserve GET and HEAD bodies', async () => {
  const paths = ['/llms.txt', '/llms-full.txt', '/robots.txt', '/license.txt', '/.well-known/security.txt', '/ai/agents.md', '/ai/services.md',
    '/ai/agent-template.md', '/ai/resources.md', '/ai/compatibility.md', '/ai/docs.md',
    '/docs/index.md', '/docs/configuration.md', '/services/bigquery.md'];
  for (const path of paths) {
    const type = path.endsWith('.md') ? 'text/markdown' : 'text/plain';
    for (const method of ['GET', 'HEAD']) {
      const response = await get(path, {}, { method });
      assert.equal(response.status, 200, `${method} ${path}`);
      assert.equal(response.headers.get('Content-Type'), `${type}; charset=utf-8`, `${method} ${path}`);
      assert.equal(await response.text(), method === 'HEAD' ? '' : distFile(path.slice(1)).toString('utf8'), `${method} ${path}`);
    }
  }
});

test('docs, service and comparison pages answer Accept: text/markdown with their Markdown twin', async () => {
  const vary = (response) => (response.headers.get('Vary') || '').split(',').map((value) => value.trim());
  for (const [page, twin] of [['/docs/', 'docs/index.md'], ['/docs/configuration/', 'docs/configuration.md'], ['/services/bigquery/', 'services/bigquery.md'],
    ['/compare/', 'compare/index.md'], ['/compare/google-emulators/', 'compare/google-emulators.md']]) {
    const response = await get(page, { 'Accept': 'text/markdown, text/html;q=0.9' });
    assert.equal(response.status, 200, page);
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8', page);
    assert.equal(response.headers.get('Content-Location'), `/${twin}`, page);
    assert.ok(vary(response).includes('Accept'), page);
    assert.equal(await response.text(), distFile(twin).toString('utf8'), page);
  }
  const page = await get('/docs/configuration/', { 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Encoding': 'identity' });
  assert.match(page.headers.get('Content-Type'), /^text\/html/);
  assert.ok(vary(page).includes('Accept'));
  assert.match(await page.text(), /<link rel="alternate" type="text\/markdown" href="\/docs\/configuration\.md"/);
  const direct = await get('/docs/configuration.md');
  assert.equal(direct.headers.get('Link'), '<https://local.cloud/docs/configuration/>; rel="canonical"');
});

test('_redirects and trailing-slash normalization answer with permanent redirects', async () => {
  for (const [path, location] of [
    ['/ai/AGENTS.md', '/ai/agent-template.md'],
    ['/docs/bigquery-locally/', '/bigquery-emulator/'],
    ['/favicon.ico', '/favicon.png'],
    ['/docs', '/docs/'],
  ]) {
    const response = await get(path);
    assert.equal(response.status, 301, path);
    assert.equal(new URL(response.headers.get('Location'), site).pathname, location, path);
  }
});

test('missing pages, the error page URL and sidecars return 404', async () => {
  for (const path of ['/nope/', '/nope', '/404', '/docs/index.html.br']) {
    const response = await get(path, { 'Accept-Encoding': 'br' });
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /Page not found/, path);
  }
});

// wrangler dev rewrites every request to the configured route host, so host-scoped
// indexing is covered by verify-static-response.test.mjs and the live verifier instead.
test('the canonical host is indexable', async () => {
  assert.equal((await get('/docs/')).headers.get('X-Robots-Tag'), null);
});
