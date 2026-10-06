import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { finalizeCsp } from './finalize-static-csp.mjs';
import { loadEnv } from 'vite';
import { resolvePosthogConfig } from '../src/utils/posthog-config.mjs';
import { resolveCloudflareAnalyticsConfig } from '../src/utils/cloudflare-analytics-config.mjs';

const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const bootstrap = [...layout.matchAll(/<script is:inline[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1]).find((script) => script.includes('posthog.init('));

function analyticsHarness(readyState, supportsIdle = true) {
  const inserted = [];
  const timers = [];
  const idle = [];
  const listeners = new Map();
  const context = {
    posthogApiHost: '/ingest',
    document: {
      readyState,
      createElement: () => ({}),
      getElementsByTagName: () => [{ parentNode: { insertBefore: (script) => inserted.push(script) } }],
    },
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    addEventListener: (event, callback, options) => listeners.set(event, { callback, options }),
  };
  context.window = context;
  if (supportsIdle) context.requestIdleCallback = (callback, options) => idle.push({ callback, options });
  runInNewContext(bootstrap, context);
  return { context, inserted, timers, idle, listeners };
}

test('analytics queues interactions before downloading the SDK, then starts after load and idle', () => {
  const h = analyticsHarness('loading');
  h.context.posthog.capture('code_copied', { page_path: '/' });
  assert.equal(h.context.posthog[0][0], 'capture');
  assert.equal(h.context.posthog[0][1], 'code_copied');
  assert.equal(h.inserted.length, 0);
  assert.equal(h.timers.length, 0);
  assert.equal(h.listeners.get('load').options.once, true);
  h.listeners.get('load').callback();
  assert.equal(h.timers[0].delay, 1500);
  h.timers[0].callback();
  assert.equal(h.inserted.length, 0);
  assert.equal(h.idle[0].options.timeout, 2000);
  h.idle[0].callback();
  assert.equal(h.inserted.length, 1);
  assert.equal(h.inserted[0].src, '/ingest/static/array.js');
  assert.equal(h.inserted[0].async, true);
  const config = h.context.posthog._i[0][1];
  assert.equal(config.api_host, '/ingest');
  assert.equal(config.ui_host, 'https://us.posthog.com');
  assert.equal(config.disable_surveys, true);
  assert.equal(config.capture_exceptions, true);
  assert.equal(config.autocapture, true);
});

test('analytics still loads when load has already fired and idle callbacks are unavailable', () => {
  const h = analyticsHarness('complete', false);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.inserted.length, 0);
  h.timers[0].callback();
  assert.equal(h.inserted.length, 1);
});

test('Cloudflare analytics follows deployment configuration and supports explicit disablement', () => {
  const enabled = resolveCloudflareAnalyticsConfig();
  assert.match(enabled.token, /^[a-f0-9]{32}$/);
  assert.equal(enabled.endpoint, 'https://cloudflareinsights.com/cdn-cgi/rum');
  assert.deepEqual(enabled.connectOrigins, ['https://cloudflareinsights.com']);
  assert.equal(resolveCloudflareAnalyticsConfig({ SITE_DEPLOYMENT_TARGET: 'static' }).token, '');
  assert.deepEqual(resolveCloudflareAnalyticsConfig({ PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: '' }).scriptOrigins, []);
  assert.deepEqual(resolveCloudflareAnalyticsConfig({ PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: '' }).connectOrigins, []);
  const override = '1234567890abcdef1234567890abcdef';
  const staticConfig = resolveCloudflareAnalyticsConfig({ SITE_DEPLOYMENT_TARGET: 'static', PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: override });
  assert.equal(staticConfig.token, override);
  assert.equal(staticConfig.endpoint, 'https://cloudflareinsights.com/cdn-cgi/rum');
  assert.deepEqual(staticConfig.connectOrigins, ['https://cloudflareinsights.com']);
  assert.throws(() => resolveCloudflareAnalyticsConfig({ PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: 'not-a-token' }), /site token/);
  assert.throws(() => resolveCloudflareAnalyticsConfig({ SITE_DEPLOYMENT_TARGET: 'unknown' }), /cloudflare or static/);
});

