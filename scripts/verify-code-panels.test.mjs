import assert from 'node:assert/strict';
import test from 'node:test';
import { initCodeBlocks } from '../src/scripts/copy-buttons.mjs';
import { neutralPaperTheme } from '../src/utils/code-theme.mjs';

// Small DOM fixture: exercise moving controls and repeated page mounts without a browser dependency.
class Element {
  constructor(tag, classes = '', text = '') { this.tag = tag; this.className = classes; this.textContent = text; this.children = []; this.attributes = {}; this.dataset = {}; }
  append(...nodes) { for (const node of nodes) { if (node.parentElement) node.parentElement.children.splice(node.parentElement.children.indexOf(node), 1); node.parentElement = this; this.children.push(node); } }
  before(node) { const parent = this.parentElement; node.parentElement = parent; parent.children.splice(parent.children.indexOf(this), 0, node); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  hasAttribute(name) { return name in this.attributes; }
  closest() { return this.hasAttribute('data-code-block') || /field-install|my-cloud-body/.test(this.className) ? this : this.parentElement?.closest() ?? null; }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(selector === 'pre > code' ? child.tag === 'code' && this.tag === 'pre' ? [child] : [] : child.className === 'copy-btn' && 'copy' in child.dataset ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
  cloneNode() { const node = new Element(this.tag, this.className, this.textContent); node.dataset = { ...this.dataset }; node.attributes = { ...this.attributes }; return node; }
}

function fixture(run) {
  const body = new Element('body'), template = new Element('template');
  const button = new Element('button', 'copy-btn'); button.dataset.copy = '';
  template.content = new Element('fragment'); template.content.append(button);
  const previous = globalThis.document;
  globalThis.document = { querySelector: () => template, createElement: tag => new Element(tag) };
  try { run(body); } finally { if (previous) globalThis.document = previous; else delete globalThis.document; }
}

test('legacy copy buttons move into their own panel and retain exact text and analytics', () => fixture(body => {
  const article = new Element('article'), header = new Element('header');
  const pre = new Element('pre'), code = new Element('code', '', 'echo "hello"\n');
  const button = new Element('button', 'copy-btn');
  button.dataset = { copy: 'echo "hello"', analyticsLabel: 'existing-action' };
  pre.append(code); header.append(button); article.append(header, pre); body.append(article);
  initCodeBlocks(body);
  const panel = pre.parentElement;
  assert.equal(panel.className, 'code-block');
  assert.equal(button.parentElement, panel);
  assert.equal(button.dataset.analyticsLabel, 'existing-action');
  assert.equal(button.dataset.copy, 'echo "hello"');
  assert.equal(pre.tabIndex, 0);
  initCodeBlocks(body);
  assert.equal(pre.parentElement, panel, 'page remounts must not nest code panels');
  assert.equal(panel.children.length, 2);
}));

test('Markdown snippets get a copy action without altering literal code or whitespace', () => fixture(body => {
  const pre = new Element('pre'), code = new Element('code', '', '<tag attr="value">\n  indented & literal\n</tag>\n');
  pre.setAttribute('aria-label', 'XML example'); pre.setAttribute('tabindex', '-1');
  pre.append(code); body.append(pre);
  initCodeBlocks(body);
  const button = pre.parentElement.children[1];
  assert.equal(button.dataset.copy, code.textContent);
  assert.equal(button.getAttribute('aria-label'), 'Copy XML example');
  assert.equal(pre.getAttribute('tabindex'), '-1');
}));

test('compact install switches and existing server-rendered panels stay intact', () => fixture(body => {
  for (const classes of ['field-install', 'my-cloud-body', 'code-block']) {
    const parent = new Element('div', classes), pre = new Element('pre'), code = new Element('code', '', 'localcloud start');
    if (classes === 'code-block') parent.setAttribute('data-code-block', '');
    pre.append(code); parent.append(pre); body.append(parent);
    initCodeBlocks(body);
    assert.equal(pre.parentElement, parent);
    assert.equal(parent.children.length, 1);
  }
}));

test('every Neutral paper syntax color has at least 4.5:1 contrast', () => {
  const luminance = hex => hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  const background = luminance(neutralPaperTheme.colors['editor.background']);
  for (const color of [neutralPaperTheme.colors['editor.foreground'], ...neutralPaperTheme.tokenColors.map(token => token.settings.foreground)]) {
    const foreground = luminance(color);
    const ratio = (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
    assert.ok(ratio >= 4.5, `${color}: ${ratio.toFixed(2)}:1`);
  }
});
