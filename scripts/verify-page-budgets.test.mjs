import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

// Ceilings are the largest page measured on the date given plus 5%. Lower them as pages
// get lighter; raise them only with a reviewed reason in the commit message.
// 2026-10-06 (plan R5, re-baselined after every R5 change): a linked stylesheet cost 500-1,300 ms
// of first-view LCP on throttled mobile, so styles stay inline. rawBytes, gzipBytes and styleBytes:
// the homepage (175,845 raw, 35,618 gzipped, 90,016 inline style bytes), which gained the footer
// analytics toggle and speculation rules. scriptBytes: docs/ (16,164 bytes) carries the R5.4
// privacy, search and copy logic.
// 2026-10-07: UI setup moved from blocking requests into HTML; interactions now have a
// direct module tag, so scriptBytes includes a previously dynamic module. Account for those
// existing bytes here; the aggregate startup ceiling below still counts and bounds all JS.
const htmlBudget = { rawBytes: 196_000, gzipBytes: 40_000, styleBytes: 94_600, scriptBytes: 21_000 };
// Desktop startup also fetches the controller, router, interactions and page filter modules.
// Count each fetched file once, including files loaded by inline bootstraps rather than script tags.
const startupScriptBytes = 45_000;
const rawDocumentBytes = 21_800;
// The Markdown twins of docs and service pages and the llms-full.txt bundle built from them
// have their own ceilings: the largest twin measured on 2026-10-05, plus 10%, and the bundle
// measured on 2026-10-06 after the R7 service merges (256,444 bytes), plus 5%.
const markdownTwinBytes = 15_400;
const llmsFullBytes = 269_300;
const isMarkdownTwin = (file) => /^(?:docs|services|compare)\/[^/]+\.md$/.test(file);

const dist = new URL('../dist/', import.meta.url).pathname;
const walk = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const files = walk(dist);
const bytes = (text) => Buffer.byteLength(text);

test('every built page stays within static byte budgets and the aggregate Desktop startup ceiling', () => {
  const pages = files.filter((file) => file.endsWith('.html'));
  assert.ok(pages.length > 0, 'no built pages found');
  const failures = [];
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const styleBytes = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].reduce((sum, match) => sum + bytes(match[1]), 0);
    const inlineScriptBytes = [...html.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter((match) => !/application\/ld\+json|speculationrules/.test(match[1]))
      .reduce((sum, match) => sum + bytes(match[2]), 0);
    const scriptPaths = [...html.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"/g)].map(match=>match[1]);
    const externalScriptBytes = scriptPaths.map(path => join(dist,path))
      .reduce((sum, path) => sum + (existsSync(path) ? statSync(path).size : 0), 0);
    const startupSources = [html,...scriptPaths.map(path=>readFileSync(join(dist,path),'utf8'))].join('\n');
    const startupPaths = new Set([...scriptPaths,...[...startupSources.matchAll(/\/(_astro\/(?:desktop-view|desktop-navigation|site-interactions|service-filter)\.[^"'\s<>]+\.mjs)/g)].map(match=>match[1])]);
    assert.ok([...startupPaths].some(path=>path.includes('/desktop-view.')),file+' must count the externally bootstrapped controller');
    if(file.endsWith('/services/index.html'))assert.ok([...startupPaths].some(path=>path.includes('/service-filter.')),file+' must count its filter bootstrap');
    const measured = {
      rawBytes: bytes(html),
      gzipBytes: gzipSync(html, { level: 9 }).length,
      styleBytes,
      scriptBytes: inlineScriptBytes + externalScriptBytes,
      startupScriptBytes: inlineScriptBytes + [...startupPaths].reduce((sum,path)=>sum+statSync(join(dist,path)).size,0),
    };
    for (const [metric, limit] of Object.entries({...htmlBudget,startupScriptBytes})) {
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
