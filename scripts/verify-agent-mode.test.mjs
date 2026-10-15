import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { renderMarkdownTwin } from '../src/utils/render-markdown-twin.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const interactions = read('../src/scripts/site-interactions.mjs');

function audiencePage({ audience = 'agents', storageBlocked = false } = {}) {
  const events = new Map(), windowEvents = new Map(), stored = new Map();
  const location = new URL('https://local.cloud/?view=classic&audience=' + audience);
  const state = { lcDesktop: true, lcEntry: 'entry:4', lcScroll: 240 };
  const switchButton = { dataset: {}, setAttribute(name, value) { this[name] = value; } };
  const link = href => ({ href, writes:0, getAttribute() { return this.href; }, hasAttribute() { return false; },
    get origin() { return new URL(this.href, location.href).origin; },
    get pathname() { return new URL(this.href, location.href).pathname; },
    get search() { return new URL(this.href, location.href).search; },
    set search(value) { const url = new URL(this.href, location.href); url.search = value; this.href = url.href; this.writes++; } });
  const links = [link('/docs/?topic=sdk#example'), link('/services/'), link('/ai/agents.md'), link('https://example.com/'), link('#services')];
  const document = { documentElement: { dataset: { audience } }, getElementById: () => switchButton,
    querySelectorAll: selector => selector === 'a[href]' ? links : [], addEventListener: (name, fn) => events.set(name, fn) };
  const context = { document, URL, URLSearchParams, Event, location, history: { state, replaceState(next, _, href) { this.state = next; location.href = href; } },
    localStorage: { setItem(key, value) { if (storageBlocked) throw Error('blocked'); stored.set(key, value); } },
    window: { addEventListener: (name, fn) => windowEvents.set(name, fn), dispatchEvent: event => windowEvents.get(event.type)?.(event) } };
  runInNewContext(interactions, context);
  const choose = targetAudience => events.get('click')({ target: { closest: () => ({ dataset: { targetAudience } }) } });
  return { context, link, links, events, windowEvents, stored, switchButton, choose, state };
}

test('agent audience persists on HTML links including new tabs without altering downloads or external URLs', () => {
  const { links, switchButton } = audiencePage();
  assert.match(links[0].href, /audience=agents#example$/);
  assert.match(links[0].href, /topic=sdk/);
  assert.match(links[1].href, /audience=agents$/);
  assert.equal(links[2].href, '/ai/agents.md');
  assert.equal(links[3].href, 'https://example.com/');
  assert.equal(links[4].href, '#services');
  assert.equal(switchButton['aria-checked'], 'true');
});

test('switching back to humans cleans agent links and preserves desktop navigation history with storage blocked', () => {
  const page = audiencePage({ storageBlocked: true });
  page.choose('humans');
  assert.equal(page.context.history.state, page.state);
  assert.equal(page.context.location.searchParams.get('audience'), 'humans');
  assert.equal(page.context.location.searchParams.get('view'), 'classic');
  assert.equal(page.context.document.documentElement.dataset.audience, 'humans');
  assert.ok(page.links.every(link => !link.href.includes('audience=agents')));
  assert.equal(page.switchButton['aria-checked'], 'false');
  page.choose('agents');
  assert.equal(page.context.document.documentElement.dataset.audience, 'agents');
});

test('new content mounts and history traversal synchronize audience controls and links', () => {
  const page = audiencePage();
  page.links.push(page.link('/pricing/'));
  page.events.get('astro:page-load')();
  assert.match(page.links.at(-1).href, /audience=agents/);
  page.context.location.href = 'https://local.cloud/docs/?audience=humans';
  page.windowEvents.get('popstate')();
  assert.equal(page.switchButton['aria-checked'], 'false');
});

test('audience synchronization avoids rewriting URLs whose preference is already correct', () => {
  for (const audience of ['humans','agents']) {
    const page = audiencePage({ audience });
    const writes = page.links.map(link => link.writes);
    page.events.get('astro:page-load')();
    assert.deepEqual(page.links.map(link => link.writes), writes);
  }
});

test('an explicit audience URL persists in the pre-paint bootstrap', () => {
  const source = read('../src/layouts/BaseLayout.astro');
  const code = source.slice(source.indexOf('var root = document.documentElement'), source.indexOf('var wide = matchMedia'));
  for (const audience of ['agents', 'humans']) {
    const stored = new Map([['lc-audience', audience === 'agents' ? 'humans' : 'agents']]);
    const root = { dataset: {} };
    runInNewContext(code, { document: { documentElement: root }, location: { search: '?audience=' + audience }, URLSearchParams,
      localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } });
    assert.equal(root.dataset.audience, audience);
    assert.equal(stored.get('lc-audience'), audience);
  }
});

