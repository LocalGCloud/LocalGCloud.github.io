import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { brotliCompressSync, brotliDecompressSync, gunzipSync } from 'node:zlib';
import { compressHtml, serveSite } from '../worker/static-response.mjs';
import { handleRequest } from '../worker/index.mjs';

const html = '<!doctype html><html><body>LocalCloud — ' + 'static content '.repeat(400) + '</body></html>';
const brotli = brotliCompressSync(Buffer.from(html));
function asset(body = html, extra = {}) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Length': String(Buffer.byteLength(html)),
      'Content-Security-Policy': "script-src 'sha256-example' 'strict-dynamic'",
      'ETag': '"release-content"',
      'Vary': 'Origin',
    },
    ...extra,
  });
}
function request(encoding, extra = {}, url = 'https://local.cloud/docs/') {
  return new Request(url, {
    headers: encoding === undefined ? {} : { 'Accept-Encoding': encoding },
    ...extra,
  });
}
// A stand-in for the Workers asset binding: exact paths map to responses; everything else is 404.
function assets(routes = {}) {
  const requested = [];
  return {
    requested,
    fetch: async (received) => {
      const path = new URL(received.url).pathname;
      requested.push({ path, method: received.method, headers: received.headers });
      const route = routes[path];
      return route ? route(received) : asset(html, { status: 404 });
    },
  };
}
const sidecar = () => new Response(brotli, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(brotli.length) } });

test('Brotli serves the build-time sidecar with the HTML headers, CSP and a weak ETag', async () => {
  const env = { ASSETS: assets({ '/docs/index.html.br': sidecar }) };
  const response = await compressHtml(request('gzip, br'), asset(), env);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(brotliDecompressSync(bytes).toString(), html);
  assert.equal(response.headers.get('Content-Encoding'), 'br');
  assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('Content-Length'), String(brotli.length));
  assert.equal(response.headers.get('ETag'), 'W/"release-content"');
  assert.equal(response.headers.get('Vary'), 'Origin, Accept-Encoding');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate, no-transform');
  assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'sha256-example' 'strict-dynamic'");
  const [{ headers }] = env.ASSETS.requested;
  assert.equal(headers.get('If-None-Match'), null, 'the sidecar fetch must not repeat conditional headers');
});

test('Cloudflare-normalized Accept-Encoding defers to the original client value', async () => {
  const env = { ASSETS: assets({ '/docs/index.html.br': sidecar }) };
  const normalized = request('gzip');
  Object.defineProperty(normalized, 'cf', { value: { clientAcceptEncoding: 'br' } });
  const response = await compressHtml(normalized, asset(), env);
  assert.equal(response.headers.get('Content-Encoding'), 'br');
});

test('a missing sidecar falls back to gzip, or identity for Brotli-only clients', async () => {
  const env = { ASSETS: assets() };
  const gzip = await compressHtml(request('br, gzip'), asset(), env);
  assert.equal(gzip.headers.get('Content-Encoding'), 'gzip');
  assert.equal(gunzipSync(Buffer.from(await gzip.arrayBuffer())).toString(), html);
  const identity = await compressHtml(request('br'), asset(), env);
  assert.equal(identity.headers.get('Content-Encoding'), null);
  assert.equal(await identity.text(), html);
});

test('gzip preserves the exact HTML and CSP while reducing its transfer size', async () => {
  const response = await compressHtml(request('gzip, deflate'), asset());
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(gunzipSync(bytes).toString(), html);
  assert.ok(bytes.length < Buffer.byteLength(html) / 4);
  assert.equal(response.headers.get('Content-Encoding'), 'gzip');
  assert.equal(response.headers.get('Content-Length'), null);
  assert.equal(response.headers.get('Vary'), 'Origin, Accept-Encoding');
  assert.equal(response.headers.get('ETag'), 'W/"release-content"');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate, no-transform');
  assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'sha256-example' 'strict-dynamic'");
});

test('compression honors explicit exclusions and quality values', async () => {
  for (const encoding of [undefined, 'br', 'gzip;q=0', 'gzip;q=0, *;q=1', '*;q=0', 'gzip;q=invalid']) {
    const response = await compressHtml(request(encoding), asset());
    assert.equal(response.headers.get('Content-Encoding'), null, encoding);
    assert.equal(await response.text(), html);
    assert.match(response.headers.get('Vary'), /Accept-Encoding/);
    assert.match(response.headers.get('Cache-Control'), /no-transform/);
  }
  for (const encoding of ['GZIP', 'gzip; q=0.5', '*;q=0.2', '*;q=0, gzip;q=1', 'br;q=0.1, gzip;q=0.9']) {
    const response = await compressHtml(request(encoding), asset(), { ASSETS: assets({ '/docs/index.html.br': sidecar }) });
    const expected = encoding === '*;q=0.2' ? 'br' : 'gzip';
    assert.equal(response.headers.get('Content-Encoding'), expected, encoding);
  }
});

test('HEAD advertises the encoded representation without sending a body', async () => {
  const gzip = await compressHtml(request('gzip', { method: 'HEAD' }), asset(null));
  assert.equal(gzip.headers.get('Content-Encoding'), 'gzip');
  assert.equal(gzip.headers.get('Content-Length'), null);
  assert.equal(gzip.headers.get('ETag'), 'W/"release-content"');
  assert.equal(await gzip.text(), '');
  const env = { ASSETS: assets({ '/docs/index.html.br': sidecar }) };
  const br = await compressHtml(request('br', { method: 'HEAD' }), asset(null), env);
  assert.equal(br.headers.get('Content-Encoding'), 'br');
  assert.equal(await br.text(), '');
  assert.equal(env.ASSETS.requested[0].method, 'HEAD');
});

