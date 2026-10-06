import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

// Ceilings are the largest page measured on 2026-10-05 plus 5%. Lower them as pages
// get lighter; raise them only with a reviewed reason in the commit message.
const htmlBudget = { rawBytes: 167_000, gzipBytes: 34_200, styleBytes: 90_500, scriptBytes: 14_800 };
const rawDocumentBytes = 21_800;

const dist = new URL('../dist/', import.meta.url).pathname;
const walk = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const files = walk(dist);
const bytes = (text) => Buffer.byteLength(text);

test('every built page stays within the HTML, CSS and script byte budgets', () => {
  const pages = files.filter((file) => file.endsWith('.html'));
  assert.ok(pages.length > 0, 'no built pages found');
  const failures = [];
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const styleBytes = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].reduce((sum, match) => sum + bytes(match[1]), 0);
    const inlineScriptBytes = [...html.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter((match) => !/application\/ld\+json|speculationrules/.test(match[1]))
      .reduce((sum, match) => sum + bytes(match[2]), 0);
    const externalScriptBytes = [...html.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"/g)]
      .map((match) => join(dist, match[1]))
      .reduce((sum, path) => sum + (existsSync(path) ? statSync(path).size : 0), 0);
    const measured = {
      rawBytes: bytes(html),
      gzipBytes: gzipSync(html, { level: 9 }).length,
      styleBytes,
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
  const failures = documents
    .filter((file) => statSync(file).size > rawDocumentBytes)
    .map((file) => `${file.slice(dist.length)}: ${statSync(file).size} > ${rawDocumentBytes}`);
  assert.deepEqual(failures, []);
});
