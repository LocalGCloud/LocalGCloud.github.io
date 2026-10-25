import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { forecastTheme, handleWeather } from '../worker/weather.mjs';

const now = Date.parse('2026-07-01T12:00:00Z');
const forecast = (symbol, time = now) => ({ properties: { timeseries: [{ time: new Date(time).toISOString(), data: { next_1_hours: { summary: { symbol_code: symbol } } } }] } });
const request = cf => Object.assign(new Request('https://local.cloud/api/weather?lat=0&lon=0', { headers: { Cookie: 'private=1', 'CF-Connecting-IP': '192.0.2.1' } }), { cf });
const memoryCache = () => {
  const records = new Map();
  return { async match(key) { return records.get(key.url)?.clone(); }, async put(key, value) { records.set(key.url, value.clone()); } };
};

test('automatic weather selects only supported themes and leaves cloudy/night scenes on the main theme', () => {
  for (const [symbol, theme] of [['rain', 'rain'], ['lightrainshowers_day', 'rain'], ['sleet', 'snow'], ['snow', 'snow'], ['clearsky_day', 'sun'], ['fair_day', 'sun'], ['cloudy', 'off'], ['clearsky_night', 'off']]) {
    assert.equal(forecastTheme(forecast(symbol), 37, now), theme, symbol);
  }
  const north = Date.parse('2026-10-01T12:00:00Z'), south = Date.parse('2026-04-01T12:00:00Z');
  assert.equal(forecastTheme(forecast('cloudy', north), 37, north), 'autumn');
  assert.equal(forecastTheme(forecast('cloudy', south), -33, south), 'autumn');
  assert.equal(forecastTheme(forecast('rain', north), 37, north), 'rain');
  assert.equal(forecastTheme(forecast('cloudy', north), 0, north), 'off');
  assert.equal(forecastTheme(forecast('clearsky_day', now - 10800000), 37, now), 'off');
  assert.equal(forecastTheme({ properties: { timeseries: [{ time: 'invalid', data: forecast('clearsky_day').properties.timeseries[0].data }] } }, 37, now), 'off');
});

test('missing/invalid edge location never triggers an upstream request or accepts client coordinates', async () => {
  let calls = 0;
  for (const cf of [undefined, {}, { latitude: '', longitude: '' }, { latitude: 'NaN', longitude: 2 }, { latitude: 100, longitude: 0 }]) {
    const received = await handleWeather(request(cf), () => { calls++; }, memoryCache(), now);
    assert.equal((await received.json()).theme, 'off');
    assert.match(received.headers.get('Cache-Control'), /no-store/);
  }
  assert.equal(calls, 0);
});

test('forecasts share a coarse-area cache, strip visitor identity, and respect provider expiry', async () => {
  const cache = memoryCache(), calls = [];
  const send = async (url, options) => {
    calls.push({ url, options });
    return Response.json(forecast('rain'), { headers: { Expires: new Date(now + 3600000).toUTCString(), 'Last-Modified': new Date(now).toUTCString() } });
  };
  const cf = { latitude: '37.7749', longitude: '-122.4194' };
  const first = await handleWeather(request(cf), send, cache, now);
  assert.deepEqual(await first.json(), { theme: 'rain', expiresAt: now + 3600000 });
  await handleWeather(request({ latitude: '37.78', longitude: '-122.42' }), send, cache, now + 1800001);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=37.75&lon=-122.5');
  assert.match(calls[0].options.headers['User-Agent'], /local\.cloud\/contact/);
  assert.deepEqual(Object.keys(calls[0].options.headers).sort(), ['Accept', 'User-Agent']);
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  const stale = await handleWeather(request(cf), async (_, options) => {
    assert.equal(options.headers['If-Modified-Since'], new Date(now).toUTCString());
    return new Response(null, { status: 304, headers: { Expires: new Date(now + 7200000).toUTCString() } });
  }, cache, now + 3600001);
  assert.equal((await stale.json()).theme, 'rain');
});

test('weather failures are cached and concurrent requests share one lookup', async () => {
  const cache = memoryCache(), cf = { latitude: '50', longitude: '10' };
  let calls = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const send = async () => { calls++; await gate; throw Error('offline'); };
  const pending = [handleWeather(request(cf), send, cache, now), handleWeather(request(cf), send, cache, now)];
  await new Promise(setImmediate); release();
  for (const result of await Promise.all(pending)) assert.equal((await result.json()).theme, 'off');
  assert.equal(calls, 1);
  await handleWeather(request(cf), send, cache, now + 1000);
  assert.equal(calls, 1);
  assert.equal((await handleWeather(new Request('https://local.cloud/api/weather', { method: 'POST' }), send)).status, 405);
});

