import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { initMyCloud, myCloudURL, probeMyCloud } from '../src/scripts/my-cloud.mjs';
import { consoleQuickStart } from '../src/utils/quickstart.mjs';
import { initCopyButtons } from '../src/scripts/copy-buttons.mjs';

const contract = JSON.parse(readFileSync(new URL('../src/data/docs-contract.snapshot.json', import.meta.url), 'utf8'));
const settle = () => new Promise(setImmediate);

function dialogHarness(t) {
  const listeners = new Map();
  const element = (name) => ({ addEventListener(event, handler) { listeners.set(name + ':' + event, handler); } });
  const link = { ...element('link'), href: myCloudURL, dataset: { setupCommand: consoleQuickStart(contract), setupGuide: '/docs/#install-the-cli', myCloudStyles: '/my-cloud.css', myCloudScript: '/_astro/my-cloud.mjs', copyScript: '/_astro/copy-buttons.mjs' } };
  const code = {}, copy = { dataset: {} }, openLink = { classList: { remove() { this.running = false; }, toggle(_, value) { this.running = value; } } }, guide = {};
  const status = { textContent: '' }, setup = { hidden: true }, retry = element('retry');
  const dialog = { ...element('dialog'), dataset: {}, open: false,
    showModal() { this.open = true; },
    querySelector(selector) { return ({ '[data-my-cloud-status]': status, '[data-my-cloud-setup]': setup, '[data-my-cloud-retry]': retry, 'code': code, '.copy-btn': copy, '[data-my-cloud-open]': openLink, '[data-my-cloud-guide]': guide })[selector]; },
    querySelectorAll() { return []; },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    head: { append() {} }, createElement() { return {}; },
    querySelector(selector) { return selector === '[data-my-cloud]' ? link : dialog; },
  } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  const click = (overrides = {}) => {
    let prevented = false;
    listeners.get('link:click')({ button: 0, preventDefault() { prevented = true; }, ...overrides });
    return prevented;
  };
  return { listeners, click, dialog, status, setup, retry, code, copy, link, openLink };
}

test('My cloud probes the fixed console without cookies, cache, or referrer using browser-compatible no-cors options', async (t) => {
  const controller = new AbortController();
  const fetch = t.mock.method(globalThis, 'fetch', async () => ({ type: 'opaque', ok: false }));
  assert.equal(await probeMyCloud(controller.signal), true, 'opaque proves a response, not HTTP success or LocalCloud identity');
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, myCloudURL);
  assert.equal(url, 'http://localhost:5380/');
  assert.deepEqual(options, { method: 'HEAD', mode: 'no-cors', credentials: 'omit', cache: 'no-store', redirect: 'follow', referrerPolicy: 'no-referrer', targetAddressSpace: 'loopback', signal: controller.signal });
});

test('network rejection, blocked access, and readable HTTP errors do not claim a running cloud', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  assert.equal(await probeMyCloud(), false);
  fetch.mock.mockImplementation(async () => ({ type: 'basic', ok: false }));
  assert.equal(await probeMyCloud(), false);
});

test('a responding console opens the reserved tab without showing setup', async (t) => {
  const h = dialogHarness(t);
  t.mock.method(globalThis, 'fetch', async () => ({ type: 'basic', ok: true }));
  let destination;
  const tab = { closed: false, location: { replace(url) { destination = url; } }, close() { assert.fail('running tab must stay open'); } };
  await initMyCloud(() => assert.fail('no dialog copy controls needed'))({ detail: { tab } });
  assert.equal(destination, myCloudURL);
  assert.equal(h.dialog.open, false);
});

