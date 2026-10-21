import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import puppeteer from 'puppeteer-core';
import { comparisonPreviewSize } from '../src/utils/emulator-comparisons.mjs';

const dist = new URL('../dist/', import.meta.url);
const origin = 'https://local.cloud';
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
let browser;
before(async () => { assert.ok(executablePath, 'Chrome is required'); browser = await puppeteer.launch({ executablePath, headless: true }); });
after(async () => { await browser?.close(); });

async function open(t, path, width = 1440, javascript = true, beforeNavigate = async () => {}) {
  const context = await browser.createBrowserContext();
  t.after(() => context.close());
  const page = await context.newPage();
  await page.setViewport({ width, height: 1000 });
  await page.setJavaScriptEnabled(javascript);
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.origin !== origin) { await request.abort(); return; }
    const path = url.pathname.slice(1) + (url.pathname.endsWith('/') ? 'index.html' : '');
    const file = new URL(path, dist);
    if (!file.href.startsWith(dist.href)) { await request.abort(); return; }
    const contentType = /\.m?js$/.test(path) ? 'application/javascript' : /\.json$/.test(path) ? 'application/json'
      : /\.css$/.test(path) ? 'text/css' : /\.svg$/.test(path) ? 'image/svg+xml'
      : /\.woff2$/.test(path) ? 'font/woff2' : /\.webp$/.test(path) ? 'image/webp' : /\.png$/.test(path) ? 'image/png' : 'text/html';
    try { await request.respond({ status: 200, contentType, body: readFileSync(file) }); }
    catch { await request.respond({ status: 404, body: 'Not found' }); }
  });
  await beforeNavigate(page);
  await page.goto(origin + path, { waitUntil: 'networkidle0' });
  return page;
}
const settled = page => page.waitForFunction(() => !document.querySelector('[data-emulator-comparison]').hasAttribute('aria-busy'));
const status = page => page.$eval('[data-comparison-status]', node => node.textContent);
const choose = async (page, mode) => { await page.click(`input[value="${mode}"]`); await settled(page); };

const names = { 'cloud-storage': 'LocalCloud GCS', firestore: 'LocalCloud Firestore', bigtable: 'LocalCloud Bigtable', spanner: 'LocalCloud Spanner', bigquery: 'LocalCloud BigQuery' };
const advantages = { 'cloud-storage': 90, firestore: 42, bigtable: 303, spanner: 189, bigquery: 53 };
for (const [slug, count] of Object.entries({ 'cloud-storage': 244, firestore: 206, bigtable: 464, spanner: 783, bigquery: 1534 })) {
  test(`${slug}: all matching rows on one page, filters and concise service naming`, { timeout: 30000 }, async t => {
    const page = await open(t, `/compare/emulators/${slug}/?view=classic`);
    await settled(page);
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), advantages[slug], 'entry loads every advantage automatically');
    assert.equal(await page.$eval('thead th:nth-child(2)', node => node.textContent.trim()), names[slug]);
    assert.equal(await page.$$eval('main time', nodes => nodes.length), 0);
    assert.equal(await page.$$eval('[data-comparison-next], [data-comparison-previous]', nodes => nodes.length), 0);
    assert.equal(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
    assert.ok(!await page.$eval('main', node => node.innerText.includes('JSON comparison view')));
    await choose(page, 'all');
    assert.match(await status(page), new RegExp(`Showing ${count} matching rows`));
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), count, 'All features renders the entire inventory');
    const area = await page.$eval('select', select => select.options[1].value);
    await page.select('select', area); await settled(page);
    assert.ok(await page.$$eval('tbody th small', (nodes, area) => nodes.length > 0 && nodes.every(node => node.textContent === area), area));
    await page.select('select', ''); await settled(page);
    await page.type('input[type="search"]', 'no-such-feature-xyz'); await settled(page);
    assert.match(await status(page), /No matching features/);
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), 0);
    await page.$eval('input[type="search"]', input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }); await settled(page);
    assert.match(await status(page), new RegExp(`Showing ${count} matching rows`));
    assert.equal(await page.$eval('.comparison-table td', node => getComputedStyle(node).paddingTop), '16px', 'dynamic rows retain table styling');
    await page.click('tbody details summary');
    assert.ok(await page.$eval('tbody details', node => node.open));
  });
}

test('mobile filters search the complete inventory and restore shared URL state', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?features=all&q=sql.function.abs&view=mobile&audience=humans&page=2', 390);
  await settled(page);
  assert.ok(await page.$eval('tbody', body => body.textContent.includes('ABS')));
  assert.ok((await page.url()).includes('view=mobile'));
  assert.ok(!new URL(page.url()).searchParams.has('page'), 'obsolete pagination parameters are removed');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'only the table region scrolls horizontally');
  await choose(page, 'advantages');
  assert.match(await status(page), /No matching features/);
});

test('Desktop service-to-comparison navigation and return remount the controls', { timeout: 45000 }, async t => {
  const page = await open(t, '/services/bigtable/');
  const marker = await page.evaluate(() => { window.comparisonNavigationMarker = 'retained'; return window.comparisonNavigationMarker; });
  await page.click('main a[href*="/compare/emulators/bigtable/"]');
  await page.waitForSelector('[data-emulator-comparison][data-bound]');
  assert.equal(await page.evaluate(() => window.comparisonNavigationMarker), marker, 'Desktop navigation keeps the shell');
  await choose(page, 'broader');
  assert.match(await status(page), /Showing 25 matching rows/);
  await page.click('main a.site-button--secondary[href*="/services/bigtable/"]');
  await page.waitForSelector('[data-service-heading]');
  await page.click('main a[href*="/compare/emulators/bigtable/"]');
  await page.waitForSelector('[data-emulator-comparison][data-bound]');
  await choose(page, 'all');
  assert.match(await status(page), /Showing 464 matching rows/);
});

test('blocked inventory fetch keeps the preview and can retry', { timeout: 30000 }, async t => {
  let client;
  const page = await open(t, '/compare/emulators/spanner/?view=classic', 1440, true, async page => {
    client = await page.createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.setBlockedURLs', { urls: ['*/_astro/spanner.*.json'] });
  });
  await settled(page);
  assert.match(await status(page), /Could not load/);
  assert.equal(await page.$$eval('tbody tr', rows => rows.length), comparisonPreviewSize);
  await client.send('Network.setBlockedURLs', { urls: [] });
  await choose(page, 'broader');
  assert.match(await status(page), /Showing 39 matching rows/);
});

test('without JavaScript the preview remains available without download links', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/firestore/?view=classic', 390, false);
  assert.equal(await page.$$eval('tbody tr', rows => rows.length), comparisonPreviewSize);
  assert.ok(await page.$eval('main', node => node.textContent.includes('Compatibility:')));
  assert.equal(await page.$$eval('main a[download]', links => links.length), 0);
  assert.equal(await page.$eval('[data-comparison-controls]', node => node.hidden), true);
});

test('agent audience exposes the complete JSON view and source reference', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?view=classic&audience=agents');
  await settled(page);
  assert.notEqual(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
  const data = await page.$eval('[data-comparison-agent] a', async link => (await fetch(link.href)).json());
  assert.equal(data.length, 1534);
  assert.equal(await page.$$eval('[data-comparison-agent] a', links => links.length), 2);
  await page.click('.agent-document-header [data-target-audience="humans"]');
  await page.waitForFunction(() => document.documentElement.dataset.audience !== 'agents');
  assert.equal(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
});
