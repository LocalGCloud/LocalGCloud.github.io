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

function permissionHarness(t, state) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const permission = { state };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userActivation: { isActive: true }, permissions: {
    async query() { if (!permission.state) throw new TypeError('Unsupported permission'); return permission; },
  } } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator; });
  return permission;
}

function dialogHarness(t, permission = 'granted') {
  permissionHarness(t, permission);
  const listeners = new Map();
  const element = (name) => ({ addEventListener(event, handler) { listeners.set(name + ':' + event, handler); } });
  const link = { ...element('link'), href: myCloudURL, dataset: { setupCommand: consoleQuickStart(contract), setupGuide: '/docs/#install-the-cli', myCloudStyles: '/my-cloud.css', myCloudScript: '/_astro/my-cloud.mjs', copyScript: '/_astro/copy-buttons.mjs' } };
  const code = {}, copy = { dataset: {} }, anchor = {}, openLink = { classList: { remove() { this.running = false; }, toggle(_, value) { this.running = value; } } }, guide = {};
  const status = { textContent: '' }, setup = { hidden: true, open: false }, retry = element('retry');
  const dialog = { ...element('dialog'), dataset: {}, open: false,
    showModal() { this.open = true; },
    querySelector(selector) { return ({ '[data-my-cloud-status]': status, '[data-my-cloud-setup]': setup, '[data-my-cloud-retry]': retry, 'code': code, 'pre': code, 'a': anchor, '.copy-btn': copy, '[data-my-cloud-open]': openLink, '[data-my-cloud-guide]': guide })[selector]; },
    querySelectorAll() { return []; },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    head: { append() {} }, createElement() { return {}; },
    querySelector(selector) { return selector === '[data-my-cloud]' ? link : dialog; },
  } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  const opens = [], tabs = [], popup = { blocked: false };
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    open(url) { opens.push(url); if (popup.blocked) return null; const tab = { opener: {} }; tabs.push(tab); return tab; },
  } });
  t.after(() => { if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete globalThis.window; });
  const click = (overrides = {}) => {
    let prevented = false;
    listeners.get('link:click')({ button: 0, preventDefault() { prevented = true; }, ...overrides });
    return prevented;
  };
  return { listeners, click, dialog, status, setup, retry, code, copy, link, openLink, anchor, opens, tabs, popup };
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
  permissionHarness(t, 'granted');
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  assert.equal(await probeMyCloud(), false);
  fetch.mock.mockImplementation(async () => ({ type: 'basic', ok: false }));
  assert.equal(await probeMyCloud(), false);
});

test('denied localhost permission explains the blocked check without probing or opening the console, and keeps setup collapsed', async (t) => {
  const h = dialogHarness(t, 'denied');
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('denied access must not be probed'));
  assert.equal(await probeMyCloud(), null);
  await initMyCloud(() => {})();
  assert.deepEqual(h.opens, []);
  assert.equal(h.dialog.open, true);
  assert.deepEqual([h.setup.hidden, h.setup.open], [false, false], 'when the browser cannot check, setup stays one click away instead of pushed open');
  assert.equal(fetch.mock.callCount(), 0);
});

test('a first-use permission rejection is inconclusive, rather than an offline cloud', async (t) => {
  const permission = permissionHarness(t, 'prompt');
  t.mock.method(globalThis, 'fetch', async () => { permission.state = 'denied'; throw new TypeError('Failed to fetch'); });
  assert.equal(await probeMyCloud(), null);
});

test('browsers without the permission API do not treat blocked probes as an offline cloud', async (t) => {
  permissionHarness(t, undefined);
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  assert.equal(await probeMyCloud(), null);
});

for (const permission of ['prompt', undefined]) {
  test(`an inconclusive ${permission || 'unsupported'} permission check explains itself instead of navigating, and keeps setup collapsed`, async (t) => {
    const h = dialogHarness(t, permission === undefined ? null : permission);
    t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
    await initMyCloud(() => {})();
    assert.deepEqual(h.opens, [], 'no response means no automatic navigation');
    assert.equal(h.dialog.open, true);
    assert.deepEqual([h.setup.hidden, h.setup.open], [false, false], 'when the browser cannot check, setup stays one click away instead of pushed open');
    assert.match(h.status.textContent, /browser couldn’t check localhost/);
  });
}

