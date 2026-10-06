import assert from 'node:assert/strict';
import test from 'node:test';
import { classList, headingsWithinClass, walkElements } from './html-structure.mjs';

const hidden = (html) => headingsWithinClass(html, 'reveal').map(({ holder }) => holder);

test('an h1 inside or carrying .reveal is found, with the element that carries the class', () => {
  assert.deepEqual(hidden('<main><div class="max-w-[52rem] reveal"><span>Kicker</span><h1>Title</h1></div></main>'), ['<div class="max-w-[52rem] reveal">']);
  assert.deepEqual(hidden('<section class=\'reveal\'><div><div><h1 class="x">Deep</h1></div></div></section>'), ["<section class='reveal'>"]);
  assert.deepEqual(hidden('<div class=reveal><h1>Unquoted</h1></div>'), ['<div class=reveal>']);
  assert.deepEqual(hidden('<h1 class="title reveal">Self</h1>'), ['<h1 class="title reveal">']);
  assert.deepEqual(hidden('<DIV CLASS="reveal"><H1>Upper</H1></DIV>'), ['<div CLASS="reveal">']);
  // An unclosed paragraph inside the container is closed by the container's end tag.
  assert.deepEqual(hidden('<div class="reveal"><p>Lead<h1>Title</h1></div>'), ['<div class="reveal">']);
});

test('a closed .reveal sibling, a lookalike class or markup in text is not an ancestor', () => {
  assert.deepEqual(hidden('<div class="reveal"><p>Earlier</p></div><h1>Title</h1>'), []);
  assert.deepEqual(hidden('<div class="reveal-ready not-reveal revealed" data-x="reveal"><h1>Title</h1></div>'), []);
  assert.deepEqual(hidden('<!-- <div class="reveal"> --><h1>Commented</h1>'), []);
  assert.deepEqual(hidden('<script>document.write(\'<div class="reveal">\')</script><h1>Script</h1>'), []);
  assert.deepEqual(hidden('<style>.x::before { content: "<div class=reveal>"; }</style><h1>Style</h1>'), []);
  assert.deepEqual(hidden('<div class="reveal"><img src="a.png" alt="a > b"><br/><input></div><h1>Void</h1>'), []);
  assert.deepEqual(hidden('<div class="reveal"><svg viewBox="0 0 1 1"><path d="M0 0" /></svg></div><h1>Self-closing</h1>'), []);
  assert.deepEqual(hidden('<div class="hero" title="a > b"><h1>Quoted angle</h1></div>'), []);
});

test('the walker reports ancestors from the outermost element inward', () => {
  const seen = [];
  walkElements('<html><body class="a"><main><h1>x</h1></main></body></html>', (name, attributes, ancestors) => {
    if (name === 'h1') seen.push(ancestors.map((element) => element.name));
  });
  assert.deepEqual(seen, [['html', 'body', 'main']]);
  assert.deepEqual(classList(' id="x" class="  one two\tthree "'), ['one', 'two', 'three']);
  assert.deepEqual(classList(' data-class="x"'), []);
});
