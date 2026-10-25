import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { rssFeed } from '../src/utils/rss.mjs';

const built = (path) => readFileSync(new URL(`../dist/${path}`, import.meta.url), 'utf8');

test('RSS escapes text and URLs, sorts by publication date, and keeps stable identifiers', () => {
  const feed = rssFeed({ title: 'A & B', description: '<guide>', link: 'https://example.com/', self: 'https://example.com/rss.xml' }, [
    { title: 'Older', description: '"quoted"', link: 'https://example.com/older/', publishedAt: '2026-01-01' },
    { title: 'Newer <entry>', description: "It's & useful", link: 'https://example.com/newer/?a=1&b=2', publishedAt: '2026-02-01' },
    { title: 'Undated', description: 'No publication claim', link: 'https://example.com/undated/' },
  ]);
  assert.match(feed, /<title>A &amp; B<\/title>/);
  assert.match(feed, /<description>&lt;guide&gt;<\/description>/);
  assert.match(feed, /It&apos;s &amp; useful/);
  assert.match(feed, /<guid isPermaLink="true">https:\/\/example.com\/newer\/\?a=1&amp;b=2<\/guid>/);
  assert.ok(feed.indexOf('Newer &lt;entry&gt;') < feed.indexOf('<title>Older'));
  assert.equal((feed.match(/<pubDate>/g) || []).length, 2);
  assert.match(feed, /Sun, 01 Feb 2026 00:00:00 GMT/);
  assert.throws(() => rssFeed({ title: '', description: '', link: '', self: '' }, [{ publishedAt: 'invalid' }]), /Invalid RSS publication date/);
});

test('built feeds cover every blog article and committed CLI release exactly once', () => {
  const blog = built('rss.xml');
  const releases = JSON.parse(readFileSync(new URL('../src/data/releases.json', import.meta.url), 'utf8')).releases;
  const releaseFeed = built('changelog/rss.xml');
  const posts = readdirSync(new URL('../dist/blog/', import.meta.url), { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.equal((blog.match(/<item>/g) || []).length, posts.length);
  for (const { name } of posts) assert.equal(blog.split(`<guid isPermaLink="true">https://local.cloud/blog/${name}/</guid>`).length, 2, name);
  assert.equal((releaseFeed.match(/<item>/g) || []).length, releases.length);
  for (const release of releases) assert.equal(releaseFeed.split(`<guid isPermaLink="true">${release.url}</guid>`).length, 2, release.tag);
  for (const [path, feed] of [['rss.xml', blog], ['changelog/rss.xml', releaseFeed]]) {
    assert.match(feed, new RegExp(`<atom:link href="https://local\\.cloud/${path.replace('.', '\\.')}" rel="self"`));
    const dates = [...feed.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((match) => Date.parse(match[1]));
    assert.ok(dates.length > 0 && dates.every(Number.isFinite));
    assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
  }
});

test('AI declarations and discovery links are present in built documents', () => {
  const declaration = built('ai.txt');
  assert.equal(declaration, built('.well-known/ai.txt'));
  assert.match(declaration, /Experimental: draft-car-ai-txt-wellknown-00/);
  for (const field of ['Training', 'Scraping', 'Indexing', 'Caching']) assert.match(declaration, new RegExp(`^${field}: allow$`, 'm'));
  assert.match(declaration, /does not grant software rights/);
  assert.match(declaration, /https:\/\/local\.cloud\/license\.txt/);
  for (const path of ['index.html', 'blog/index.html', 'changelog/index.html', 'docs/index.html']) {
    const html = built(path);
    assert.match(html, /rel="describedby" href="\/llms\.txt"/);
    assert.match(html, /rel="alternate" type="application\/rss\+xml" href="\/rss\.xml"/);
    assert.match(html, /rel="alternate" type="application\/rss\+xml" href="\/changelog\/rss\.xml"/);
  }
  assert.match(built('index.html'), /rel="describedby" href="\/ai\.txt"/);
  const llms = built('llms.txt');
  for (const url of ['docs/index.md', 'services/bigquery.md', 'pricing.md', 'rss.xml', 'changelog/rss.xml', 'ai.txt']) assert.ok(llms.includes(`https://local.cloud/${url}`), url);
  assert.ok(llms.includes('https://local.cloud/docs/#manual-docker-path'), 'HTML-only fragment targets remain intact');
  assert.ok(built('blog/index.html').includes('Subscribe via RSS'));
  assert.ok(built('changelog/index.html').includes('Subscribe to CLI releases via RSS'));
});