test('a first-use localhost prompt shows progress while it waits, then confirms the console without opening a tab', async (t) => {
  const h = dialogHarness(t, 'prompt');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const requests = [];
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve, reject) => {
    requests.push({ resolve }); signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const checking = initMyCloud(() => {})();
  await settle();
  assert.equal(h.dialog.open, false, 'a quick answer never flashes the dialog');
  assert.deepEqual(h.opens, [], 'nothing opens, and focus stays here, until the console answers');
  t.mock.timers.tick(400);
  assert.equal(h.dialog.open, true, 'a slow check, such as an open browser prompt, shows its progress');
  assert.match(h.status.textContent, /Checking localhost:5380/);
  assert.equal(h.retry.disabled, true);
  requests[0].resolve({ type: 'opaque' });
  await checking;
  assert.deepEqual(h.opens, [], 'an answer after the dialog appeared stays in the dialog');
  assert.equal(h.setup.hidden, true);
  assert.match(h.status.textContent, /responding at localhost:5380/);
  assert.equal(h.openLink.classList.running, true);
});

test('a first-use localhost prompt is given time to be answered before the check gives up', async (t) => {
  const h = dialogHarness(t, 'prompt');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let aborted = false;
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
  }));
  initMyCloud(() => {})();
  await settle();
  t.mock.timers.tick(8000);
  await settle();
  assert.equal(aborted, false, 'the usual 8 second limit would hide the prompt before it is answered');
  t.mock.timers.tick(22000);
  await settle();
  assert.equal(aborted, true);
  assert.equal(h.retry.disabled, false);
  assert.deepEqual([h.setup.hidden, h.setup.open], [false, false], 'when the browser cannot check, setup stays one click away instead of pushed open');
});

test('an older browser permission name still recognizes denied local access', async (t) => {
  permissionHarness(t, 'denied');
  navigator.permissions.query = async ({ name }) => {
    if (name === 'loopback-network') throw new TypeError('Unsupported permission');
    assert.equal(name, 'local-network-access');
    return { state: 'denied' };
  };
  assert.equal(await probeMyCloud(), null);
});

test('blocked retries keep a manual console action and collapsed setup, without a false green check', async (t) => {
  const h = dialogHarness(t, 'denied');
  await initMyCloud(() => {})();
  await h.listeners.get('retry:click')();
  assert.deepEqual([h.setup.hidden, h.setup.open], [false, false], 'when the browser cannot check, setup stays one click away instead of pushed open');
  assert.match(h.status.textContent, /browser couldn’t check localhost/);
  assert.equal(h.openLink.classList.running, false);
  assert.equal(h.openLink.textContent, 'Open console ↗');
});

test('a responding console opens in a new tab without showing the dialog or setup', async (t) => {
  const h = dialogHarness(t);
  t.mock.method(globalThis, 'fetch', async () => ({ type: 'basic', ok: true }));
  await initMyCloud(() => assert.fail('no dialog copy controls needed'))();
  assert.deepEqual(h.opens, [myCloudURL]);
  assert.equal(h.tabs[0].opener, null);
  assert.equal(h.dialog.open, false);
});

test('no tab opens, and the dialog stays hidden, while a quick check is still running', async (t) => {
  const h = dialogHarness(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let answer;
  t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { answer = resolve; }));
  const checking = initMyCloud(() => {})();
  await settle();
  t.mock.timers.tick(399);
  assert.deepEqual(h.opens, []);
  assert.equal(h.dialog.open, false);
  answer({ type: 'opaque' });
  await checking;
  t.mock.timers.tick(10);
  assert.deepEqual(h.opens, [myCloudURL]);
  assert.equal(h.dialog.open, false, 'the dialog timer is cancelled once the console answers');
});

test('the dialog appears only after a failed probe and retry confirms a responding console', async (t) => {
  const h = dialogHarness(t);
  let block;
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise((_, reject) => { block = () => reject(new TypeError('blocked')); }));
  const open = initMyCloud(() => {});
  initMyCloud(() => {});
  assert.equal(fetch.mock.callCount(), 0, 'no background localhost probing');
  assert.equal(h.code.textContent, h.link.dataset.setupCommand);
  assert.equal(h.copy.dataset.copy, h.link.dataset.setupCommand);
  const checking = open();
  await settle();
  assert.equal(h.dialog.open, false);
  assert.equal(h.retry.disabled, true);
  block();
  await checking;
  assert.deepEqual(h.opens, [], 'a console that is not running never gets a blank tab');
  assert.equal(h.dialog.open, true);
  assert.deepEqual([h.setup.hidden, h.setup.open], [false, true], 'a console confirmed absent opens setup');
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
  h.popup.blocked = true;
  t.mock.method(globalThis, 'fetch', async () => ({ type: 'opaque' }));
  await initMyCloud(() => {})();
  assert.equal(h.opens.length, 1);
  assert.equal(h.dialog.open, true);
  assert.equal(h.setup.hidden, true);
  assert.equal(h.openLink.href, myCloudURL);
  assert.equal(h.openLink.classList.running, true);
});

