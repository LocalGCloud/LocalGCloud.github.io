import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import puppeteer from 'puppeteer-core';
import { comparisonPageSize } from '../src/utils/emulator-comparisons.mjs';

const dist = new URL('../dist/', import.meta.url);
const origin = 'https://local.cloud';
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
let browser;
before(async () => { assert.ok(executablePath, 'Chrome is required'); browser = await puppeteer.launch({ executablePath, headless: true }); });
after(async () => { await browser?.close(); });

async function open(t, path, width = 1440, javascript = true) {
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
  await page.goto(origin + path, { waitUntil: 'networkidle0' });
  return page;
}
const settled = page => page.waitForFunction(() => !document.querySelector('[data-emulator-comparison]').hasAttribute('aria-busy'));
const status = page => page.$eval('[data-comparison-status]', node => node.textContent);
const choose = async (page, mode) => { await page.click(`input[value="${mode}"]`); await settled(page); };

for (const [slug, count] of Object.entries({ 'cloud-storage': 244, firestore: 206, bigtable: 464, spanner: 783, bigquery: 1534 })) {
  test(`${slug}: full inventory, page navigation and empty-state recovery`, { timeout: 30000 }, async t => {
    const page = await open(t, `/compare/emulators/${slug}/?view=classic`);
    await choose(page, 'all');
    assert.match(await status(page), new RegExp(`of ${count} matching rows`));
    const first = await page.$eval('tbody tr', row => row.dataset.featureId);
    await page.click('[data-comparison-next]'); await settled(page);
    assert.notEqual(await page.$eval('tbody tr', row => row.dataset.featureId), first);
    await page.click('[data-comparison-previous]'); await settled(page);
    assert.equal(await page.$eval('tbody tr', row => row.dataset.featureId), first);
    await page.type('input[type="search"]', 'no-such-feature-xyz'); await settled(page);
    assert.match(await status(page), /No matching features/);
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), 0);
    await page.$eval('input[type="search"]', input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }); await settled(page);
    assert.match(await status(page), new RegExp(`of ${count} matching rows`));
    assert.equal(await page.$eval('.comparison-table td', node => getComputedStyle(node).paddingTop), '16px', 'dynamic rows retain table styling');
    await page.click('tbody details summary');
    assert.ok(await page.$eval('tbody details', node => node.open));
  });
}

test('mobile filters search the complete inventory and restore shared URL state', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?features=all&q=sql.function.abs&view=mobile&audience=humans', 390);
  await settled(page);
  assert.ok(await page.$eval('tbody', body => body.textContent.includes('ABS')));
  assert.ok((await page.url()).includes('view=mobile'));
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
  assert.match(await status(page), /of 25 matching rows/);
  await page.click('main a.site-button--secondary[href*="/services/bigtable/"]');
  await page.waitForSelector('[data-service-heading]');
  await page.click('main a[href*="/compare/emulators/bigtable/"]');
  await page.waitForSelector('[data-emulator-comparison][data-bound]');
  await choose(page, 'all');
  assert.match(await status(page), /of 464 matching rows/);
});

test('blocked inventory fetch keeps the preview and can retry', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/spanner/?view=classic');
  const inventory = await page.$eval('[data-emulator-comparison]', node => node.dataset.inventory);
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.setBlockedURLs', { urls: [origin + inventory] });
  await choose(page, 'all');
  assert.match(await status(page), /could not load/);
  assert.equal(await page.$$eval('tbody tr', rows => rows.length), comparisonPageSize);
  await client.send('Network.setBlockedURLs', { urls: [] });
  await choose(page, 'broader');
  assert.match(await status(page), /of 39 matching rows/);
});

test('without JavaScript the preview and complete downloads remain available', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/firestore/?view=classic', 390, false);
  assert.equal(await page.$$eval('tbody tr', rows => rows.length), comparisonPageSize);
  assert.ok(await page.$eval('main', node => node.textContent.includes('Compatibility:')));
  assert.equal(await page.$$eval('main a[download]', links => links.length), 2);
  assert.equal(await page.$eval('[data-comparison-controls]', node => node.hidden), true);
});