function desktop({ theme = 'auto', reduced = false, transport = async () => Response.json({ theme: 'rain', expiresAt: Date.now() + 1800000 }), blocked = false } = {}) {
  const all = [], frames = new Map(), timers = new Map(), events = new Map(), stored = new Map([['lc-desktop-weather', theme]]);
  let sequence = 0;
  const listen = target => Object.assign(target, { events: new Map(), addEventListener(name, fn) { this.events.set(name, fn); } });
  const context2d = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  const element = tag => {
    const el = listen({ tag, dataset: {}, style: {}, removed: false, setAttribute() {}, remove() { this.removed = true; }, getContext: () => context2d, getBoundingClientRect: () => ({ x: 140, y: 80, width: 1000, height: 600 }), getClientRects: () => [1] });
    all.push(el);return el;
  };
  const select = element('select'), animate = element('input'), visitor = element('input'), stop = element('button'), status = element('span');
  const fields = { '[data-weather-select]': select, '[data-weather-motion]': animate, '[data-weather-visitor]': visitor, '[data-weather-stop]': stop, '[data-weather-status]': status };
  const panel = listen({ parentElement: true, setAttribute() {}, querySelector: name => fields[name] }), menu = listen({ classList: { add() {} }, dataset: { weather: '/_astro/weather.mjs /_astro/weather.css' }, querySelector: () => panel, open: true });
  const shell = element('shell'), background = element('background'), pageWindow = element('window');shell.dataset.base = '/';
  const root = { dataset: { siteView: 'desktop', audience: 'humans' } };
  const document = listen({ documentElement: root, hidden: false, head: { append() {} }, body: { append() {} }, createElement: element, querySelector: name => name === '.desktop-background' ? background : shell, querySelectorAll: () => [pageWindow] });
  background.after = () => {};
  const media = listen({ matches: reduced });
  const context = { document, window: { addEventListener: (name, fn) => events.set(name, fn) }, matchMedia: () => media,
    localStorage: { getItem: key => { if (blocked) throw Error('blocked'); return stored.get(key); }, setItem: (key, value) => { if (blocked) throw Error('blocked'); stored.set(key, value); } },
    MutationObserver: class { observe() {} disconnect() {} }, AbortController, Date, Math, fetch: transport, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    requestAnimationFrame(fn) { const id = ++sequence;frames.set(id, fn);return id; }, cancelAnimationFrame: id => frames.delete(id),
    setTimeout(fn) { const id = ++sequence;timers.set(id, fn);return id; }, clearTimeout: id => timers.delete(id),
  };
  const source = readFileSync(new URL('../src/scripts/weather.mjs', import.meta.url), 'utf8').replace(/^export /gm, '');
  runInNewContext(source, context);context.initDesktopWeather(menu);
  return { root, menu, panel, fields, stored, frames, timers, events, media, all, canvases: () => all.filter(el => el.tag === 'canvas' && !el.removed) };
}

test('stop cancels pending automatic weather and a late reply cannot reactivate the theme', async () => {
  let release;
  const page = desktop({ transport: () => new Promise(resolve => { release = resolve; }) });
  page.fields['[data-weather-stop]'].events.get('click')();
  release(Response.json({ theme: 'rain', expiresAt: Date.now() + 1800000 }));
  await new Promise(setImmediate);
  assert.equal(page.stored.get('lc-desktop-weather'), 'off');
  assert.equal(page.root.dataset.desktopWeather, undefined);
  assert.equal(page.canvases().length, 0);
  assert.equal(page.frames.size, 0);
});

test('manual themes respect reduced motion, stop completely, and detach from agent view', async () => {
  const page = desktop({ theme: 'snow', reduced: true });
  assert.equal(page.root.dataset.desktopWeather, 'snow');
  assert.equal(page.canvases().length, 2);
  for (const [id, fn] of page.frames) { page.frames.delete(id);fn(100); }
  assert.equal(page.frames.size, 0, 'reduced motion schedules no animation loop');
  page.root.dataset.audience = 'agents';page.events.get('lc:audience-change')();
  assert.equal(page.canvases().length, 0);
  assert.equal(page.root.dataset.desktopWeather, undefined);
  page.root.dataset.audience = 'humans';page.events.get('lc:audience-change')();
  assert.equal(page.root.dataset.desktopWeather, 'snow');
  page.fields['[data-weather-stop]'].events.get('click')();
  assert.equal(page.canvases().length, 0);
  assert.equal(page.frames.size, 0);
  assert.equal(page.stored.get('lc-desktop-weather'), 'off');
  const blocked = desktop({ blocked: true });await new Promise(setImmediate);
  assert.equal(blocked.root.dataset.desktopWeather, 'rain');
});

test('cold-start weather waits for page load, the delay and idle time, and skips agent assets', async () => {
  const source = readFileSync(new URL('../src/scripts/desktop-view.mjs', import.meta.url), 'utf8');
  const start = source.indexOf("if (typeof document !== 'undefined') {");
  const end = source.indexOf("  document.addEventListener('click', switchView);", start);
  for (const audience of ['humans', 'agents']) {
    const windowEvents = new Map(), timers = [], idle = [], imports = [];
    const context = {
      document: { documentElement: { dataset: { audience, siteView: 'desktop' } }, addEventListener() {}, querySelector: () => audience === 'humans' ? { dataset: { weather: '/_astro/weather.mjs /_astro/weather.css' } } : null },
      window: { addEventListener: (name, fn) => windowEvents.set(name, fn), requestIdleCallback: fn => { idle.push(fn); return 1; } },
      setTimeout: (fn, delay) => { timers.push({ fn, delay }); }, console,
      loadModule: async path => { imports.push(path); return { initDesktopWeather() {} }; },
    };
    runInNewContext(source.slice(start, end).replace('import(', 'loadModule(') + '\n}', context);
    assert.equal(imports.length, 0);
    assert.equal(timers.length, 0);
    windowEvents.get('load')();
    assert.equal(timers[0].delay, 1500);
    assert.equal(imports.length, 0);
    timers[0].fn();assert.equal(imports.length, 0);
    idle[0]();await new Promise(setImmediate);
    assert.equal(imports.length, audience === 'humans' ? 1 : 0);
  }
});