test('an expired click skips the popup and leaves the direct console action', async (t) => {
  const h = dialogHarness(t);
  navigator.userActivation.isActive = false;
  t.mock.method(globalThis, 'fetch', async () => ({ type: 'opaque' }));
  await initMyCloud(() => {})();
  assert.deepEqual(h.opens, [], 'a popup without a recent click would only trigger a blocked-popup notice');
  assert.equal(h.dialog.open, true);
  assert.equal(h.openLink.classList.running, true);
});

test('a second click during a running check keeps the first check, and its browser prompt, alive', async (t) => {
  const h = dialogHarness(t);
  const requests = [];
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve, reject) => {
    requests.push({ signal, resolve }); signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const open = initMyCloud(() => {});
  const first = open();
  await settle();
  await open();
  assert.equal(requests.length, 1, 'a repeated click must not abort and re-issue the probe');
  assert.equal(requests[0].signal.aborted, false);
  requests[0].resolve({ type: 'opaque' });
  await first;
  assert.deepEqual(h.opens, [myCloudURL]);
});

test('closing the dialog mid-check opens no tab and leaves the dialog closed', async (t) => {
  const h = dialogHarness(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const checking = initMyCloud(() => {})();
  await settle();
  t.mock.timers.tick(400);
  assert.equal(h.dialog.open, true);
  h.dialog.open = false;
  h.listeners.get('dialog:close')();
  await checking;
  t.mock.timers.tick(1000);
  assert.deepEqual(h.opens, []);
  assert.equal(h.dialog.open, false, 'a cancelled check never reopens the dialog');
});

test('setup stays collapsed until absence is confirmed', async (t) => {
  const h = dialogHarness(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('refused'); });
  await initMyCloud(() => {})();
  assert.deepEqual([h.setup.hidden, h.setup.open], [false, true]);
  fetch.mock.mockImplementation(async () => ({ type: 'opaque' }));
  await h.listeners.get('retry:click')();
  assert.deepEqual([h.setup.hidden, h.setup.open], [true, false]);
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
  await settle();
  t.mock.timers.tick(8000);
  await settle();
  assert.equal(h.retry.disabled, false);
  assert.deepEqual([h.setup.hidden, h.setup.open], [false, true], 'a console confirmed absent opens setup');
  assert.equal(h.dialog.open, true);
});

test('closing or canceling aborts the probe and a stale result cannot overwrite a reopened dialog', async (t) => {
  const h = dialogHarness(t);
  const requests = [];
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve) => requests.push({ signal, resolve })));
  const open = initMyCloud(() => {});
  open();
  await settle();
  h.listeners.get('dialog:cancel')();
  assert.equal(requests[0].signal.aborted, true);
  h.dialog.open = false;
  h.listeners.get('dialog:close')();
  open();
  await settle();
  requests[1].resolve({ type: 'basic', ok: false });
  await settle();
  requests[0].resolve({ type: 'opaque' });
  await settle();
  assert.deepEqual([h.setup.hidden, h.setup.open], [false, true], 'a console confirmed absent opens setup');
  assert.match(h.status.textContent, /Looks like/);
});

test('unsupported dialog browsers retain the direct console link without probing', (t) => {
  const h = dialogHarness(t);
  h.dialog.showModal = undefined;
  initMyCloud(() => {});
  assert.equal(h.listeners.has('link:click'), false);
});

const launcherSource = () => readFileSync(new URL('../src/components/MyCloudLauncher.astro', import.meta.url), 'utf8').match(/<script is:inline data-critical-bootstrap>([\s\S]*?)<\/script>/)[1];
const launcherContext = (h, overrides) => ({ document, URL, setTimeout, clearTimeout,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
  window: { open() { assert.fail('the launcher never opens a tab before the console has answered'); } },
  location: { href: 'http://127.0.0.1:4325/', origin: 'http://127.0.0.1:4325', assign() { assert.fail('no fallback expected'); } },
  ...overrides,
});

