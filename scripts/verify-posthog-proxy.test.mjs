import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import worker, { handleRequest } from '../worker/index.mjs';
import { loadEnv } from 'vite';
import { resolvePosthogConfig } from '../src/utils/posthog-config.mjs';

const origin = 'https://local.cloud';
const noAssets = { ASSETS: { fetch: () => assert.fail('unexpected static asset request') } };

test('hosting profiles select a working default, allow overrides and normalize trailing slashes', () => {
  assert.equal(resolvePosthogConfig().apiHost, '/ingest');
  const direct = resolvePosthogConfig({ SITE_DEPLOYMENT_TARGET: 'static' });
  assert.equal(direct.apiHost, 'https://us.i.posthog.com');
  assert.equal(direct.assetHost, 'https://us-assets.i.posthog.com');
  assert.deepEqual(direct.origins, ['https://us.i.posthog.com', 'https://us-assets.i.posthog.com']);
  for (const target of ['cloudflare', 'static']) {
    const proxy = resolvePosthogConfig({ SITE_DEPLOYMENT_TARGET: target, PUBLIC_POSTHOG_HOST: 'https://e.local.cloud/ingest/' });
    assert.equal(proxy.apiHost, 'https://e.local.cloud/ingest');
    assert.equal(proxy.assetHost, proxy.apiHost);
    assert.deepEqual(proxy.origins, ['https://e.local.cloud']);
  }
  assert.deepEqual(resolvePosthogConfig({ SITE_DEPLOYMENT_TARGET: 'static', PUBLIC_POSTHOG_HOST: '/ingest/' }),
    { apiHost: '/ingest', assetHost: '/ingest', origins: [] });
  assert.equal(resolvePosthogConfig({ SITE_DEPLOYMENT_TARGET: 'static', PUBLIC_POSTHOG_HOST: ' ' }).apiHost, direct.apiHost);
});

test('unsafe or ambiguous host configuration fails at build time', () => {
  for (const host of ['//external.example', '/', '/ingest?x=1', '/ingest/../other', 'relative',
    'http://e.local.cloud', 'https://user:password@e.local.cloud', 'https://e.local.cloud?x=1', 'https://e.local.cloud/#x']) {
    assert.throws(() => resolvePosthogConfig({ PUBLIC_POSTHOG_HOST: host }), /PUBLIC_POSTHOG_HOST/);
  }
  assert.throws(() => resolvePosthogConfig({ SITE_DEPLOYMENT_TARGET: 'unknown' }), /SITE_DEPLOYMENT_TARGET/);
});

// The bootstrap appends the PostHog SDK first, then the Cloudflare beacon when a token is set.
function executeBootstrap(bootstrap, apiHost) {
  const inserted = [];
  const context = {
    posthogApiHost: apiHost,
    cloudflareAnalyticsToken: '',
    cloudflareAnalyticsEndpoint: '',
    navigator: {},
    localStorage: { getItem: () => null },
    document: {
      readyState: 'complete',
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild: (script) => inserted.push(script) },
    },
    setTimeout: (callback) => callback(),
    requestIdleCallback: (callback) => callback(),
  };
  context.window = context;
  runInNewContext(bootstrap, context);
  return { inserted, context };
}