test('Cloudflare beacon loads from the trusted bootstrap with its public site token', () => {
  const source = [...layout.matchAll(/<script is:inline[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((script) => script.includes('cloudflareAnalyticsToken'));
  const inserted = [];
  const token = resolveCloudflareAnalyticsConfig().token;
  runInNewContext(source, {
    cloudflareAnalyticsToken: token,
    cloudflareAnalyticsEndpoint: 'https://cloudflareinsights.com/cdn-cgi/rum',
    document: {
      createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
      head: { appendChild: (script) => inserted.push(script) },
    },
  });
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].src, 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.equal(inserted[0].async, true);
  assert.deepEqual(JSON.parse(inserted[0]['data-cf-beacon']), { token, send: { to: 'https://cloudflareinsights.com/cdn-cgi/rum' } });
});

test('CSP permits the exact emitted script bytes and preserves the style policy', async () => {
  const inline = '\n window.ready = true;\n';
  const external = 'export const enabled = true;';
  const html = `<head><meta http-equiv="Content-Security-Policy" content="script-src 'self' 'strict-dynamic'; style-src 'self' 'sha256-existing'; style-src-attr 'unsafe-inline';"><script>${inline}</script><script type="module" src="/_astro/app.js"></script></head>`;
  const hash = (text) => `sha256-${createHash('sha256').update(text).digest('base64')}`;
  const secured = await finalizeCsp(html, async (path) => {
    assert.equal(path, '/_astro/app.js');
    return external;
  });
  const emittedInline = secured.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(emittedInline.length < inline.length);
  assert.ok(secured.includes(`'${hash(emittedInline)}'`));
  assert.ok(!secured.includes(`'${hash(inline)}'`));
  const context = { window: {} };
  runInNewContext(emittedInline, context);
  assert.equal(context.window.ready, true);
  assert.ok(secured.includes(`'${hash(external)}'`));
  assert.ok(secured.includes(`integrity="${hash(external)}"`));
  assert.ok(secured.includes("style-src 'self' 'sha256-existing'"));
  assert.equal(await finalizeCsp(secured, async () => external), secured);
  await assert.rejects(finalizeCsp(html.replace('/_astro/app.js', 'https://unexpected.example/app.js'), async () => external), /Unexpected script origin/);
});

test('inline minification preserves cross-script globals and structured data', async () => {
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'LocalCloud' });
  const html = `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'strict-dynamic' 'sha256-obsolete';"><script>var shared = { value: 7 }; function capture(value) { window.result = value; }</script><script>capture(shared.value);</script><script type="application/ld+json">${schema}</script>`;
  const secured = await finalizeCsp(html, () => assert.fail('no external scripts'));
  const context = { window: {} };
  for (const script of secured.matchAll(/<script>([\s\S]*?)<\/script>/g)) runInNewContext(script[1], context);
  assert.equal(context.window.result, 7);
  assert.ok(secured.includes(`<script type="application/ld+json">${schema}</script>`));
  assert.ok(!secured.includes('sha256-obsolete'));
  assert.equal(await finalizeCsp(secured, () => assert.fail('no external scripts')), secured);
});

test('search queues one integrity-protected client load and initializes its explicit base path', async () => {
  const source = readFileSync(new URL('../src/components/SearchModal.astro', import.meta.url), 'utf8');
  const loader = source.slice(source.indexOf('  async function loadPagefind()'), source.indexOf('  function openSearch()'));
  const inserted = [];
  const options = [];
  let initialized = 0;
  const client = { options: async (value) => options.push(value), init: async () => initialized++ };
  const context = {
    pagefind: null,
    pagefindLoading: null,
    modal: { dataset: { base: '/', clientSrc: '/_astro/pagefind-client.example.js', clientIntegrity: 'sha256-example' } },
    document: { createElement: () => ({}), head: { appendChild: (script) => inserted.push(script) } },
    console: { warn: (...args) => assert.fail(args.join(' ')) },
  };
  context.window = context;
  context.LocalCloudPagefind = client;
  runInNewContext(loader, context);
  const first = context.loadPagefind();
  const second = context.loadPagefind();
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].integrity, 'sha256-example');
  assert.equal(inserted[0].src, '/_astro/pagefind-client.example.js');
  inserted[0].onload();
  assert.equal(await first, client);
  assert.equal(await second, client);
  assert.equal(options[0].basePath, '/pagefind/');
  assert.equal(initialized, 1);
  await context.loadPagefind();
  assert.equal(inserted.length, 1);
});

