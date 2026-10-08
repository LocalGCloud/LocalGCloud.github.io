import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { finalizeCsp, createMappedScript } from './finalize-static-csp.mjs';
import { transform } from 'esbuild';
import { loadEnv } from 'vite';
import { resolvePosthogConfig } from '../src/utils/posthog-config.mjs';
import { resolveCloudflareAnalyticsConfig } from '../src/utils/cloudflare-analytics-config.mjs';

const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const inlineScripts = [...layout.matchAll(/<script is:inline[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const bootstrap = inlineScripts.find((script) => script.includes('posthog.init('));
const eventTracking = readFileSync(new URL('../src/scripts/site-interactions.mjs', import.meta.url), 'utf8');
const cloudflareToken = resolveCloudflareAnalyticsConfig().token;
const sdkSrc = '/ingest/static/array.js';
const beaconSrc = 'https://static.cloudflareinsights.com/beacon.min.js';

// Runs the head bootstrap the way the browser would, with the visitor's privacy signals and
// stored choice. inserted lists the scripts it appends to <head> by src.
function analyticsHarness(readyState, { supportsIdle = true, navigator = {}, stored = null, storageThrows = false, token = cloudflareToken, hostname = 'local.cloud', pathname = '/', random = 0.1, mobile = false } = {}) {
  const inserted = [];
  const timers = [];
  const idle = [];
  const listeners = new Map();
  const viewport = { matches: !mobile, addEventListener: (event, callback) => listeners.set('viewport:' + event, { callback }) };
  const storage = new Map(stored === null ? [] : [['lc-analytics', stored]]);
  const context = {
    posthogApiHost: '/ingest',
    cloudflareAnalyticsToken: token,
    cloudflareAnalyticsEndpoint: '/cdn-cgi/rum',
    siteRelease: 'fixture-release',
    location: { hostname, pathname, href:'https://'+hostname+pathname },
    Math: { random: () => random },
    matchMedia: () => viewport,
    navigator,
    CustomEvent: class { constructor(type) { this.type = type; } },
    dispatchEvent: (event) => listeners.get(event.type)?.callback(event),
    localStorage: {
      getItem: (key) => { if (storageThrows) throw new Error('SecurityError'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (storageThrows) throw new Error('SecurityError'); storage.set(key, value); },
      removeItem: (key) => { if (storageThrows) throw new Error('SecurityError'); storage.delete(key); },
    },
    document: {
      title:'Fixture visit',
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
  return { context, inserted, timers, idle, listeners, storage, viewport, queued, runSchedule, srcs: () => inserted.map((script) => script.src) };
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
  assert.equal(h.listeners.has('load'), false);
  assert.equal(h.inserted.length, 0);
  h.timers[0].callback();
  assert.deepEqual(h.srcs(), [sdkSrc, beaconSrc]);
  const staticBuild = analyticsHarness('complete', { supportsIdle: false, token: '' });
  staticBuild.timers[0].callback();
  assert.deepEqual(staticBuild.srcs(), [sdkSrc], 'builds without a Cloudflare token load no beacon');
});

test('behavior analytics keeps replay sampling and expensive capture bounded', () => {
  const h = analyticsHarness('loading');
  const config = h.context.posthog._i[0][1];
  assert.equal(config.disable_session_recording, false);
  assert.ok(config.session_recording.sampleRate > 0 && config.session_recording.sampleRate <= 0.1,
    'record at most approximately 10% of sessions');
  assert.equal(config.session_recording.strictMinimumDuration, true);
  assert.equal(config.session_recording.maskAllInputs, true);
  assert.equal(config.session_recording.blockSelector, 'input[type="hidden"], input[type="file"]');
  assert.equal(config.session_recording.recordHeaders, false);
  assert.equal(config.session_recording.recordBody, false);
  assert.equal(config.session_recording.captureCanvas.recordCanvas, false);
  assert.equal(config.enable_recording_console_log, false);
  assert.equal(config.capture_performance.web_vitals, true);
  assert.equal(config.capture_performance.web_vitals_attribution, false);
  assert.equal(config.capture_performance.network_timing, false);
  assert.equal(config.autocapture, false, 'do not turn every click into a billable event');
  assert.equal(config.capture_heatmaps, true);
  assert.equal(config.capture_dead_clicks, true);
  h.context.lcAnalytics.setOn(false);
  h.runSchedule();
  assert.deepEqual(h.srcs(), [], 'opt-out prevents even sampled recordings and heatmaps');
  h.context.lcAnalytics.setOn(true);
  assert.equal(h.context.posthog._i.length, 1, 'opt-in retains the same sampling configuration');
});

test('mobile disables replay and heatmaps while preserving visits, actions and errors', () => {
  const h = analyticsHarness('loading', { mobile: true });
  const config = h.context.posthog._i[0][1];
  assert.equal(config.disable_session_recording, true);
  assert.equal(config.capture_heatmaps, false);
  assert.equal(config.capture_exceptions, true);
  assert.equal(config.capture_pageleave, true);
  assert.equal(h.context.posthog[0][1], '$pageview');
  for (const event of ['code_copied', 'cta_clicked', 'search_result_clicked', '$exception']) {
    h.context.posthog.capture(event, {});
    assert.equal(config.before_send({ event, properties: {} }).event, event);
  }
  h.runSchedule();
  assert.deepEqual(h.srcs(), [sdkSrc, beaconSrc]);
  h.context.lcAnalytics.setOn(false);
  assert.equal(config.before_send({ event: 'cta_clicked', properties: {} }), null);
});

test('crossing the desktop breakpoint updates replay and heatmaps without changing event capture', () => {
  const h = analyticsHarness('loading');
  for (const wide of [false, true]) {
    h.viewport.matches = wide;
    h.listeners.get('viewport:change').callback();
    const [method, config] = [...h.context.posthog].at(-1);
    assert.equal(method, 'set_config');
    assert.equal(config.disable_session_recording, !wide);
    assert.equal(config.capture_heatmaps, wide);
    assert.equal(h.context.lcAnalytics.isOn(), true);
  }
});

test('heatmaps are limited to the three production URL rules without disabling other events', () => {
  for (const [pathname, enabled] of [['/', true], ['/pricing/', true], ['/docs/', true], ['/docs/configuration/', true], ['/services/', false], ['/pricing-extra/', false]]) {
    const h = analyticsHarness('loading', { pathname });
    const config = h.context.posthog._i[0][1];
    assert.equal(config.capture_heatmaps, enabled, pathname);
    assert.ok(config.before_send({ event: 'code_copied', properties: {} }));
  }
});

test('production-only analytics samples vitals without losing conversion, error or replay events', () => {
  for (const [random, sampled] of [[0, true], [0.199, true], [0.2, false], [0.99, false]]) {
    const h = analyticsHarness('loading', { random });
    const config = h.context.posthog._i[0][1];
    assert.equal(config.capture_performance !== false, sampled, 'unsampled visits do not start performance capture');
    const send = config.before_send;
    for (const name of ['$web_vitals', 'code_copied', '$exception', '$snapshot']) {
      const event = { event: name, properties: { landing_page: '/stale/', landing_referrer: 'old visitor context' } };
      const sent = send(event);
      assert.equal(sent === null, name === '$web_vitals' && !sampled);
      if (sent) {
        assert.equal(sent.properties.telemetry_source, 'website');
        assert.equal(sent.properties.site_release, 'fixture-release');
        assert.equal('landing_page' in sent.properties, false);
        assert.equal('landing_referrer' in sent.properties, false);
      }
    }
    h.context.lcAnalytics.setOn(false);
    assert.equal(send({ event: 'code_copied', properties: {} }), null);
  }
  for (const hostname of ['localhost', '127.0.0.1', 'preview.workers.dev', 'local.cloud.example']) {
    const h = analyticsHarness('loading', { hostname });
    h.runSchedule();
    assert.deepEqual(h.srcs(), []);
    assert.equal(h.context.lcAnalytics.setOn(true), false);
  }
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
  assert.deepEqual(Array.from(h.context.posthog).filter(call=>call[0]==='capture').map(call=>call[1]),['$pageview'],'opt-in captures the current visit and discards events recorded while off');
  assert.deepEqual(h.srcs(), [sdkSrc, beaconSrc], 'turning analytics on loads it at once');
  h.context.lcAnalytics.setOn(true);
  assert.equal(h.inserted.length, 2, 'scripts load once');
  assert.equal(Array.from(h.context.posthog).filter(call=>call[1]==='$pageview').length,1,'repeated opt-in preserves one queued current pageview');

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

test('analytics storage changes update capture and notify controls in the current document', () => {
  const h = analyticsHarness('loading');
  let updates = 0;
  h.context.addEventListener('lc:analytics-choice', () => updates++);
  h.listeners.get('storage').callback({ key: 'lc-analytics', newValue: 'off' });
  assert.equal(h.context.lcAnalytics.isOn(), false);
  assert.equal(updates, 1);
  h.listeners.get('storage').callback({ key: 'lc-analytics', newValue: null });
  assert.equal(h.context.lcAnalytics.isOn(), true);
  assert.equal(updates, 2);
  h.listeners.get('storage').callback({ key: 'lc-site-view', newValue: 'classic' });
  assert.equal(updates, 2);
});

test('initially opted-out analytics captures the current visit once when enabled, before or after SDK readiness',()=>{
  for(const ready of [false,true]){
    const h=analyticsHarness('loading',{stored:'off'});
    h.context.location.href='https://local.cloud/docs/';h.context.document.title='Docs';
    if(ready)h.context.posthog._i[0][1].loaded();
    assert.equal(h.context.lcAnalytics.setOn(true),true);assert.equal(h.context.lcAnalytics.setOn(true),true);
    const views=Array.from(h.context.posthog).filter(call=>call[0]==='capture'&&call[1]==='$pageview');
    assert.equal(views.length,1);assert.equal(views[0][2].$current_url,'https://local.cloud/docs/');assert.equal(views[0][2].$title,'Docs');
    assert.equal(h.context.posthog._i[0][1].capture_pageview,false);
  }
});

test('code_copied names the closest analytics label and fires only on a successful copy', () => {
  const listeners = new Map();
  const captured = [];
  const context = {
    posthog: { capture: (event, properties) => captured.push({ event, properties }), register_for_session() {} },
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
  assert.match(readFileSync(new URL('../src/components/CopyButton.astro', import.meta.url), 'utf8'), /import copyScript from '\.\.\/scripts\/copy-buttons\.mjs\?url'/);
  for (const source of ['../src/scripts/copy-buttons.mjs', '../src/layouts/DocsLayout.astro', '../src/pages/ai/index.astro']) {
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

test('mapped scripts keep execution order, matching maps and exact CSP/SRI bytes', async () => {
  const source = 'var shared = 7; function record(value) { window.recorded = value; }';
  const transformed = await transform(source, {
    loader: 'js', minify: true, treeShaking: false, sourcemap: 'external', sourcefile: 'rendered-inline.js',
  });
  const first = createMappedScript(transformed.code, transformed.map, 'inline');
  const second = createMappedScript('record(shared);', JSON.stringify({ version: 3, sources: ['second.js'], sourcesContent: ['record(shared);'], names: [], mappings: 'AAAA' }), 'inline');
  const schema = '{"@type":"Organization"}';
  const html = `<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="script-src 'self' 'strict-dynamic';"><script>${source}</script><script>record(shared);</script><script type="application/ld+json">${schema}</script>`;
  const assets = [first, second];
  let next = 0;
  const secured = await finalizeCsp(html, async () => assert.fail('no original external asset'), async () => assets[1 - next++]);
  assert.ok(secured.indexOf(first.src) < secured.indexOf(second.src));
  assert.ok(!secured.includes('defer') && !secured.includes('async'), 'classic script timing is preserved');
  assert.ok(secured.includes(`<script type="application/ld+json">${schema}</script>`));
  const context = { window: {} };
  for (const asset of assets) {
    const hash = `sha256-${createHash('sha256').update(asset.code).digest('base64')}`;
    assert.ok(secured.includes(`integrity="${hash}"`) && secured.includes(`'${hash}'`));
    runInNewContext(asset.code, context);
  }
  assert.equal(context.window.recorded, 7);
  assert.equal(JSON.parse(first.map).sourcesContent[0], source);
  assert.match(first.code, /^\/\/# sourceMappingURL=inline\.[a-f0-9]+\.js\.map$/m);
  assert.notEqual(createMappedScript(transformed.code, transformed.map.replace(source, source + ' '), 'inline').src, first.src,
    'a mapping change cannot reuse an immutable asset URL');
});

test('critical startup scripts execute inline with exact CSP hashes and the same public source coordinates', async () => {
  const source = 'var firstVisit = 7; window.visits = firstVisit;';
  const mapped = await transform(source, { loader: 'js', minify: true, treeShaking: false, sourcemap: 'external', sourcefile: 'rendered-inline.js' });
  const asset = createMappedScript(mapped.code, mapped.map, 'inline');
  const html = `<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="script-src 'self' 'strict-dynamic';"><script data-critical-bootstrap>${source}</script>`;
  const secured = await finalizeCsp(html, () => assert.fail('no external request'), async () => asset);
  const body = secured.match(/<script data-critical-bootstrap>([\s\S]*?)<\/script>/)[1];
  assert.ok(secured.includes(`'sha256-${createHash('sha256').update(body).digest('base64')}'`));
  assert.ok(!secured.includes(' src=') && !secured.includes('unsafe-inline'));
  assert.equal(body.split('\n')[0], asset.code.split('\n')[0], 'same generated line and columns as the served script');
  assert.ok(body.includes(`//# sourceURL=https://local.cloud${asset.src}\n//# sourceMappingURL=${asset.src}.map`));
  assert.equal(JSON.parse(asset.map).sourcesContent[0], source);
  const context = { window: {} };
  runInNewContext(body, context);
  assert.equal(context.window.visits, 7);
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
    results: { querySelector: () => null },
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
    change(value) { context.input.value = value; listeners.input(); },
    debounce: () => fire(200),
    async type(value, { changeBeforeRender } = {}) {
      context.input.value = value;
      listeners.input();
      if (changeBeforeRender !== undefined) context.input.value = changeBeforeRender;
      await fire(200);
    },
    settle: () => fire(1500),
    press: (key) => listeners.keydown({ key, preventDefault() {} }),
  };
}

const bigQueryResult = (excerpt = '<mark>BigQuery</mark>') => ({ data: async () => ({ url: '/services/bigquery/', meta: { title: 'BigQuery' }, excerpt }) });

test('Enter activates the first search result through the same clickable link path', async () => {
  const h = searchHarness(() => [bigQueryResult()]);
  let clicks = 0;
  h.context.results.querySelector = () => ({ click() { clicks++; } });
  await h.type('BigQuery');
  h.press('Enter');
  assert.equal(clicks, 1);
});

test('changing a search query clears old links and ignores older asynchronous results', async () => {
  let releaseOld;
  const oldData = new Promise((resolve) => { releaseOld = resolve; });
  const h = searchHarness((query) => query === 'old' ? [{ data: () => oldData }] : [bigQueryResult()]);
  let clicks = 0;
  h.context.results.querySelector = () => h.context.results.innerHTML.includes('search-modal__result')
    ? { click() { clicks++; } } : null;
  await h.type('bigquery');
  h.change('firestore');
  h.press('Enter');
  assert.equal(clicks, 0, 'the preceding query cannot be opened during debounce');
  h.change('old');
  const pending = h.debounce();
  await new Promise((resolve) => setImmediate(resolve));
  await h.type('new');
  const fresh = h.context.results.innerHTML;
  releaseOld({ url: '/old/', meta: { title: 'Old result' } });
  await pending;
  assert.equal(h.context.results.innerHTML, fresh, 'older responses cannot replace the current results');
});

test('search renders Pagefind highlights while escaping other excerpt markup', async () => {
  const h = searchHarness(() => [{ data: async () => ({
    url: '/services/bigquery/',
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

test('reveal setup completes all geometry reads before mutating classes', () => {
  const source = [...layout.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('IntersectionObserver'));
  const calls = [], observed = [];
  const nodes = [20, 900].map((top, i) => ({
    getBoundingClientRect() { calls.push('read:' + i); return { top, bottom: top + 100 }; },
    classList: { add() { calls.push('write:' + i); } },
  }));
  const context = {
    innerHeight: 720,
    document: { querySelectorAll: () => nodes, documentElement: { classList: { add() { calls.push('ready'); } } } },
    IntersectionObserver: class { observe(el) { observed.push(el); } },
  };
  context.window = context;
  runInNewContext(source, context);
  assert.deepEqual(calls, ['read:0', 'read:1', 'write:0', 'ready']);
  assert.deepEqual(observed, [nodes[1]], 'offscreen content keeps its reveal observer');
});

test('every page has no parser-blocking external scripts and loads interactions directly', () => {
  for (const path of walkHtml(distRoot)) {
    const html = readFileSync(path, 'utf8');
    for (const [, attrs] of html.matchAll(/<script\b([^>]*\bsrc="[^"]+"[^>]*)>/g)) {
      assert.ok(/\btype="module"|\b(?:async|defer)\b/.test(attrs), path + ': ' + attrs);
    }
    assert.match(html, /<script\b[^>]*type="module"[^>]*src="\/_astro\/site-interactions\.[^"]+\.mjs"/, path);
  }
});

test('shared images use byte-identical versioned copies while original public URLs remain', () => {
  const home = readFileSync(join(distRoot, 'index.html'), 'utf8');
  for (const [name, original] of [
    ['hero-laptop-service-grid', 'illustrations/hero-laptop-service-grid.svg'],
    ['localcloud-mark', 'brand/localcloud-mark.svg'], ['localcloud-icon', 'brand/localcloud-icon.svg'],
    ['localcloud-app-icon', 'brand/localcloud-app-icon.svg'],
    ['code-block', 'icons/personas/code-block.svg'], ['gear-six', 'icons/personas/gear-six.svg'], ['robot', 'icons/personas/robot.svg'],
  ]) {
    // Vite can deduplicate identical SVGs under another source filename.
    const originalBytes = readFileSync(resolve('public', original));
    const src = [...home.matchAll(/src="(\/_astro\/[^"/]+\.svg)"/g)].map(m => m[1])
      .find(path => readFileSync(join(distRoot, path)).equals(originalBytes));
    assert.ok(src, name);
    assert.ok(existsSync(join(distRoot, original)), original + ': retained public URL');
  }
  const service = readFileSync(join(distRoot, 'services/bigquery/index.html'), 'utf8');
  const src = service.match(/src="(\/_astro\/bigquery\.[^"/]+\.svg)"/)?.[1];
  assert.ok(src);
  assert.deepEqual(readFileSync(join(distRoot, src)), readFileSync(resolve('public/icons/bigquery.svg')));
});

test('every page keeps its critical bootstraps inline with retained maps and exact CSP', () => {
  for (const path of walkHtml(distRoot)) {
    const html = readFileSync(path, 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*data-critical-bootstrap[^>]*>([\s\S]*?)<\/script>/g)];
    const filters = [...html.matchAll(/<script\b[^>]*data-critical-bootstrap="filter"/g)].length;
    const search = [...html.matchAll(/<script\b[^>]*data-critical-bootstrap="search"/g)].length;
    const feedback = [...html.matchAll(/<script\b[^>]*data-critical-bootstrap="(?:feedback|fab)"/g)].length;
    assert.ok(filters <= 1 && feedback <= 2, path);
    assert.equal(search, 1, path);
    assert.equal(scripts.length, 4 + filters + search + feedback, path);
    for (const [, code] of scripts) {
      const src = code.match(/\/\/# sourceURL=https:\/\/local\.cloud(\/[^\n]+)/)?.[1];
      assert.ok(src, path);
      const served = readFileSync(join(distRoot, src), 'utf8');
      assert.equal(code.split('\n')[0], served.split('\n')[0]);
      assert.ok(code.includes(`//# sourceMappingURL=${src}.map`));
      assert.ok(existsSync(join(distRoot, `${src}.map`)));
      assert.ok(html.includes(`'sha256-${createHash('sha256').update(code).digest('base64')}'`), path);
    }
  }
});

test('built scripts retain matching public maps at distinct immutable release URLs', () => {
  const release = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().slice(0, 12);
  const files = JSON.parse(readFileSync(join(distRoot, 'asset-manifest.json'), 'utf8')).files;
  const scripts = files.filter((file) => file.endsWith('.js'));
  assert.ok(scripts.length > 5, 'compiled scripts are present');
  for (const file of scripts) {
    // Mapped view modules use the same code-and-map digest as inline/Pagefind assets.
    const mapped = /\/(?:inline|pagefind-client|desktop-view|desktop-controller|mobile-view|desktop-navigation|my-cloud|my-cloud-launcher|copy-buttons)\.[a-f0-9]{16}\.js$/.test(file);
    if (!mapped) assert.ok(file.endsWith(`.${release}.js`), file);
    const code = readFileSync(join(distRoot, file), 'utf8');
    assert.ok(code.includes(`\n//# sourceMappingURL=${file.split('/').at(-1)}.map`), file);
    assert.ok(files.includes(`${file}.map`), `${file}: map retained in manifest`);
    const map = JSON.parse(readFileSync(join(distRoot, `${file}.map`), 'utf8'));
    assert.ok(map.mappings && map.sourcesContent?.some(Boolean), `${file}: readable mappings`);
  }
});

// Inline styles avoid one blocking request before first paint: an external stylesheet cost
// 500-1,300 ms of first-view LCP on throttled mobile, more than repeat views gained.
test('every built page inlines its styles instead of linking a stylesheet', () => {
  const pages = walkHtml(distRoot);
  assert.ok(pages.length > 50, 'built pages are present');
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
  assert.match(service, /<img\b[^>]*src="\/_astro\/bigquery\.[^"/]+\.svg"[^>]*loading="eager"/, 'the versioned service hero icon loads eagerly');
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
  assert.ok(connectSources.includes('http://localhost:5380'), 'My cloud can check only the configured local console origin');
  assert.ok(!connectSources.includes('http:') && !connectSources.includes('*'), 'My cloud must not allow arbitrary HTTP origins');
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