test('the actual analytics bootstrap uses the selected host for SDK loading and API requests', () => {
  const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const bootstrap = [...layout.matchAll(/<script is:inline[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((script) => script.includes('posthog.init('));
  for (const env of [{}, { SITE_DEPLOYMENT_TARGET: 'static' }, { PUBLIC_POSTHOG_HOST: 'https://e.local.cloud' }]) {
    const config = resolvePosthogConfig(env);
    const { inserted, context } = executeBootstrap(bootstrap, config.apiHost);
    assert.equal(inserted[0].src, `${config.assetHost}/static/array.js`);
    assert.equal(context.posthog._i[0][1].api_host, config.apiHost);
    assert.equal(context.posthog._i[0][1].ui_host, 'https://us.posthog.com');
  }
});

test('the emitted HTML serializes the hosting configuration into the real bootstrap', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const bootstrap = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((script) => script.includes('posthog.init('));
  const expected = resolvePosthogConfig(loadEnv('production', process.cwd(), ''));
  const { inserted, context } = executeBootstrap(bootstrap);
  assert.equal(context.posthog._i[0][1].api_host, expected.apiHost);
  assert.equal(inserted[0].src, `${expected.assetHost}/static/array.js`);
});

test('the Worker entry point preserves static routing and genuine 404s outside the proxy', async () => {
  for (const path of ['/', '/docs/', '/missing/', '/ingestion', '/ingest-other']) {
    const request = new Request(`${origin}${path}`);
    const expected = new Response('static response', { status: path === '/missing/' ? 404 : 200 });
    const response = await worker.fetch(request, { ASSETS: { fetch: (received) => {
      assert.equal(received, request);
      return expected;
    } } });
    assert.equal(response, expected);
  }
});

test('SDK bundles and remote configuration reach the asset origin with query strings intact', async () => {
  for (const path of ['/static/array.js', '/static/recorder.js', '/array/phc_example/config']) {
    let forwarded;
    const response = await handleRequest(new Request(`${origin}/ingest${path}?v=1&x=a%2Bb&x=c`), noAssets,
      async (request) => {
        forwarded = request;
        return new Response('asset', { headers: { 'Cache-Control': 'public, max-age=300', 'Set-Cookie': 'upstream=secret' } });
      });
    assert.equal(response.status, 200);
    assert.equal(forwarded.url, `https://us-assets.i.posthog.com${path}?v=1&x=a%2Bb&x=c`);
    assert.equal(forwarded.headers.get('Host'), 'us-assets.i.posthog.com');
    assert.equal(forwarded.method, 'GET');
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('Cache-Control'), path.startsWith('/static/') ? 'public, max-age=300' : 'no-store');
  }
});

test('compressed event bytes, content headers and the Cloudflare client IP survive forwarding', async () => {
  const bytes = gzipSync(JSON.stringify({ event: 'proxy_test', properties: { distinct_id: 'fixture' } }));
  let forwarded;
  let body;
  let options;
  const response = await handleRequest(new Request(`${origin}/ingest/i/v0/e/?compression=gzip-js&v=2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'Content-Encoding': 'gzip',
      'Cookie': 'site_session=secret', 'Authorization': 'Bearer secret',
      'Proxy-Authorization': 'Basic secret', 'Connection': 'keep-alive',
      'CF-Connecting-IP': '203.0.113.7', 'X-Forwarded-For': 'spoofed',
      'Forwarded': 'for=spoofed', 'X-Real-IP': 'spoofed', 'X-Forwarded-Host': 'spoofed',
    },
    body: bytes,
  }), noAssets, async (request, init) => {
    forwarded = request;
    body = Buffer.from(await request.arrayBuffer());
    options = init;
    return new Response('{"status":1}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } });
  });
  assert.equal(response.status, 200);
  assert.equal(forwarded.url, 'https://us.i.posthog.com/i/v0/e/?compression=gzip-js&v=2');
  assert.equal(forwarded.method, 'POST');
  assert.deepEqual(body, bytes);
  assert.equal(forwarded.headers.get('Content-Type'), 'application/json');
  assert.equal(forwarded.headers.get('Content-Encoding'), 'gzip');
  assert.equal(forwarded.headers.get('Host'), 'us.i.posthog.com');
  assert.equal(forwarded.headers.get('X-Forwarded-For'), '203.0.113.7');
  for (const header of ['Cookie', 'Authorization', 'Proxy-Authorization', 'Connection', 'Forwarded', 'X-Real-IP', 'X-Forwarded-Host']) {
    assert.equal(forwarded.headers.get(header), null, `${header} must not leak upstream`);
  }
  assert.equal(forwarded.redirect, 'manual');
  assert.equal(options.cache, 'no-store');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(await response.text(), '{"status":1}');
});

test('untrusted forwarding headers are removed when no Cloudflare IP is present', async () => {
  let forwarded;
  await handleRequest(new Request(`${origin}/ingest/flags/?v=2`, { headers: { 'X-Forwarded-For': 'spoofed' } }), noAssets,
    async (request) => { forwarded = request; return new Response('{}'); });
  assert.equal(forwarded.url, 'https://us.i.posthog.com/flags/?v=2');
  assert.equal(forwarded.headers.get('X-Forwarded-For'), null);
});

test('streaming POST bodies are forwarded without JSON parsing', async () => {
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array([0, 255, 128]));
    controller.enqueue(new Uint8Array([1, 2]));
    controller.close();
  } });
  let bytes;
  const response = await handleRequest(new Request(`${origin}/ingest/s/`, { method: 'POST', body: stream, duplex: 'half' }), noAssets,
    async (request) => { bytes = new Uint8Array(await request.arrayBuffer()); return new Response('ok'); });
  assert.equal(response.status, 200);
  assert.deepEqual(bytes, new Uint8Array([0, 255, 128, 1, 2]));
});

test('HEAD and OPTIONS preserve their methods, and the bare prefix reaches the API root', async () => {
  for (const method of ['HEAD', 'OPTIONS']) {
    let forwarded;
    const response = await handleRequest(new Request(`${origin}/ingest`, { method }), noAssets,
      async (request) => { forwarded = request; return new Response(null, { status: 204 }); });
    assert.equal(response.status, 204);
    assert.equal(forwarded.url, 'https://us.i.posthog.com/');
    assert.equal(forwarded.method, method);
    assert.equal(forwarded.body, null);
  }
});

test('upstream error statuses and bodies pass through without caching or retrying', async () => {
  let calls = 0;
  const response = await handleRequest(new Request(`${origin}/ingest/i/v0/e/`, { method: 'POST', body: 'fixture' }), noAssets,
    async () => { calls++; return new Response('rate limited', { status: 429, headers: { 'Retry-After': '30' } }); });
  assert.equal(calls, 1);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '30');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), 'rate limited');
});

test('network failures return a bounded error without exposing payloads or retrying', async () => {
  let calls = 0;
  const response = await handleRequest(new Request(`${origin}/ingest/i/v0/e/`, { method: 'POST', body: 'sensitive fixture' }), noAssets,
    async () => { calls++; throw new Error('sensitive fixture'); });
  assert.equal(calls, 1);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), 'Analytics upstream unavailable');
});

test('unsupported methods are rejected before contacting PostHog', async () => {
  let calls = 0;
  const response = await handleRequest(new Request(`${origin}/ingest/flags/`, { method: 'DELETE' }), noAssets,
    async () => { calls++; return new Response('unexpected'); });
  assert.equal(calls, 0);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, HEAD, POST, OPTIONS');
});

test('upstream redirects stay first-party, while other redirect targets are refused', async () => {
  for (const [location, expected] of [
    ['/flags/?v=2', '/ingest/flags/?v=2'],
    ['https://us-assets.i.posthog.com/static/array.js', '/ingest/static/array.js'],
    ['https://unexpected.example/', null],
    ['http://us.i.posthog.com/', null],
    ['https://us-assets.i.posthog.com/flags/', null],
    ['https://us.i.posthog.com/static/array.js', null],
  ]) {
    const response = await handleRequest(new Request(`${origin}/ingest/flags`), noAssets,
      async () => new Response(null, { status: 307, headers: { Location: location } }));
    assert.equal(response.status, expected ? 307 : 502);
    assert.equal(response.headers.get('Location'), expected);
  }
});

test('Wrangler routes analytics and HTML through the Worker while retaining static fallback', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.main, 'worker/index.mjs');
  assert.equal(config.assets.binding, 'ASSETS');
  assert.deepEqual(config.assets.run_worker_first, ['/*', '!/_astro/*', '!/pagefind/*', '!/icons/*', '!/illustrations/*']);
  assert.equal(config.assets.not_found_handling, '404-page');
});

test('upstream requests are bounded by a timeout signal', async () => {
  let options;
  await handleRequest(new Request(`${origin}/ingest/flags/`), noAssets, async (_, init) => { options = init; return new Response('ok'); });
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(options.cache, 'no-store');
});

test('cached SDK files vary on encoding', async () => {
  const response = await handleRequest(new Request(`${origin}/ingest/static/array.js`), noAssets,
    async () => new Response('sdk', { headers: { 'Cache-Control': 'public, max-age=3600' } }));
  assert.equal(response.headers.get('Vary'), 'Accept-Encoding');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=3600');
});