test('a search client removed by a deploy reloads the page once per session, never offline', async () => {
  const source = readFileSync(new URL('../src/components/SearchModal.astro', import.meta.url), 'utf8');
  const loader = source.slice(source.indexOf('  async function loadPagefind()'), source.indexOf('  function openSearch()'));
  const run = ({ storage, onLine = true }) => {
    const inserted = [];
    let reloads = 0;
    const context = {
      pagefind: null,
      pagefindLoading: null,
      modal: { dataset: { base: '/', clientSrc: '/_astro/pagefind-client.old.js', clientIntegrity: 'sha256-old' } },
      document: { createElement: () => ({}), head: { appendChild: (script) => inserted.push(script) } },
      navigator: { onLine },
      sessionStorage: storage,
      console: { warn() {} },
    };
    context.window = context;
    context.window.location = { reload: () => reloads++ };
    runInNewContext(loader, context);
    return { context, inserted, reloads: () => reloads };
  };
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const first = run({ storage });
  const failed = first.context.loadPagefind();
  first.inserted[0].onerror();
  assert.equal(await failed, null);
  assert.equal(first.reloads(), 1);
  const second = run({ storage });
  const failedAgain = second.context.loadPagefind();
  second.inserted[0].onerror();
  assert.equal(await failedAgain, null);
  assert.equal(second.reloads(), 0, 'the reloaded page must not reload again');
  const offline = run({ storage: { getItem: () => null, setItem() {} }, onLine: false });
  offline.context.loadPagefind();
  offline.inserted[0].onerror();
  assert.equal(offline.reloads(), 0);
  const blocked = run({ storage: { getItem() { throw new Error('SecurityError'); } } });
  blocked.context.loadPagefind();
  blocked.inserted[0].onerror();
  assert.equal(blocked.reloads(), 0, 'without session storage the guard cannot hold, so never reload');
});

test('search renders Pagefind highlights while escaping other excerpt markup', async () => {
  const source = readFileSync(new URL('../src/components/SearchModal.astro', import.meta.url), 'utf8');
  const escaping = source.slice(source.indexOf('  function escapeHtml('), source.indexOf('  async function loadPagefind('));
  const handler = source.slice(source.indexOf('  // Search input handler'), source.indexOf('  // Close on result click'));
  let onInput;
  let render;
  const context = {
    debounceTimer: null,
    input: { value: 'BigQuery', addEventListener: (_, callback) => { onInput = callback; } },
    results: {},
    clearTimeout() {},
    setTimeout: (callback) => { render = callback; },
    loadPagefind: async () => ({ search: async () => ({ results: [{ data: async () => ({
      url: '/bigquery-emulator/',
      meta: { title: '<mark>Unsafe title</mark>' },
      excerpt: '<mark>BigQuery</mark> <img src=x onerror="alert(1)"> <mark onclick="alert(1)">unsafe</mark> &lt;mark&gt;',
    }) }] }) }),
  };
  runInNewContext(escaping + handler, context);
  onInput();
  await render();
  assert.match(context.results.innerHTML, /<mark>BigQuery<\/mark>/);
  assert.match(context.results.innerHTML, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(context.results.innerHTML, /&lt;mark onclick=&quot;alert\(1\)&quot;&gt;/);
  assert.match(context.results.innerHTML, /&lt;mark&gt;Unsafe title&lt;\/mark&gt;/);
  assert.match(context.results.innerHTML, /&amp;lt;mark&amp;gt;/);
  assert.doesNotMatch(context.results.innerHTML, /<img\b|<mark\s/);
});

// The headers public/_headers sets for one path pattern, as { name: value }.
function headerRule(path) {
  const rules = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8').split(/\n(?=\S)/);
  const rule = rules.find((block) => block.split('\n')[0].trim() === path) ?? '';
  return Object.fromEntries(rule.split('\n').slice(1).map((line) => line.trim())
    .filter((line) => line && !line.startsWith('!') && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf(':')).trim(), line.slice(line.indexOf(':') + 1).trim()]));
}

const distRoot = new URL('../dist/', import.meta.url).pathname;
const walkHtml = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
  ? walkHtml(join(directory, entry.name))
  : entry.name.endsWith('.html') ? [join(directory, entry.name)] : []);