test('the dialog appears only after a failed probe and retry confirms a responding console', async (t) => {
  const h = dialogHarness(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('blocked'); });
  const open = initMyCloud(() => {});
  initMyCloud(() => {});
  assert.equal(fetch.mock.callCount(), 0, 'no background localhost probing');
  assert.equal(h.code.textContent, h.link.dataset.setupCommand);
  assert.equal(h.copy.dataset.copy, h.link.dataset.setupCommand);
  const tab = { close() { this.closed = true; } };
  const checking = open({ detail: { tab } });
  assert.equal(h.dialog.open, false);
  assert.equal(h.retry.disabled, true);
  await checking;
  assert.equal(tab.closed, true);
  assert.equal(h.dialog.open, true);
  assert.equal(h.setup.hidden, false);
  assert.match(h.status.textContent, /Looks like.*container isn’t running/);
  assert.equal(h.retry.disabled, false);
  fetch.mock.mockImplementation(async () => ({ type: 'opaque' }));
  await h.listeners.get('retry:click')();
  assert.equal(h.setup.hidden, true);
  assert.match(h.status.textContent, /responding at localhost:5380/);
  assert.doesNotMatch(h.status.textContent, /ready|healthy/);
  assert.equal(h.openLink.classList.running, true);
  assert.equal(h.openLink.textContent, '✓ Working now · Open console ↗');
  fetch.mock.mockImplementation(async () => ({ type: 'basic', ok: false }));
  await h.listeners.get('retry:click')();
  assert.equal(h.openLink.classList.running, false);
  assert.equal(h.openLink.textContent, 'Open console ↗');
});

test('popup blocking leaves a direct console action with success feedback', async (t) => {
  const h = dialogHarness(t);
  t.mock.method(globalThis, 'fetch', async () => ({ type: 'opaque' }));
  await initMyCloud(() => {})({ detail: { tab: null } });
  assert.equal(h.dialog.open, true);
  assert.equal(h.setup.hidden, true);
  assert.equal(h.openLink.href, myCloudURL);
  assert.equal(h.openLink.classList.running, true);
});

test('setup keeps copy inside the command box and uses a focused popup without a titlebar', (t) => {
  const h = dialogHarness(t);
  initMyCloud(() => {});
  assert.match(h.dialog.innerHTML, /class="my-cloud-command">\s*<pre[\s\S]*?<\/pre>\s*<button[^>]*class="copy-btn"/);
  assert.doesNotMatch(h.dialog.innerHTML, /my-cloud-titlebar|Close window/);
});

test('a stalled local request times out and offers setup', async (t) => {
  const h = dialogHarness(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const open = initMyCloud(() => {});
  open();
  t.mock.timers.tick(8000);
  await settle();
  assert.equal(h.retry.disabled, false);
  assert.equal(h.setup.hidden, false);
  assert.equal(h.dialog.open, true);
});

test('closing or canceling aborts the probe and a stale result cannot overwrite a reopened dialog', async (t) => {
  const h = dialogHarness(t);
  const requests = [];
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve) => requests.push({ signal, resolve })));
  const open = initMyCloud(() => {});
  open();
  h.listeners.get('dialog:cancel')();
  assert.equal(requests[0].signal.aborted, true);
  h.dialog.open = false;
  h.listeners.get('dialog:close')();
  open();
  requests[1].resolve({ type: 'basic', ok: false });
  await settle();
  requests[0].resolve({ type: 'opaque' });
  await settle();
  assert.equal(h.setup.hidden, false);
  assert.match(h.status.textContent, /Looks like/);
});

test('unsupported dialog browsers retain the direct console link without probing', (t) => {
  const h = dialogHarness(t);
  h.dialog.showModal = undefined;
  initMyCloud(() => {});
  assert.equal(h.listeners.has('link:click'), false);
});

