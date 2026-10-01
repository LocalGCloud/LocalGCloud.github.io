import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (route) => readFileSync(new URL(`../dist/${route}/index.html`, import.meta.url), 'utf8');
const slugs = ['localcloud-for-ai-agents', 'run-dataproc-locally-docker', 'claude-code-local-gcp-sandbox', 'google-emulators-vs-localcloud-for-agents', 'bigquery-locally-agent-written-pipelines'];
const decode = (text) => text.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (_, number, name) => number ? String.fromCodePoint(Number.parseInt(number.replace(/^x/i, ''), /^x/i.test(number) ? 16 : 10)) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name.toLowerCase()]);
const normalize = (text) => decode(text).replace(/\r\n/g, '\n').trim();

const index = read('blog');
for (const slug of slugs) {
  assert(index.includes(`/blog/${slug}/`), `Blog index omits ${slug}`);
  const html = read(`blog/${slug}`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${slug}: expected one article title`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${slug}: duplicate section IDs`);
  const toc = html.match(/<nav\b[^>]*aria-label="Table of contents"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert(toc, `${slug}: missing contents navigation`);
  const anchors = [...toc.matchAll(/href="#([^"]+)"/g)];
  assert(anchors.length > 3, `${slug}: contents list is empty`);
  for (const [, id] of anchors) assert(ids.includes(id), `${slug}: broken contents target #${id}`);
  const hero = html.match(/<div\b[^>]*class="blog-hero"[^>]*>([\s\S]*?)<div\b[^>]*class="blog-body"/)?.[1];
  assert(hero, `${slug}: missing article header`);
  assert.equal([...hero.matchAll(/<a\b[^>]*class="[^"]*site-button--primary/g)].length, 1, `${slug}: expected one main header action`);
  // A copy control must copy the complete code block shown immediately after it.
  for (const match of html.matchAll(/data-copy="([^"]*)"(?:(?!data-copy=)[\s\S])*?<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)) {
    assert.equal(normalize(match[1]), normalize(match[2]), `${slug}: copied code differs from the visible block`);
  }
}
for (const route of ['agents/claude-code-gcp-sandbox', 'compare/google-emulators', 'services/bigquery/ai-agent-local-testing']) {
  assert(!/<div\b[^>]*class="[^"]*\bblog-page\b/.test(read(route)), `${route}: blog layout leaked into another page`);
}
console.log('Blog presentation passed: all articles indexed, contents targets, header actions, exact copy text, and non-blog layout isolation.');
