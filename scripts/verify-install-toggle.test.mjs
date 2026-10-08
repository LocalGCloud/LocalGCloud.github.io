import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { initCopyButtons } from '../src/scripts/copy-buttons.mjs';

const { cli } = JSON.parse(readFileSync(new URL('../src/data/docs-contract.snapshot.json', import.meta.url), 'utf8'));

function harness() {
  const listeners = {}, writes = [], timers = new Map();
  const label = { textContent: 'Copy' }, method = { textContent: 'curl' };
  const code = { textContent: cli.homebrewCommand };
  const copy = {
    dataset: { copy: cli.homebrewCommand, analyticsLabel: 'hero-install-homebrew' }, bindings: 0, events: 0,
    getAttribute() { return 'Copy install command'; }, querySelector() { return label; },
    addEventListener(_, handler) { listeners.copy = handler; this.bindings++; },
    dispatchEvent() { this.events++; },
    classList: { toggle(_, value) { this.copied = value; }, remove() { this.copied = false; } },
  };
  const box = { dataset: { installHomebrew: cli.homebrewCommand, installCurl: cli.installCommand },
    querySelector(selector) { return selector === 'code' ? code : copy; } };
  const toggle = {
    dataset: {}, hidden: true, bindings: 0, closest() { return box; }, querySelector() { return method; },
    setAttribute(_, value) { this.ariaLabel = value; },
    addEventListener(_, handler) { listeners.toggle = handler; this.bindings++; },
  };
  const scope = { querySelectorAll(selector) { return selector === '.copy-btn' ? [copy] : [toggle]; } };
  const context = {
    scope, resetTimers: new WeakMap(), CustomEvent: class {},
    navigator: { clipboard: { async writeText(text) { writes.push(text); } } },
    window: { clearTimeout(id) { timers.delete(id); }, setTimeout(callback) { const id = Symbol(); timers.set(id, callback); return id; } },
  };
  const bind = () => runInNewContext('(' + initCopyButtons.toString() + ')(scope)', context);
  bind();
  return { bind, context, listeners, writes, timers, code, copy, toggle, label, method };
}

test('install toggle binds once and copies the visible method in both directions', async () => {
  const h = harness();
  h.bind();
  assert.equal(h.toggle.hidden, false);
  assert.equal(h.toggle.bindings, 1);
  assert.equal(h.copy.bindings, 1);
  await h.listeners.copy();
  assert.equal(h.label.textContent, 'Copied!');
  h.listeners.toggle();
  assert.equal(h.code.textContent, cli.installCommand);
  assert.equal(h.copy.dataset.copy, cli.installCommand);
  assert.equal(h.copy.dataset.analyticsLabel, 'hero-install-script');
  assert.equal(h.toggle.ariaLabel, 'Use Homebrew install command');
  assert.equal(h.method.textContent, 'Brew');
  assert.equal(h.label.textContent, 'Copy');
  assert.equal(h.copy.classList.copied, false);
  assert.equal(h.timers.size, 0);
  await h.listeners.copy();
  h.listeners.toggle();
  assert.equal(h.code.textContent, cli.homebrewCommand);
  assert.equal(h.copy.dataset.analyticsLabel, 'hero-install-homebrew');
  assert.equal(h.toggle.ariaLabel, 'Use curl install command');
  assert.equal(h.method.textContent, 'curl');
  await h.listeners.copy();
  assert.deepEqual(h.writes, [cli.homebrewCommand, cli.installCommand, cli.homebrewCommand]);
});

test('switching methods during a pending copy does not mark the new command copied', async () => {
  const h = harness();
  let complete;
  h.context.navigator.clipboard.writeText = () => new Promise(resolve => { complete = resolve; });
  const pending = h.listeners.copy();
  h.listeners.toggle();
  complete();
  await pending;
  assert.equal(h.code.textContent, cli.installCommand);
  assert.equal(h.label.textContent, 'Copy');
  assert.equal(h.copy.classList.copied, false);
  assert.equal(h.copy.events, 0);
  assert.equal(h.timers.size, 0);
});