test('the launcher loads its dialog once on ordinary clicks and preserves modified clicks', async (t) => {
  const h = dialogHarness(t);
  const source = readFileSync(new URL('../src/components/MyCloudLauncher.astro', import.meta.url), 'utf8').match(/<script is:inline data-critical-bootstrap>([\s\S]*?)<\/script>/)[1];
  const script = transformSync(source, { loader: 'js' }).code;
  let loads = 0, opens = 0, tabs = 0;
  const tab = { opener: {} };
  h.dialog.dispatchEvent = (event) => { assert.equal(event.type, 'lc:my-cloud-open'); assert.equal(event.detail.tab, tab); assert.equal(tab.opener, null); opens++; };
  document.createElement = () => ({ remove() {} });
  document.head.append = (asset) => {
    assert.ok(asset.src.startsWith('http://127.0.0.1:4325/_astro/'), 'script URLs use the page host, not a source-map URL');
    loads++; queueMicrotask(() => asset.onload());
  };
  runInNewContext(script, { document, URL, setTimeout, clearTimeout, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: { open(url, target) { assert.equal(url, undefined); assert.equal(target, undefined); tabs++; return tab; } },
    location: { href: 'http://127.0.0.1:4325/', origin: 'http://127.0.0.1:4325', assign() { assert.fail('no fallback expected'); } },
  });
  assert.equal(loads, 0);
  assert.equal(h.click({ ctrlKey: true }), false);
  assert.equal(loads, 0);
  assert.equal(h.click(), true);
  assert.equal(tabs, 1, 'tab is reserved synchronously before loading or checking');
  h.click();
  assert.equal(tabs, 1, 'duplicate clicks during loading share the same tab');
  await settle();
  assert.equal(loads, 2); assert.equal(opens, 1);
  h.click(); await settle();
  assert.equal(loads, 2); assert.equal(opens, 2);
});

test('copy controls also initialize after desktop navigation and retry a failed asset load', () => {
  const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const source = [...layout.matchAll(/<script\b[^>]*data-critical-bootstrap[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(code => code.includes('.copy-btn[data-copy-script]'));
  let mounted = false, asset = '/_astro/copy-buttons.js';
  const loaded = [], listeners = new Map();
  const document = {
    querySelector(selector) { return selector === '[data-desktop-shell]' ? { dataset: { base: '/' } }
      : mounted ? { dataset: { copyScript: asset } } : null; },
    createElement() { return { remove() {} }; }, head: { append(script) { loaded.push(script); } },
    addEventListener(event, handler) { listeners.set(event, handler); },
  };
  runInNewContext(source, { document, URL, location: { href: 'http://127.0.0.1:4325/', origin: 'http://127.0.0.1:4325' } });
  assert.equal(loaded.length, 0);
  mounted = true; listeners.get('astro:page-load')();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].src, 'http://127.0.0.1:4325/_astro/copy-buttons.js');
  listeners.get('astro:page-load')(); assert.equal(loaded.length, 1);
  loaded[0].onerror(); listeners.get('astro:page-load')(); assert.equal(loaded.length, 2);
  loaded[1].onerror(); asset = 'https://evil.test/copy-buttons.js';
  listeners.get('astro:page-load')(); assert.equal(loaded.length, 2);
});

test('shared copy behavior binds once and reports a copy only after clipboard success', async () => {
  let handler, bindings = 0, copiedEvents = 0, blocked = false;
  const label = { textContent: 'Copy' };
  const button = { dataset: { copy: 'localcloud start --local-only' }, title: '',
    getAttribute() { return 'Copy commands'; }, querySelector() { return label; },
    addEventListener(_, callback) { handler = callback; bindings++; },
    dispatchEvent() { copiedEvents++; }, classList: { toggle(_, value) { this.copied = value; }, remove() {} },
  };
  const scope = { querySelectorAll(selector) { return selector === '.copy-btn' ? [button] : []; } };
  const context = { scope, resetTimers: new WeakMap(), CustomEvent: class {},
    window: { clearTimeout() {}, setTimeout() { return 1; } },
    navigator: { clipboard: { async writeText(text) { assert.equal(text, button.dataset.copy); if (blocked) throw Error('denied'); } } },
  };
  runInNewContext('(' + initCopyButtons.toString() + ')(scope)', context);
  runInNewContext('(' + initCopyButtons.toString() + ')(scope)', context);
  assert.equal(bindings, 1);
  await handler();
  assert.equal(copiedEvents, 1); assert.equal(label.textContent, 'Copied!');
  blocked = true; await handler();
  assert.equal(copiedEvents, 1); assert.equal(label.textContent, 'Copy failed');
  assert.equal(button.classList.copied, false);
});

test('quick setup contains only Homebrew installation and the requested debug start command', () => {
  const script = consoleQuickStart(contract);
  assert.equal(script, 'brew install LocalGCloud/tap/localcloud\nlc start --debug');
  assert.equal(spawnSync('/bin/sh', ['-n'], { input: script }).status, 0);
});