for (const assets of ['_astro/', 'src/scripts/']) {
test(`the launcher loads ${assets} assets once, opens no tab itself, and preserves modified clicks`, async (t) => {
  const h = dialogHarness(t);
  h.link.dataset.myCloudAssets = assets;
  h.link.dataset.myCloudScript = '/' + assets + 'my-cloud.mjs';
  h.link.dataset.copyScript = '/' + assets + 'copy-buttons.mjs';
  const script = transformSync(launcherSource(), { loader: 'js' }).code;
  let loads = 0, opens = 0;
  h.dialog.dispatchEvent = (event) => { assert.equal(event.type, 'lc:my-cloud-open'); opens++; };
  document.createElement = () => ({ remove() {} });
  document.head.append = (asset) => {
    assert.ok(asset.src.startsWith('http://127.0.0.1:4325/' + assets), 'script URLs use the page host, not a source-map URL');
    loads++; queueMicrotask(() => asset.onload());
  };
  runInNewContext(script, launcherContext(h));
  assert.equal(loads, 0);
  for (const modified of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    assert.equal(h.click(modified), false, 'modified clicks keep the native link: ' + Object.keys(modified));
  }
  assert.equal(loads, 0);
  assert.equal(h.click(), true);
  h.click();
  await settle();
  assert.equal(loads, 2); assert.equal(opens, 1, 'duplicate clicks during loading start one check');
  h.click(); await settle();
  assert.equal(loads, 2); assert.equal(opens, 2);
});

}

test('hovering, focusing or touching the link loads the assets ahead of the click, once, without checking anything', async (t) => {
  const h = dialogHarness(t);
  let loads = 0, opens = 0;
  h.dialog.dispatchEvent = () => { opens++; };
  document.createElement = () => ({ remove() {} });
  document.head.append = (asset) => { loads++; queueMicrotask(() => asset.onload()); };
  runInNewContext(launcherSource(), launcherContext(h));
  for (const type of ['pointerenter', 'focus', 'touchstart']) {
    h.listeners.get('link:' + type)(); await settle();
  }
  assert.equal(loads, 2, 'both assets load once, however the link is approached');
  assert.equal(opens, 0, 'approaching the link never starts a localhost check');
  h.click(); await settle();
  assert.equal(loads, 2, 'the click reuses the assets that are already loaded');
  assert.equal(opens, 1);
});

test('a failed hover load is retried by the click rather than left to fail silently', async (t) => {
  const h = dialogHarness(t);
  let loads = 0, opens = 0, fail = true;
  h.dialog.dispatchEvent = () => { opens++; };
  document.createElement = () => ({ remove() {} });
  document.head.append = (asset) => { loads++; queueMicrotask(() => fail ? asset.onerror() : asset.onload()); };
  runInNewContext(launcherSource(), launcherContext(h));
  h.listeners.get('link:pointerenter')(); await settle();
  assert.equal(h.dialog.open, false, 'a failed background load stays quiet');
  fail = false;
  h.click(); await settle();
  assert.equal(opens, 1);
  assert.equal(h.dialog.open, false);
});

for (const failedAsset of ['my-cloud', 'copy-buttons']) {
  test(`a failed ${failedAsset} asset never bypasses the localhost check`, async (t) => {
    const h = dialogHarness(t);
    let checks = 0, copies = 0;
    h.dialog.dispatchEvent = () => { checks++; };
    document.createElement = () => ({ remove() {} });
    document.head.append = (asset) => {
      if (!asset.src) return;
      if (asset.src.includes('copy-buttons')) copies++;
      queueMicrotask(() => asset.src.includes(failedAsset) ? asset.onerror() : asset.onload());
    };
    runInNewContext(launcherSource(), launcherContext(h, { location: { href: 'http://127.0.0.1:4325/', origin: 'http://127.0.0.1:4325', assign() { assert.fail('never navigate on an asset error'); } } }));
    h.click(); await settle();
    if (failedAsset === 'my-cloud') {
      assert.equal(h.dialog.open, true, 'a failed module load still offers setup');
      assert.equal(checks, 0);
      assert.equal(h.code.textContent, h.link.dataset.setupCommand);
      assert.equal(h.anchor.href, myCloudURL, 'a visitor whose console is already running can still open it');
      h.click(); await settle();
      assert.equal(copies, 2, 'failed modules can load again');
    } else {
      assert.equal(checks, 1, 'optional copy controls cannot bypass or prevent the localhost check');
    }
  });
}

test('copy controls also initialize after desktop navigation and retry a failed asset load', () => {
  const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const source = [...layout.matchAll(/<script\b[^>]*data-critical-bootstrap[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(code => code.includes('.copy-btn[data-copy-script]'));
  let mounted = false, asset = '/_astro/copy-buttons.js';
  const loaded = [], listeners = new Map();
  const document = { documentElement: {dataset:{audience:'humans'}},
    querySelector(selector) { return selector === '[data-desktop-shell]' ? { dataset: { base: '/' } }
      : mounted ? { dataset: { copyScript: asset } } : null; },
    createElement() { return { remove() {} }; }, head: { append(script) { loaded.push(script); } },
    addEventListener(event, handler) { listeners.set(event, handler); },
  };
  runInNewContext(source, { document, window: {addEventListener(){}}, URL, location: { href: 'http://127.0.0.1:4325/', origin: 'http://127.0.0.1:4325' } });
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
