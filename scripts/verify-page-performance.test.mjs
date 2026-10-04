import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
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
  assert.deepEqual(enabled.connectOrigins, ['https://cloudflareinsights.com']);
  assert.equal(resolveCloudflareAnalyticsConfig({ SITE_DEPLOYMENT_TARGET: 'static' }).token, '');
  assert.deepEqual(resolveCloudflareAnalyticsConfig({ PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: '' }).scriptOrigins, []);
  assert.deepEqual(resolveCloudflareAnalyticsConfig({ PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: '' }).connectOrigins, []);
  const override = '1234567890abcdef1234567890abcdef';
  assert.equal(resolveCloudflareAnalyticsConfig({ SITE_DEPLOYMENT_TARGET: 'static', PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: override }).token, override);
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
    document: {
      createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
      head: { appendChild: (script) => inserted.push(script) },
    },
  });
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].src, 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.equal(inserted[0].async, true);
  assert.deepEqual(JSON.parse(inserted[0]['data-cf-beacon']), { token });
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
  assert.ok(secured.includes(`'${hash(inline)}'`));
  assert.ok(secured.includes(`'${hash(external)}'`));
  assert.ok(secured.includes(`integrity="${hash(external)}"`));
  assert.ok(secured.includes("style-src 'self' 'sha256-existing'"));
  assert.equal(await finalizeCsp(secured, async () => external), secured);
  await assert.rejects(finalizeCsp(html.replace('/_astro/app.js', 'https://unexpected.example/app.js'), async () => external), /Unexpected script origin/);
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

test('built homepage has local font preload, immediate styles, sized hero and nonredundant brand marks', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  assert.doesNotMatch(html, /<link\b[^>]*rel="stylesheet"/);
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