test('every built page links only hashed /_astro/ stylesheets served with the immutable cache rule', () => {
  assert.equal(headerRule('/_astro/*')['Cache-Control'], 'public, max-age=31536000, immutable');
  const pages = walkHtml(distRoot);
  assert.ok(pages.length > 100, 'built pages are present');
  const failures = [];
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const links = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].map((match) => match[0]);
    if (!links.length) failures.push(`${file.slice(distRoot.length)} links no stylesheet`);
    for (const link of links) {
      const href = link.match(/\bhref="([^"]+)"/)?.[1] ?? '';
      if (!/^\/_astro\/[^/]+\.[A-Za-z0-9_-]{8}\.css$/.test(href)) failures.push(`${file.slice(distRoot.length)} links ${href}, not a hashed /_astro/*.css file`);
      else if (!existsSync(join(distRoot, href))) failures.push(`${file.slice(distRoot.length)} links missing ${href}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('built homepage has local font preload, cached hashed stylesheets, sized hero and nonredundant brand marks', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  const stylesheets = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(stylesheets.length > 0 && stylesheets.every((href) => /^\/_astro\/[^/]+\.[A-Za-z0-9_-]{8}\.css$/.test(href)));
  const fontLink = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0])
    .find((link) => link.includes('rel="preload"') && link.includes('as="font"'));
  assert.ok(fontLink, 'body font is discovered in the head');
  const fontPath = fontLink.match(/href="([^"]+)"/)[1];
  assert.ok(fontPath.startsWith('/_astro/'));
  assert.ok(existsSync(resolve('dist', fontPath.slice(1))));
  const hero = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0])
    .find((img) => img.includes('field-board__image'));
  assert.match(hero, /width="1200"/);
  assert.match(hero, /height="760"/);
  assert.match(hero, /fetchpriority="high"/);
  const brands = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0])
    .filter((img) => img.includes('brand-mark'));
  assert.equal(brands.length, 2);
  assert.ok(brands.every((img) => /\salt(?:=""|(?=[\s>]))/.test(img) && img.includes('aria-hidden="true"')));
  assert.doesNotMatch(html, /<h4>Product<\/h4>/);
  assert.match(html, /http-equiv="(?:Content-Security-Policy|content-security-policy)"/);
  assert.match(html, /sha256-/);
  assert.match(html, /'strict-dynamic'/);
  assert.match(html, /worker-src 'self'/);
  const posthog = resolvePosthogConfig(loadEnv('production', process.cwd(), ''));
  assert.ok(html.includes(["connect-src 'self'", ...posthog.origins].join(' ')));
  if (!posthog.origins.length) assert.doesNotMatch(html, /https:\/\/us(?:-assets)?\.i\.posthog\.com/);
  const cspMeta = html.match(/<meta\b[^>]*http-equiv="(?:Content-Security-Policy|content-security-policy)"[^>]*>/)[0];
  const connectSources = cspMeta.match(/content="([^"]+)"/)[1].split(';').map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === 'connect-src').slice(1);
  const cloudflare = resolveCloudflareAnalyticsConfig(loadEnv('production', process.cwd(), ''));
  for (const origin of cloudflare.connectOrigins) assert.ok(connectSources.includes(origin), `connect-src must allow ${origin}`);
  if (cloudflare.token) assert.ok(connectSources.includes(new URL(cloudflare.endpoint).origin), 'connect-src must allow the beacon endpoint');
  const modal = html.match(/<div\b[^>]*id="search-modal"[^>]*>/)[0];
  const clientPath = modal.match(/data-client-src="([^"]+)"/)[1];
  const integrity = modal.match(/data-client-integrity="([^"]+)"/)[1];
  const clientBytes = readFileSync(resolve('dist', clientPath.slice(1)), 'utf8');
  assert.equal(integrity, `sha256-${createHash('sha256').update(clientBytes).digest('base64')}`);
  assert.doesNotMatch(clientBytes, /\bimport\s*\(/);
  assert.ok(!html.includes(`<script src="${clientPath}"`), 'search client must remain lazy');
  const clientContext = { TextDecoder, TextEncoder };
  runInNewContext(clientBytes, clientContext);
  assert.equal(typeof clientContext.LocalCloudPagefind.search, 'function');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (!match[1].trim()) continue;
    const hash = createHash('sha256').update(match[1]).digest('base64');
    assert.ok(html.includes(`sha256-${hash}`), 'emitted inline script must be allowed by CSP');
  }
});
