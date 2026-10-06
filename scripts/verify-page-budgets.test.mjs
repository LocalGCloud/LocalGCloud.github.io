import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

// Ceilings are the largest page measured on the date given plus 5%. Lower them as pages
// get lighter; raise them only with a reviewed reason in the commit message.
// 2026-10-06 (plan R5, re-baselined after every R5 change): the shared stylesheet is a linked
// /_astro/*.css file, so HTML lost its inline CSS. rawBytes and gzipBytes: docs/sdk-examples/
// (93,270 raw) and the homepage (19,884 gzipped). styleBytes is what stays inline (2,487 bytes,
// reduce-gcp-dev-costs/). cssBytes is new: the /_astro/*.css files a page links (88,646 bytes, the
// homepage). scriptBytes: docs/ (16,164 bytes) carries the R5.4 privacy, search and copy logic.
const htmlBudget = { rawBytes: 98_000, gzipBytes: 20_900, styleBytes: 2_700, cssBytes: 93_100, scriptBytes: 17_000 };
const rawDocumentBytes = 21_800;
// The Markdown twins of docs and service pages and the llms-full.txt bundle built from them
// have their own ceilings: the largest twin and the bundle measured on 2026-10-05, plus 10%.
const markdownTwinBytes = 15_400;
const llmsFullBytes = 239_500;
const isMarkdownTwin = (file) => /^(?:docs|services|compare)\/[^/]+\.md$/.test(file);

const dist = new URL('../dist/', import.meta.url).pathname;
const walk = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const files = walk(dist);
const bytes = (text) => Buffer.byteLength(text);

test('every built page stays within the HTML, inline style, linked CSS and script byte budgets', () => {
  const pages = files.filter((file) => file.endsWith('.html'));
  assert.ok(pages.length > 0, 'no built pages found');
  const failures = [];
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const styleBytes = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].reduce((sum, match) => sum + bytes(match[1]), 0);
    const inlineScriptBytes = [...html.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter((match) => !/application\/ld\+json|speculationrules/.test(match[1]))
      .reduce((sum, match) => sum + bytes(match[2]), 0);
    const cssBytes = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)]
      .map((match) => join(dist, match[0].match(/\bhref="\/([^"]+)"/)?.[1] ?? 'missing.css'))
      .reduce((sum, path) => sum + (existsSync(path) ? statSync(path).size : Infinity), 0);
    const externalScriptBytes = [...html.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"/g)]
      .map((match) => join(dist, match[1]))
      .reduce((sum, path) => sum + (existsSync(path) ? statSync(path).size : 0), 0);
    const measured = {
      rawBytes: bytes(html),
      gzipBytes: gzipSync(html, { level: 9 }).length,
      styleBytes,
      cssBytes,
      scriptBytes: inlineScriptBytes + externalScriptBytes,
    };
    for (const [metric, limit] of Object.entries(htmlBudget)) {
      if (measured[metric] > limit) failures.push(`${file.slice(dist.length)}: ${metric} ${measured[metric]} > ${limit}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('raw agent documents stay within their byte budget', () => {
  const documents = files.filter((file) => /\.(?:md|txt)$/.test(file) && !file.includes('/pagefind/'));
  assert.ok(documents.length > 0, 'no raw agent documents found');
  const limit = (path) => path === 'llms-full.txt' ? llmsFullBytes : isMarkdownTwin(path) ? markdownTwinBytes : rawDocumentBytes;
  const failures = documents
    .map((file) => ({ path: file.slice(dist.length), size: statSync(file).size }))
    .filter(({ path, size }) => size > limit(path))
    .map(({ path, size }) => `${path}: ${size} > ${limit(path)}`);
  assert.deepEqual(failures, []);
  assert.ok(documents.some((file) => isMarkdownTwin(file.slice(dist.length))), 'no Markdown twins found');
});