test('Markdown conversion strips agent decoration while retaining technical content and canonical links', () => {
  const html = '<title>LocalCloud</title><link rel="canonical" href="https://local.cloud/"><link rel="alternate" type="text/markdown" href="/index.md"><main><h1>localcloud is cloud for agents.</h1><div data-agent-only>agent eyebrow</div><div data-agent-visual>captcha and terminal</div><div class="field-ribbon__agent">more decoration</div><div class="field-atlas__agent-bar">fake registry</div><p>Use <a href="/docs/">docs</a>.</p><pre><code>localcloud start --local-only</code></pre></main>';
  const markdown = renderMarkdownTwin(html, { route: '/', twin: '/index.md', file: 'index.html' });
  assert.match(markdown, /^# localcloud is cloud for agents\./);
  assert.match(markdown, /https:\/\/local.cloud\/docs\//);
  assert.match(markdown, /```\nlocalcloud start --local-only\n```/);
  assert.doesNotMatch(markdown, /eyebrow|captcha|decoration|fake registry/);
});

test('repeated page lifecycle events do not double-bind the agent puzzle', () => {
  const listeners = new Map();
  const node = () => ({ dataset: {}, classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, addEventListener(name, fn) { const list = listeners.get(this) || []; list.push(fn); listeners.set(this, list); } });
  const card = node(), tiles = Array.from({ length: 9 }, node);
  const grid = { querySelectorAll: () => tiles };
  const controls = Object.fromEntries(['lc-captcha-verify', 'lc-captcha-reset', 'lc-captcha-about', 'lc-captcha-feedback'].map(id => [id, node()]));
  const events = new Map();
  const document = { querySelector: () => card, getElementById: id => id === 'lc-captcha-grid' ? grid : controls[id], addEventListener: (name, fn) => events.set(name, fn) };
  const source = read('../src/components/AgentCaptcha.astro').match(/<script>([\s\S]*?)<\/script>/)[1];
  runInNewContext(transformSync(source, { loader: 'ts' }).code, { document, window: {} });
  events.get('astro:page-load')(); events.get('lc:page-mounted')();
  for (const tile of tiles) assert.equal(listeners.get(tile).length, 1);
  assert.equal(listeners.get(controls['lc-captcha-verify']).length, 1);
});

test('the copy loader accepts the exact local dev module only in development', () => {
  const source = [...read('../src/layouts/BaseLayout.astro').matchAll(/<script\b[^>]*data-critical-bootstrap[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(code => code.includes('.copy-btn[data-copy-script]'));
  for (const [copyDevelopment, asset, expected] of [[true, '/src/scripts/copy-buttons.mjs', 1], [false, '/src/scripts/copy-buttons.mjs', 0], [true, 'https://example.com/copy-buttons.mjs', 0], [true, '/src/scripts/unrelated.mjs', 0], [false, '/_astro/copy-buttons.js', 1]]) {
    const appended = [];
    runInNewContext(source, { copyDevelopment, URL, location: new URL('http://localhost:4321/'), document: {
      querySelector: selector => selector === '[data-desktop-shell]' ? { dataset: { base: '/' } } : { dataset: { copyScript: asset } },
      createElement: () => ({}), head: { append: script => appended.push(script) }, addEventListener() {},
    } });
    assert.equal(appended.length, expected, `${copyDevelopment}: ${asset}`);
  }
});

test('example tabs bind once and support arrow, Home, and End keyboard navigation', () => {
  const tabs = ['setup', 'python', 'config'].map(id => ({ attrs: { 'aria-controls': 'pane-' + id }, events: new Map(), setAttribute(name, value) { this.attrs[name] = value; }, getAttribute(name) { return this.attrs[name]; }, addEventListener(name, fn) { assert.ok(!this.events.has(name)); this.events.set(name, fn); }, focus() { this.focused = true; } }));
  const panes = tabs.map(tab => ({ id: tab.attrs['aria-controls'], hidden: true }));
  const term = { dataset: {}, querySelectorAll: selector => selector === '[role="tab"]' ? tabs : panes };
  const events = new Map();
  const document = { querySelectorAll: () => [term], addEventListener: (name, fn) => events.set(name, fn) };
  const source = read('../src/components/AgentTerminalDaemon.astro').match(/<script>([\s\S]*?)<\/script>/)[1];
  runInNewContext(transformSync(source, { loader: 'ts' }).code, { document });
  events.get('astro:page-load')(); events.get('lc:page-mounted')();
  function key(index, key, expected) {
    let prevented = false;
    tabs[index].events.get('keydown')({ key, preventDefault() { prevented = true; } });
    assert.equal(prevented, true); assert.equal(tabs[expected].attrs['aria-selected'], 'true');
    assert.equal(tabs.filter(tab => tab.tabIndex === 0).length, 1);
    assert.equal(panes.filter(pane => !pane.hidden).length, 1); assert.equal(panes[expected].hidden, false);
  }
  key(0, 'ArrowLeft', 2); key(2, 'Home', 0); key(0, 'End', 2); key(2, 'ArrowRight', 0);
});