test('a Range request answered in full is compressed like any other read', async () => {
  const response = await compressHtml(request('gzip', { headers: { 'Range': 'bytes=0-20', 'Accept-Encoding': 'gzip' } }), asset());
  assert.equal(response.headers.get('Content-Encoding'), 'gzip');
  assert.equal(gunzipSync(Buffer.from(await response.arrayBuffer())).toString(), html);
});

test('partial, encoded, binary, non-read and non-content responses pass through unchanged', async () => {
  const cases = [
    [request('gzip'), asset('encoded', { headers: { 'Content-Type': 'text/html', 'Content-Encoding': 'br' } })],
    [request('gzip'), asset('partial', { status: 206, headers: { 'Content-Type': 'text/html', 'Content-Range': 'bytes 0-6/100' } })],
    [request('gzip'), asset('font', { headers: { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=31536000, immutable' } })],
    [request('gzip', { method: 'POST' }), asset()],
    [request('gzip'), new Response(null, { status: 304 })],
    [request('gzip'), new Response(null, { status: 301, headers: { Location: '/docs/' } })],
  ];
  for (const [req, response] of cases) assert.equal(await compressHtml(req, response), response);
});

test('HTML 404 responses keep their status and use the 404 page sidecar', async () => {
  const env = { ASSETS: assets({ '/404.html.br': sidecar }) };
  const response = await compressHtml(request('br', {}, 'https://local.cloud/missing'), asset(html, { status: 404 }), env);
  assert.equal(response.status, 404);
  assert.equal(brotliDecompressSync(Buffer.from(await response.arrayBuffer())).toString(), html);
  const gzip = await compressHtml(request('gzip'), asset(html, { status: 404 }));
  assert.equal(gunzipSync(Buffer.from(await gzip.arrayBuffer())).toString(), html);
});

test('the error page URL itself is served with status 404', async () => {
  const env = { ASSETS: assets({ '/404': () => asset() }) };
  const response = await serveSite(request('gzip', {}, 'https://local.cloud/404'), env);
  assert.equal(response.status, 404);
  assert.equal(gunzipSync(Buffer.from(await response.arrayBuffer())).toString(), html);
});

test('precompressed sidecars are not public URLs', async () => {
  const env = { ASSETS: assets({ '/404': () => asset(), '/docs/index.html.br': sidecar }) };
  const response = await serveSite(request(undefined, {}, 'https://local.cloud/docs/index.html.br'), env);
  assert.equal(response.status, 404);
  assert.equal(await response.text(), html);
});

test('trailing-slash redirects become permanent and keep their Location', async () => {
  const env = { ASSETS: assets({ '/docs': () => new Response(null, { status: 307, headers: { Location: '/docs/' } }) }) };
  const response = await serveSite(request('gzip', {}, 'https://local.cloud/docs'), env);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), '/docs/');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.match(response.headers.get('Strict-Transport-Security'), /max-age=/);
});

test('HTML revalidation responses vary on encoding and carry the weak ETag', async () => {
  const env = { ASSETS: assets({ '/docs/': () => new Response(null, { status: 304, headers: { ETag: '"release-content"' } }) }) };
  const response = await serveSite(request('br', { headers: { 'If-None-Match': 'W/"release-content"', 'Accept-Encoding': 'br' } }), env);
  assert.equal(response.status, 304);
  assert.equal(response.headers.get('Vary'), 'Accept-Encoding');
  assert.equal(response.headers.get('ETag'), 'W/"release-content"');
});

test('only local.cloud is indexable', async () => {
  const env = { ASSETS: assets({ '/docs/': () => asset(), '/llms.txt': () => new Response('# LocalCloud', { headers: { 'Content-Type': 'text/plain' } }) }) };
  const canonical = await serveSite(request('gzip'), env);
  assert.equal(canonical.headers.get('X-Robots-Tag'), null);
  for (const url of ['https://localcloud-site.example.workers.dev/docs/', 'https://localcloud-site.example.workers.dev/llms.txt']) {
    const response = await serveSite(request('gzip', {}, url), env);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex', url);
  }
});

test('asset requests use compression without contacting the analytics upstream', async () => {
  const req = request('gzip');
  const response = await handleRequest(req, {
    ASSETS: { fetch: (received) => { assert.equal(received, req); return asset(); } },
  }, () => assert.fail('HTML requests must not contact PostHog'));
  assert.equal(gunzipSync(Buffer.from(await response.arrayBuffer())).toString(), html);
});

test('redirect rules target existing pages, never shadow pages, and never chain', () => {
  const rules = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8').split('\n')
    .map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));
  // Compare path segments exactly; macOS file systems would match /ai/AGENTS.md to agents.md.
  const built = (path) => {
    let directory = new URL('../dist/', import.meta.url);
    for (const segment of (path.endsWith('/') ? `${path}index.html` : path).split('/').filter(Boolean)) {
      let entries;
      try { entries = readdirSync(directory); } catch { return false; }
      if (!entries.includes(segment)) return false;
      directory = new URL(`${segment}/`, directory);
    }
    return true;
  };
  const sources = new Set(rules.map(([source]) => source));
  for (const [source, target, status] of rules) {
    assert.equal(status, '301', `${source} must redirect permanently`);
    assert.ok(!built(source), `${source} is a built page and must not be redirected`);
    assert.ok(built(target), `${source} redirects to ${target}, which is not built`);
    assert.ok(!sources.has(target), `${source} redirects to ${target}, which redirects again`);
  }
});
