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
const inlineScripts = [...layout.matchAll(/<script is:inline[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const bootstrap = inlineScripts.find((script) => script.includes('posthog.init('));
const eventTracking = inlineScripts.find((script) => script.includes("posthog.capture('code_copied'"));
const cloudflareToken = resolveCloudflareAnalyticsConfig().token;
const sdkSrc = '/ingest/static/array.js';
const beaconSrc = 'https://static.cloudflareinsights.com/beacon.min.js';

// Runs the head bootstrap the way the browser would, with the visitor's privacy signals and
// stored choice. inserted lists the scripts it appends to <head> by src.
function analyticsHarness(readyState, { supportsIdle = true, navigator = {}, stored = null, storageThrows = false, token = cloudflareToken } = {}) {
  const inserted = [];
  const timers = [];
  const idle = [];
  const listeners = new Map();
  const storage = new Map(stored === null ? [] : [['lc-analytics', stored]]);
  const context = {
    posthogApiHost: '/ingest',
    cloudflareAnalyticsToken: token,
    cloudflareAnalyticsEndpoint: '/cdn-cgi/rum',
    navigator,
    localStorage: {
      getItem: (key) => { if (storageThrows) throw new Error('SecurityError'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (storageThrows) throw new Error('SecurityError'); storage.set(key, value); },
      removeItem: (key) => { if (storageThrows) throw new Error('SecurityError'); storage.delete(key); },
    },
    document: {
      readyState,
      createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
      head: { appendChild: (script) => inserted.push(script) },
    },
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    addEventListener: (event, callback, options) => listeners.set(event, { callback, options }),
  };
  context.window = context;
  if (supportsIdle) context.requestIdleCallback = (callback, options) => idle.push({ callback, options });
  runInNewContext(bootstrap, context);
  const queued = () => [...context.posthog].map((call) => call[0]);
  const runSchedule = () => {
    listeners.get('load')?.callback();
    timers.splice(0).forEach((timer) => timer.callback());
    idle.splice(0).forEach((request) => request.callback());
  };
  return { context, inserted, timers, idle, listeners, storage, queued, runSchedule, srcs: () => inserted.map((script) => script.src) };
}

test('analytics queues interactions, then loads PostHog and the Cloudflare beacon after load and idle', () => {
  const h = analyticsHarness('loading');
  h.context.posthog.capture('code_copied', { page_path: '/' });
  const [method, event] = [...h.context.posthog].at(-1);
  assert.equal(method, 'capture');
  assert.equal(event, 'code_copied');
  assert.equal(h.inserted.length, 0, 'nothing loads at head parse time');
  assert.equal(h.timers.length, 0);
  assert.equal(h.listeners.get('load').options.once, true);
  h.listeners.get('load').callback();
  assert.equal(h.timers[0].delay, 1500);
  h.timers[0].callback();
  assert.equal(h.inserted.length, 0);
  assert.equal(h.idle[0].options.timeout, 2000);
  h.idle[0].callback();
  assert.deepEqual(h.srcs(), [sdkSrc, beaconSrc]);
  assert.ok(h.inserted.every((script) => script.async === true));
  assert.deepEqual(JSON.parse(h.inserted[1]['data-cf-beacon']), { token: cloudflareToken, send: { to: '/cdn-cgi/rum' } });
  const config = h.context.posthog._i[0][1];
  assert.equal(config.api_host, '/ingest');
  assert.equal(config.ui_host, 'https://us.posthog.com');
  assert.equal(config.disable_surveys, true);
  assert.equal(config.capture_exceptions, true);
  assert.equal(config.autocapture, false);
  assert.ok(!h.queued().includes('opt_out_capturing'));
  assert.equal(h.context.lcAnalytics.isOn(), true);
});

test('analytics still loads when load has already fired and idle callbacks are unavailable', () => {
  const h = analyticsHarness('complete', { supportsIdle: false });
  assert.equal(h.listeners.size, 0);
  assert.equal(h.inserted.length, 0);
  h.timers[0].callback();
  assert.deepEqual(h.srcs(), [sdkSrc, beaconSrc]);
  const staticBuild = analyticsHarness('complete', { supportsIdle: false, token: '' });
  staticBuild.timers[0].callback();
  assert.deepEqual(staticBuild.srcs(), [sdkSrc], 'builds without a Cloudflare token load no beacon');
});

test('Global Privacy Control, Do Not Track and a stored opt-out load neither PostHog nor the beacon', () => {
  for (const [options, signal] of [
    [{ navigator: { globalPrivacyControl: true } }, 'Global Privacy Control'],
    [{ navigator: { doNotTrack: '1' } }, 'Do Not Track'],
    [{ navigator: { doNotTrack: 'yes' } }, 'Do Not Track'],
    [{ stored: 'off' }, ''],
  ]) {
    const h = analyticsHarness('loading', options);
    h.runSchedule();
    assert.deepEqual(h.srcs(), [], JSON.stringify(options));
    assert.ok(h.queued().includes('opt_out_capturing'), JSON.stringify(options));
    assert.equal(h.context.lcAnalytics.privacySignal, signal);
    assert.equal(h.context.lcAnalytics.isOn(), false);
  }
  for (const navigator of [{ globalPrivacyControl: false }, { doNotTrack: '0' }, { doNotTrack: 'unspecified' }, { doNotTrack: null }]) {
    const h = analyticsHarness('loading', { navigator });
    h.runSchedule();
    assert.deepEqual(h.srcs(), [sdkSrc, beaconSrc], JSON.stringify(navigator));
  }
});

test('the footer choice turns analytics off and back on, never against a privacy signal', () => {
  const h = analyticsHarness('loading');
  h.context.posthog.capture('time_on_page', { seconds: 30 });
  assert.equal(h.context.lcAnalytics.setOn(false), true);
  assert.equal(h.storage.get('lc-analytics'), 'off');
  assert.ok(!h.queued().includes('capture'), 'events queued before the change are dropped');
  assert.equal(h.queued().at(-1), 'opt_out_capturing');
  h.runSchedule();
  assert.deepEqual(h.srcs(), [], 'the scheduled start honors the new choice');

  h.context.posthog.capture('time_on_page', { seconds: 120 });
  assert.equal(h.context.lcAnalytics.setOn(true), true);
  assert.equal(h.storage.has('lc-analytics'), false);
  assert.ok(!h.queued().includes('capture'), 'events recorded while off are never sent');
  assert.equal(h.queued().at(-1), 'opt_in_capturing');
  assert.deepEqual(h.srcs(), [sdkSrc, beaconSrc], 'turning analytics on loads it at once');
  h.context.lcAnalytics.setOn(true);
  assert.equal(h.inserted.length, 2, 'scripts load once');

  const signalled = analyticsHarness('loading', { navigator: { globalPrivacyControl: true } });
  assert.equal(signalled.context.lcAnalytics.setOn(true), false);
  signalled.runSchedule();
  assert.deepEqual(signalled.srcs(), []);
  assert.equal(signalled.context.lcAnalytics.isOn(), false);

  const blocked = analyticsHarness('loading', { storageThrows: true });
  assert.equal(blocked.context.lcAnalytics.setOn(false), true, 'blocked storage still turns analytics off for this page');
  blocked.runSchedule();
  assert.deepEqual(blocked.srcs(), []);
});

test('code_copied names the closest analytics label and fires only on a successful copy', () => {
  const listeners = new Map();
  const captured = [];
  const context = {
    posthog: { capture: (event, properties) => captured.push({ event, properties }), register_once() {} },
    location: { pathname: '/docs/' },
    document: {
      title: 'Docs',
      referrer: '',
      addEventListener: (event, callback) => listeners.set(event, callback),
      querySelector: () => null,
      getElementById: () => null,
      createElement: () => ({ setAttribute() {}, querySelector: () => null }),
      body: { appendChild() {} },
    },
    setInterval: () => 0,
    clearInterval() {},
    localStorage: { getItem: () => null, setItem() {} },
  };
  context.window = context;
  runInNewContext(eventTracking, context);
  const labelled = { closest: (selector) => selector === '[data-analytics-label]' ? { getAttribute: () => 'homepage-install-script' } : null };
  listeners.get('lc:copied')({ target: labelled });
  listeners.get('lc:copied')({ target: { closest: () => null } });
  assert.deepEqual(captured.map(({ event, properties }) => [event, properties.copy_target]), [
    ['code_copied', 'homepage-install-script'],
    ['code_copied', null],
  ]);
  // A click on a copy button alone records nothing; the copy handler reports success.
  listeners.get('click')({ target: { closest: () => null } });
  assert.equal(captured.length, 2);
  for (const source of ['../src/components/CopyButton.astro', '../src/layouts/DocsLayout.astro', '../src/pages/ai/index.astro']) {
    const handler = readFileSync(new URL(source, import.meta.url), 'utf8');
    const write = handler.indexOf('await navigator.clipboard.writeText(');
    const dispatch = handler.indexOf("new CustomEvent('lc:copied'");
    assert.ok(write > 0 && dispatch > write, `${source} dispatches lc:copied after the clipboard write`);
  }
});

test('Cloudflare analytics follows deployment configuration and supports explicit disablement', () => {
  const enabled = resolveCloudflareAnalyticsConfig();
  assert.match(enabled.token, /^[a-f0-9]{32}$/);
  // The zone token is accepted only on the proxied hostname, which connect-src 'self' covers.
  assert.equal(enabled.endpoint, '/cdn-cgi/rum');
  assert.deepEqual(enabled.connectOrigins, []);
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

test('CSP permits the exact emitted script bytes and preserves the style policy', async () => {
  const inline = '\n window.ready = true;\n';
  const external = 'export const enabled = true;';
  const html = `<head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="script-src 'self' 'strict-dynamic'; style-src 'self' 'sha256-existing'; style-src-attr 'unsafe-inline';"><script>${inline}</script><script type="module" src="/_astro/app.js"></script></head>`;
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

test('the CSP meta moves to directly after <meta charset>, ahead of every script', async () => {
  const meta = `<meta http-equiv="content-security-policy" content="script-src 'self' 'strict-dynamic'; style-src 'self';">`;
  const html = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><script>window.early = 1;</script><script type="application/ld+json">{"a":1}</script>${meta}<link rel="stylesheet" href="/_astro/a.css"></head><body><script>window.late = 1;</script></body></html>`;
  const secured = await finalizeCsp(html, () => assert.fail('no external scripts'));
  const moved = secured.match(/<meta charset="UTF-8">(<meta http-equiv="content-security-policy"[^>]*>)/);
  assert.ok(moved, 'the policy follows the charset declaration');
  assert.equal(secured.match(/http-equiv="content-security-policy"/g).length, 1);
  assert.ok(secured.indexOf(moved[1]) < secured.indexOf('<script>'));
  for (const script of secured.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    assert.ok(moved[1].includes(`sha256-${createHash('sha256').update(script[1]).digest('base64')}`));
  }
  assert.equal(await finalizeCsp(secured, () => assert.fail('no external scripts')), secured);
  await assert.rejects(finalizeCsp(html.replace('<meta charset="UTF-8">', ''), () => assert.fail('no external scripts')), /Missing <meta charset>/);
});

test('inline minification preserves cross-script globals and structured data', async () => {
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'LocalCloud' });
  const html = `<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="script-src 'self' 'strict-dynamic' 'sha256-obsolete';"><script>var shared = { value: 7 }; function capture(value) { window.result = value; }</script><script>capture(shared.value);</script><script type="application/ld+json">${schema}</script>`;
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

// Runs the search input handler and its analytics with controllable timers. type() fires the
// 200 ms debounce at once; settle() fires the pending 1.5 s settle timer.
function searchHarness(searchResults) {
  const source = readFileSync(new URL('../src/components/SearchModal.astro', import.meta.url), 'utf8');
  const escaping = source.slice(source.indexOf('  function escapeHtml('), source.indexOf('  async function loadPagefind('));
  const handler = source.slice(source.indexOf('  // Search analytics'), source.indexOf('  // Close on result click'));
  const listeners = {};
  const timers = [];
  const captured = [];
  const context = {
    debounceTimer: null,
    input: { value: '', addEventListener: (event, callback) => { listeners[event] = callback; } },
    results: {},
    clearTimeout: (timer) => { if (timer) timer.cleared = true; },
    setTimeout: (callback, delay) => {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    posthog: { capture: (event, properties) => captured.push({ event, query: properties.query, results_count: properties.results_count }) },
    window: { location: { pathname: '/docs/' } },
    loadPagefind: async () => ({ search: async (query) => ({ results: searchResults(query) }) }),
  };
  runInNewContext(escaping + handler, context);
  const pending = (delay) => timers.filter((timer) => timer.delay === delay && !timer.cleared);
  const fire = async (delay) => {
    for (const timer of pending(delay)) {
      timer.cleared = true;
      await timer.callback();
    }
  };
  return {
    context,
    captured,
    source,
    async type(value, { changeBeforeRender } = {}) {
      context.input.value = value;
      listeners.input();
      if (changeBeforeRender !== undefined) context.input.value = changeBeforeRender;
      await fire(200);
    },
    settle: () => fire(1500),
    press: (key) => listeners.keydown({ key }),
  };
}

const bigQueryResult = (excerpt = '<mark>BigQuery</mark>') => ({ data: async () => ({ url: '/bigquery-emulator/', meta: { title: 'BigQuery' }, excerpt }) });

test('search renders Pagefind highlights while escaping other excerpt markup', async () => {
  const h = searchHarness(() => [{ data: async () => ({
    url: '/bigquery-emulator/',
    meta: { title: '<mark>Unsafe title</mark>' },
    excerpt: '<mark>BigQuery</mark> <img src=x onerror="alert(1)"> <mark onclick="alert(1)">unsafe</mark> &lt;mark&gt;',
  }) }]);
  await h.type('BigQuery');
  const { innerHTML } = h.context.results;
  assert.match(innerHTML, /<mark>BigQuery<\/mark>/);
  assert.match(innerHTML, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(innerHTML, /&lt;mark onclick=&quot;alert\(1\)&quot;&gt;/);
  assert.match(innerHTML, /&lt;mark&gt;Unsafe title&lt;\/mark&gt;/);
  assert.match(innerHTML, /&amp;lt;mark&amp;gt;/);
  assert.doesNotMatch(innerHTML, /<img\b|<mark\s/);
});

test('docs_search fires once per settled query, not for each debounced keystroke', async () => {
  const h = searchHarness((query) => query.startsWith('zz') ? [] : [bigQueryResult(), bigQueryResult()]);
  for (const value of ['bi', 'big', 'bigq', 'bigque', 'bigquery']) await h.type(value);
  assert.deepEqual(h.captured, [], 'nothing is sent while the visitor is typing');
  await h.settle();
  assert.deepEqual(h.captured, [{ event: 'docs_search', query: 'bigquery', results_count: 2 }]);
  h.press('Enter');
  await h.settle();
  assert.equal(h.captured.length, 1, 'a reported query is not sent again');

  await h.type('pubsub');
  h.press('Enter');
  await h.settle();
  await h.type('pubsub');
  await h.settle();
  assert.deepEqual(h.captured.slice(1), [{ event: 'docs_search', query: 'pubsub', results_count: 2 }], 'Enter reports at once, and only once');

  await h.type('zzzz');
  await h.settle();
  assert.deepEqual(h.captured.at(-1), { event: 'docs_search', query: 'zzzz', results_count: 0 }, 'queries without results are reported too');

  await h.type('spanner', { changeBeforeRender: 'spanner emulator' });
  await h.type('');
  await h.settle();
  await h.type('ab');
  await h.settle();
  assert.equal(h.captured.length, 3, 'stale, cleared and short queries are never reported');

  const close = h.source.slice(h.source.indexOf('  function closeSearch()'), h.source.indexOf('  // Keyboard shortcuts'));
  assert.match(close, /reportSearch\(\);[\s\S]*modal\.hidden = true/, 'closing search (and opening a result) reports the pending query first');
});

const distRoot = new URL('../dist/', import.meta.url).pathname;
const walkHtml = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
  ? walkHtml(join(directory, entry.name))
  : entry.name.endsWith('.html') ? [join(directory, entry.name)] : []);

// Inline styles avoid one blocking request before first paint: an external stylesheet cost
// 500-1,300 ms of first-view LCP on throttled mobile, more than repeat views gained.
test('every built page inlines its styles instead of linking a stylesheet', () => {
  const pages = walkHtml(distRoot);
  assert.ok(pages.length > 100, 'built pages are present');
  const failures = pages.filter((file) => /<link\b[^>]*\brel="stylesheet"/.test(readFileSync(file, 'utf8')))
    .map((file) => file.slice(distRoot.length));
  assert.deepEqual(failures, []);
});

test('every built page declares its CSP directly after <meta charset>, before any executable script', () => {
  const javascript = (attributes) => ['', 'module', 'text/javascript', 'application/javascript']
    .includes((attributes.match(/\btype=["']?([^"'\s>]+)/i)?.[1] ?? '').toLowerCase());
  const failures = [];
  for (const file of walkHtml(distRoot)) {
    const html = readFileSync(file, 'utf8');
    const page = file.slice(distRoot.length);
    const csp = html.match(/<meta\b[^>]*http-equiv=["']content-security-policy["'][^>]*>/i);
    const charset = html.match(/<meta\b[^>]*\scharset=[^>]*>/i);
    if (!csp || !charset) {
      failures.push(`${page} lacks a CSP or charset meta`);
      continue;
    }
    if (csp.index !== charset.index + charset[0].length) failures.push(`${page}: the CSP meta does not directly follow <meta charset>`);
    const early = [...html.slice(0, csp.index).matchAll(/<script\b([^>]*)>/gi)].filter((match) => javascript(match[1]));
    if (early.length) failures.push(`${page}: ${early.length} executable script(s) precede the CSP meta`);
  }
  assert.deepEqual(failures, []);
});

test('every built page prefetches same-origin pages through CSP-hashed speculation rules, never prerendering', () => {
  const failures = [];
  for (const file of walkHtml(distRoot)) {
    const html = readFileSync(file, 'utf8');
    const page = file.slice(distRoot.length);
    const blocks = [...html.matchAll(/<script\b[^>]*\btype="speculationrules"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    if (blocks.length !== 1) {
      failures.push(`${page} has ${blocks.length} speculation rule blocks`);
      continue;
    }
    const csp = html.match(/<meta\b[^>]*http-equiv="content-security-policy"[^>]*content="([^"]+)"/i)?.[1] ?? '';
    const scriptSrc = csp.split(';').map((directive) => directive.trim()).find((directive) => directive.startsWith('script-src ')) ?? '';
    if (!scriptSrc.includes(`'sha256-${createHash('sha256').update(blocks[0]).digest('base64')}'`)) failures.push(`${page}: script-src lacks the speculation rules hash`);
    const rules = JSON.parse(blocks[0]);
    if (Object.keys(rules).join() !== 'prefetch' || rules.prefetch.length !== 1) failures.push(`${page}: speculation rules must hold one prefetch rule and no prerender`);
    const [rule] = rules.prefetch;
    if (rule.eagerness !== 'moderate') failures.push(`${page}: prefetch eagerness is ${rule.eagerness}`);
    const [sameOrigin, excluded] = rule.where?.and ?? [];
    if (sameOrigin?.href_matches !== '/*') failures.push(`${page}: prefetch is not limited to same-origin links`);
    for (const pattern of ['/ingest*', '/install.sh', '/*.md', '/*.txt', '/license.txt']) {
      if (!excluded?.not?.href_matches?.includes(pattern)) failures.push(`${page}: prefetch does not exclude ${pattern}`);
    }
  }
  assert.deepEqual(failures, []);
});

// One page per template: docs, service catalog and detail, blog index and posts.
const representativePages = [
  'docs/index.html', 'docs/configuration/index.html', 'services/index.html', 'services/bigquery/index.html',
  'blog/index.html', 'blog/run-dataproc-locally-docker/index.html', 'blog/localcloud-for-open-source/index.html',
];

test('docs, services and blog pages preload the body font and never lazy-load or leave unsized a hero image', () => {
  const failures = [];
  for (const page of representativePages) {
    const html = readFileSync(join(distRoot, page), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    const font = [...head.matchAll(/<link\b[^>]*>/g)].map((match) => match[0])
      .find((link) => link.includes('rel="preload"') && link.includes('as="font"'));
    const fontPath = font?.match(/\bhref="([^"]+)"/)?.[1] ?? '';
    if (!/^\/_astro\/[^/]+\.woff2$/.test(fontPath) || !existsSync(join(distRoot, fontPath))) failures.push(`${page}: no preloaded /_astro/ body font`);
    else if (!/\bcrossorigin\b/.test(font) || !font.includes('type="font/woff2"')) failures.push(`${page}: the font preload lacks crossorigin or its type, so the browser would fetch the font twice`);
    if (/fonts\.(googleapis|gstatic)\.com/.test(html)) failures.push(`${page}: loads a third-party font`);
    // The first section of <main> is the hero; its images are the LCP candidates.
    const main = html.slice(html.indexOf('<main'));
    const hero = main.match(/<section\b[\s\S]*?<\/section>/)?.[0] ?? '';
    for (const img of hero.matchAll(/<img\b[^>]*>/g)) {
      if (!/\swidth="\d+"/.test(img[0]) || !/\sheight="\d+"/.test(img[0])) failures.push(`${page}: hero image without width and height: ${img[0]}`);
      if (/\sloading="lazy"/.test(img[0])) failures.push(`${page}: lazy-loaded hero image: ${img[0]}`);
    }
  }
  assert.deepEqual(failures, []);
  const service = readFileSync(join(distRoot, 'services/bigquery/index.html'), 'utf8');
  assert.match(service, /<img\b[^>]*src="\/icons\/bigquery\.svg"[^>]*loading="eager"/, 'the service hero icon loads eagerly');
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
  const cspMeta = html.match(/<meta\b[^>]*http-equiv="(?:Content-Security-Policy|content-security-policy)"[^>]*>/)[0];
  const connectSources = cspMeta.match(/content="([^"]+)"/)[1].split(';').map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === 'connect-src').slice(1);
  const cloudflare = resolveCloudflareAnalyticsConfig(loadEnv('production', process.cwd(), ''));
  for (const origin of cloudflare.connectOrigins) assert.ok(connectSources.includes(origin), `connect-src must allow ${origin}`);
  if (cloudflare.token) {
    const site = 'https://local.cloud';
    const endpointOrigin = new URL(cloudflare.endpoint, site).origin;
    const allowed = endpointOrigin === site ? "'self'" : endpointOrigin;
    assert.ok(connectSources.includes(allowed), `connect-src must allow the beacon endpoint (${allowed})`);
  }
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
