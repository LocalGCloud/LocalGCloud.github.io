import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { expectedSearchRoutes, siteOrigin } from './search-routes.mjs';

const run = promisify(execFile);
const validator = new URL('./verify-live-seo.mjs', import.meta.url);
const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
const redirects = new Map([
  ...readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8').split('\n')
    .map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/).slice(0, 2)),
  ['/docs', '/docs/'],
]);

// A well-behaved deployment on a non-canonical host; `custom` can break one behavior per test.
async function verifyFixture(t, overrides = {}, custom = () => false) {
  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (custom(path, request, response)) return;
    if (redirects.has(path)) {
      response.writeHead(301, { Location: redirects.get(path) }).end();
      return;
    }
    if (path === '/robots.txt') {
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(robots);
      return;
    }
    if (path === '/sitemap-index.xml') {
      response.writeHead(200, { 'Content-Type': 'application/xml' })
        .end(`<sitemapindex><sitemap><loc>${siteOrigin}/sitemap-0.xml</loc></sitemap></sitemapindex>`);
      return;
    }
    if (path === '/sitemap-0.xml') {
      response.writeHead(200, { 'Content-Type': 'application/xml' })
        .end(`<urlset>${expectedSearchRoutes.map((route) => `<url><loc>${siteOrigin}${route.path}</loc></url>`).join('')}</urlset>`);
      return;
    }
    if (!expectedSearchRoutes.some((route) => route.path === path)) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h1>Page not found</h1>');
      return;
    }
    const html = path === '/' || path.endsWith('/');
    response.setHeader('Content-Type', html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
    response.setHeader('X-Robots-Tag', 'noindex');
    if (html) response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
    const body = overrides[path] ?? (html
      ? `<html><head><link rel="canonical" href="${siteOrigin}${path}"></head><body>LocalCloud</body></html>`
      : '# LocalCloud\nRaw agent documentation.\n');
    if (html && /\bbr\b/.test(request.headers['accept-encoding'] ?? '')) {
      response.setHeader('Content-Encoding', 'br');
      response.end(brotliCompressSync(Buffer.from(body)));
      return;
    }
    response.end(body);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  try {
    const output = await run(process.execPath, [validator.pathname], {
      env: {
        ...process.env,
        SEO_VERIFY_BASE_URL: `http://127.0.0.1:${server.address().port}`,
        SEO_VERIFY_ATTEMPTS: '1',
      },
    });
    return { code: 0, ...output };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

test('accepts HTML canonical URLs and raw Markdown/text without HTML tags', async (t) => {
  const result = await verifyFixture(t);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /verification passed/);
});

test('rejects an HTML fallback returned with HTTP 200 for a raw document', async (t) => {
  const result = await verifyFixture(t, { '/ai/agents.md': '<!doctype html><html>Fallback page</html>' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/ai\/agents\.md: raw document returned HTML/);
});

test('rejects an empty raw document', async (t) => {
  const result = await verifyFixture(t, { '/llms.txt': '  \n' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/llms\.txt: raw document is empty/);
});

test('continues to reject incorrect canonical URLs on HTML pages', async (t) => {
  const result = await verifyFixture(t, { '/docs/': '<html><head><link rel="canonical" href="https://wrong.example/docs/"></head></html>' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/docs\/: canonical https:\/\/wrong\.example\/docs\/ does not equal/);
});

test('fails in CI when no base URL is configured, and skips locally', async () => {
  const env = { ...process.env, SEO_VERIFY_BASE_URL: '' };
  delete env.CI;
  const local = await run(process.execPath, [validator.pathname], { env });
  assert.match(local.stdout, /skipped/);
  await assert.rejects(
    run(process.execPath, [validator.pathname], { env: { ...env, CI: 'true' } }),
    (error) => error.code === 1 && /requires SEO_VERIFY_BASE_URL in CI/.test(error.stderr),
  );
});

test('rejects temporary redirects, soft 404s, missing Brotli and an indexable preview host', async (t) => {
  const result = await verifyFixture(t, {}, (path, request, response) => {
    if (path === '/docs') { response.writeHead(307, { Location: '/docs/' }).end(); return true; }
    if (path === '/404') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h1>Page not found</h1>'); return true; }
    if (path === '/docs/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0' })
        .end(`<html><head><link rel="canonical" href="${siteOrigin}/docs/"></head></html>`);
      return true;
    }
    return false;
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/docs: expected 301 to \/docs\/, got 307/);
  assert.match(result.stderr, /\/404: expected 404, got 200/);
  assert.match(result.stderr, /\/docs\/: expected Brotli/);
  assert.match(result.stderr, /no-transform/);
  assert.match(result.stderr, /must send X-Robots-Tag: noindex/);
});

test('rejects a sitemap URL that does not resolve and text without a charset', async (t) => {
  const result = await verifyFixture(t, {}, (path, request, response) => {
    if (path === '/sitemap-0.xml') { response.writeHead(200).end(`<urlset><url><loc>${siteOrigin}/gone/</loc></url></urlset>`); return true; }
    if (path === '/llms.txt') { response.writeHead(200, { 'Content-Type': 'text/plain' }).end('# LocalCloud'); return true; }
    return false;
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/gone\/: listed in the sitemap but returned 404/);
  assert.match(result.stderr, /\/llms\.txt: content-type text\/plain has no charset/);
});
