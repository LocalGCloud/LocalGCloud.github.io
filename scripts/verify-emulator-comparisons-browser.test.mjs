import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import puppeteer from 'puppeteer-core';
import { comparisonPreviewSize, presentComparisonNotes } from '../src/utils/emulator-comparisons.mjs';

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
const activeTable = '[data-emulator-comparison]:not([hidden] *)';
const settled = page => page.waitForFunction(selector => {
  const table = document.querySelector(selector);
  return table?.dataset.bound && !table.hasAttribute('aria-busy');
}, {}, activeTable);
const status = page => page.$eval(`${activeTable} [data-comparison-status]`, node => node.textContent);
const choose = async (page, mode) => { await page.click(`${activeTable} input[value="${mode}"]`); await settled(page); };

const names = { 'cloud-storage': 'LocalCloud GCS', firestore: 'LocalCloud Firestore', bigtable: 'LocalCloud Bigtable', spanner: 'LocalCloud Spanner', bigquery: 'LocalCloud BigQuery' };
// Counts come from the checked-in inventories so a refreshed document never needs this file edited.
const ids = { 'cloud-storage': 'gcs', firestore: 'firestore', bigtable: 'bigtable', spanner: 'spanner', bigquery: 'bigquery' };
const metrics = JSON.parse(readFileSync(new URL('../src/data/emulator-comparisons/index.json', import.meta.url), 'utf8'));
const stats = slug => metrics[ids[slug]];
// Services without a competitor column list every feature on entry and offer no mode choice.
const advantages = Object.fromEntries(Object.keys(ids).map(slug => [slug, stats(slug).hasCompetitor ? stats(slug).exclusive : stats(slug).total]));
for (const [slug, count] of Object.entries(Object.fromEntries(Object.keys(ids).map(slug => [slug, stats(slug).total])))) {
  test(`${slug}: all matching rows on one page, filters and concise service naming`, { timeout: 30000 }, async t => {
    const page = await open(t, `/compare/emulators/${slug}/?view=classic`);
    await settled(page);
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), advantages[slug], 'entry loads every advantage automatically');
    assert.equal(await page.$eval('thead th:nth-child(2)', node => node.textContent.trim()), names[slug]);
    assert.equal(await page.$$eval('main time', nodes => nodes.length), 0);
    assert.equal(await page.$$eval('[data-comparison-next], [data-comparison-previous]', nodes => nodes.length), 0);
    assert.equal(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
    assert.ok(!await page.$eval('main', node => node.innerText.includes('JSON comparison view')));
    if (stats(slug).hasCompetitor) await choose(page, 'all');
    else assert.equal(await page.$$eval('[data-comparison-controls] input[type="radio"]', radios => radios.length), 1, 'no mode choice without a competitor');
    assert.match(await status(page), new RegExp(`Showing ${count} matching rows`));
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), count, 'All features renders the entire inventory');
    assert.equal(await page.$$eval('thead th', cells => cells.length), stats(slug).hasCompetitor ? 4 : 3);
    const area = await page.$eval('select', select => select.options[1].value);
    await page.select('select', area); await settled(page);
    assert.ok(await page.$$eval('tbody th small', (nodes, area) => nodes.length > 0 && nodes.every(node => node.textContent === area), area));
    await page.select('select', ''); await settled(page);
    await page.type('input[type="search"]', 'no-such-feature-xyz'); await settled(page);
    assert.match(await status(page), /No matching features/);
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), 0);
    await page.$eval('input[type="search"]', input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }); await settled(page);
    assert.match(await status(page), new RegExp(`Showing ${count} matching rows`));
    assert.equal(await page.$eval('.comparison-table td', node => getComputedStyle(node).paddingTop), '10px', 'dynamic rows retain compact table styling');
    assert.equal(await page.$$eval('tbody details', nodes => nodes.length), 0);
    assert.ok(await page.$$eval('tbody td:last-child > p', (nodes, expected) => nodes.length === expected, count));
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
  await page.click('main a[href*="/compare/emulators/?service=bigtable"]');
  await settled(page);
  assert.equal(await page.evaluate(() => window.comparisonNavigationMarker), marker, 'Desktop navigation keeps the shell');
  assert.match(await status(page), new RegExp(`Showing ${stats('bigtable').total} matching rows`));
  await page.click('[data-comparison-service="bigtable"] a.comparison-guide');
  await page.waitForSelector('[data-service-heading]');
  await page.click('main a[href*="/compare/emulators/?service=bigtable"]');
  await settled(page);
  assert.match(await status(page), new RegExp(`Showing ${stats('bigtable').total} matching rows`));
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
  assert.match(await status(page), new RegExp(`Showing ${stats('spanner').broader} matching rows`));
});

test('without JavaScript the preview remains available without download links', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/firestore/?view=classic', 390, false);
  assert.equal(await page.$$eval('tbody tr', rows => rows.length), comparisonPreviewSize);
  assert.ok(await page.$eval('main', node => node.textContent.includes('Compatibility:')));
  assert.equal(await page.$$eval('main a[download]', links => links.length), 0);
  assert.equal(await page.$eval('[data-comparison-controls]', node => node.hidden), true);
  assert.equal(await page.$eval('.comparison-state[data-state="available"] .comparison-mark', node => getComputedStyle(node, '::before').content), '"✓"');
  assert.ok(await page.$$eval('tbody td > p', nodes => nodes.length === 10), 'the static preview shows each row with its note slot inline');
  assert.equal(await page.$$eval('main details', nodes => nodes.length), 0);
});

test('agent audience exposes the complete JSON view', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?view=classic&audience=agents');
  await settled(page);
  assert.notEqual(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
  const data = await page.$eval('[data-comparison-agent] a', async link => (await fetch(link.href)).json());
  assert.equal(data.length, stats('bigquery').total);
  assert.equal(await page.$$eval('[data-comparison-agent] a', links => links.length), 1, 'source documents are not published');
  await page.click('.agent-document-header [data-target-audience="humans"]');
  await page.waitForFunction(() => document.documentElement.dataset.audience !== 'agents');
  assert.equal(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
});

test('one-page workspace switches every service, loads on demand and restores history', { timeout: 45000 }, async t => {
  const inventories = [];
  const page = await open(t, '/compare/emulators/?view=classic&service=bigquery', 1440, true, async page => {
    page.on('request', request => {
      if (/\/_astro\/(gcs|firestore|bigtable|spanner|bigquery)\.[^/]+\.json$/.test(new URL(request.url()).pathname)) inventories.push(request.url());
    });
  });
  await settled(page);
  assert.equal(inventories.length, 1, 'deep link loads only the selected inventory');
  assert.match(inventories[0], /bigquery\./);
  assert.equal(await page.$$eval('[role="tab"]', tabs => tabs.length), 5);
  assert.equal(await page.$eval('[role="tablist"]', node => node.getAttribute('aria-orientation')), 'vertical');
  const layout = await page.evaluate(() => {
    const tabs = document.querySelector('[role="tablist"]').getBoundingClientRect();
    const pane = document.querySelector('[role="tabpanel"]:not([hidden])').getBoundingClientRect();
    return tabs.right < pane.left && Math.abs(tabs.top - pane.top) < 70;
  });
  assert.ok(layout, 'services sit to the left of the detail pane');
  const duplicates = await page.$$eval('main [id]', nodes => nodes.map(node => node.id).filter((id, index, ids) => ids.indexOf(id) !== index));
  assert.deepEqual(duplicates, [], 'shared content has unique IDs');
  await choose(page, 'all');
  assert.equal(await page.$$eval(`${activeTable} tbody tr`, rows => rows.length), stats('bigquery').total);
  await page.evaluate(() => window.workspaceMarker = 'retained');
  for (const [slug, count] of Object.entries(advantages)) {
    await page.click(`[data-service-tab="${slug}"]`);
    await settled(page);
    assert.equal(new URL(page.url()).pathname, '/compare/emulators/');
    assert.equal(new URL(page.url()).searchParams.get('service'), slug);
    assert.equal(await page.evaluate(() => window.workspaceMarker), 'retained', 'tab switches never navigate');
    assert.equal(await page.$eval(`${activeTable} thead th:nth-child(2)`, node => node.textContent.trim()), names[slug]);
    if (stats(slug).hasCompetitor) await choose(page, 'advantages');
    assert.equal(await page.$$eval(`${activeTable} tbody tr`, rows => rows.length), count);
  }
  assert.equal(inventories.length, 5, 'each service loads once');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.dataset.serviceTab === 'spanner');
  await settled(page);
  assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', node => node.dataset.serviceTab), 'spanner');
  await page.goForward();
  await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.dataset.serviceTab === 'bigquery');
  await settled(page);
  assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', node => node.dataset.serviceTab), 'bigquery');
  await page.focus('[role="tab"][aria-selected="true"]');
  await page.keyboard.press('Home'); await settled(page);
  assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', node => node.dataset.serviceTab), 'cloud-storage');
  await page.keyboard.press('ArrowDown'); await settled(page);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.serviceTab), 'firestore');
  await page.keyboard.press('End'); await settled(page);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.serviceTab), 'bigquery');
  assert.equal(inventories.length, 5, 'revisiting a service reuses its inventory');
});

test('mobile workspace keeps tabs above the table and retains view and audience', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/?service=firestore&view=mobile&audience=agents', 390);
  await settled(page);
  assert.equal(await page.$eval('[role="tablist"]', node => node.getAttribute('aria-orientation')), 'horizontal');
  await page.click('[data-service-tab="spanner"]'); await settled(page);
  assert.equal(new URL(page.url()).searchParams.get('view'), 'mobile');
  assert.equal(new URL(page.url()).searchParams.get('audience'), 'agents');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.notEqual(await page.$eval(`${activeTable} [data-comparison-agent]`, node => getComputedStyle(node).display), 'none');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.dataset.serviceTab === 'firestore');
  await settled(page);
  assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', node => node.dataset.serviceTab), 'firestore');
});

test('Desktop tab switches stay in the content pane and Back restores the selected service', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/?service=firestore');
  await settled(page);
  await page.evaluate(() => window.workspaceMarker = 'desktop');
  await page.click('[data-service-tab="spanner"]'); await settled(page);
  assert.equal(new URL(page.url()).pathname, '/compare/emulators/');
  assert.equal(await page.evaluate(() => window.workspaceMarker), 'desktop');
  assert.match(await status(page), new RegExp(`Showing ${stats('spanner').exclusive} matching rows`));
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.dataset.serviceTab === 'firestore');
  await settled(page);
  assert.match(await status(page), new RegExp(`Showing ${stats('firestore').exclusive} matching rows`));
});

test('a slow inactive inventory cannot overwrite the active service filters or URL', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/?view=classic', 1440, true, async page => {
    await page.evaluateOnNewDocument(() => {
      const fetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const response = await fetch(...args);
        if (String(args[0]).includes('/spanner.')) await new Promise(resolve => window.releaseInventory = resolve);
        return response;
      };
    });
  });
  await settled(page);
  await page.click('[data-service-tab="spanner"]');
  await page.waitForFunction(() => typeof window.releaseInventory === 'function');
  await page.click('[data-service-tab="firestore"]'); await settled(page);
  await choose(page, 'broader');
  await page.evaluate(() => window.releaseInventory());
  await page.waitForFunction(() => !document.querySelector('[data-comparison-service="spanner"] [data-emulator-comparison]').hasAttribute('aria-busy'));
  assert.equal(new URL(page.url()).searchParams.get('service'), 'firestore');
  assert.equal(new URL(page.url()).searchParams.get('features'), 'broader');
  assert.match(await status(page), new RegExp(`Showing ${stats('firestore').broader} matching rows`));
});

test('workspace without JavaScript retains the preview and real service links', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/?view=classic', 390, false);
  assert.equal(await page.$$eval(`${activeTable} tbody tr`, rows => rows.length), comparisonPreviewSize);
  assert.equal(await page.$eval('[role="tablist"]', tabs => tabs.hidden), true, 'interactive tabs stay hidden without JavaScript');
  assert.equal(await page.$eval('main a[href*="/compare/emulators/firestore/"]', node => new URL(node.href).pathname), '/compare/emulators/firestore/');
});

test('compact comparison shows rows immediately in Desktop, Classic and Mobile', { timeout: 30000 }, async t => {
  for (const [view, width] of [['desktop', 1440], ['classic', 1440], ['mobile', 390]]) {
    const page = await open(t, `/compare/emulators/?service=bigtable&view=${view}`, width);
    await page.setViewport({ width, height: 900 });
    await settled(page);
    const position = await page.$eval(`${activeTable} tbody tr`, row => ({ top: row.getBoundingClientRect().top, bottom: row.getBoundingClientRect().bottom }));
    assert.ok(position.top > 0 && position.bottom < (view === 'mobile' ? 780 : 700), `${view}: the first row is visible with room for more rows (${JSON.stringify(position)})`);
    assert.equal(await page.$eval('[data-comparison-service="bigtable"] .comparison-heading', node => getComputedStyle(node).fontSize), '20px');
    assert.equal(await page.$$eval('[data-comparison-workspace] details', nodes => nodes.length), 0);
  }
});

test('availability marks retain accessible labels, all notes stay inline and profile duplicates disappear', { timeout: 30000 }, async t => {
  const markdown = readFileSync(new URL('../dist/compare/emulators/cloud-storage.md', import.meta.url), 'utf8');
  assert.match(markdown, /Available/); assert.match(markdown, /Not available/);
  const page = await open(t, '/compare/emulators/?view=classic');
  await settled(page);
  await choose(page, 'all');
  for (const [state, label, mark, color] of [['available', 'Available', '✓', 'rgb(19, 115, 51)'], ['unavailable', 'Not available', '✕', 'rgb(234, 67, 53)']]) {
    const output = await page.$eval(`${activeTable} .comparison-state[data-state="${state}"]`, node => {
      const mark = node.querySelector('.comparison-mark');
      return { label: node.querySelector('.comparison-label').textContent, hiddenMark: mark.getAttribute('aria-hidden'), mark: getComputedStyle(mark, '::before').content, color: getComputedStyle(mark, '::before').color };
    });
    assert.deepEqual(output, { label, hiddenMark: 'true', mark: `"${mark}"`, color });
  }
  const client = await page.createCDPSession();
  const { nodes } = await client.send('Accessibility.getFullAXTree');
  assert.ok(nodes.some(node => !node.ignored && node.name?.value === 'Available'));
  assert.ok(nodes.some(node => !node.ignored && node.name?.value === 'Not available'));
  const inventory = JSON.parse(readFileSync(new URL('../src/data/emulator-comparisons/gcs.json', import.meta.url)));
  const notes = await page.$$eval(`${activeTable} tbody tr`, rows => rows.map(row => ({ id: row.dataset.featureId, inline: row.lastElementChild.querySelector(':scope > p')?.textContent })));
  for (const row of inventory) {
    const text = presentComparisonNotes(row.notes), note = notes.find(note => note.id === row.id);
    assert.equal(note.inline, text);
  }
  assert.equal(await page.$$eval('[data-comparison-workspace] details', nodes => nodes.length), 0);
  await page.click('[data-service-tab="firestore"]'); await settled(page);
  const profiles = await page.$$eval(`${activeTable} tbody tr`, rows => {
    const cell = rows.find(row => row.querySelector('th > span').textContent === 'Required composite-index rejection for queries').querySelector('td');
    return [...cell.querySelectorAll('.comparison-state')].map(node => ({ state: node.dataset.state, label: node.querySelector('.comparison-label').textContent }));
  });
  assert.deepEqual(profiles, [{ state: 'available', label: 'Available' }, { state: 'unavailable', label: 'Not available' }]);
  await choose(page, 'all');
  assert.ok(await page.$eval(`${activeTable} .comparison-state[data-state="unknown"]`, node => node.textContent.includes('Not assessed')));
  const firestore = JSON.parse(readFileSync(new URL('../src/data/emulator-comparisons/firestore.json', import.meta.url)));
  const visibleProfiles = await page.$$eval(`${activeTable} tbody tr`, rows => rows.map(row => ({ id: row.dataset.featureId,
    states: [...row.querySelector('td').querySelectorAll('.comparison-state')].filter(node => !node.closest('[hidden]')).map(node => node.dataset.state) })));
  for (const row of firestore) {
    assert.deepEqual(visibleProfiles.find(result => result.id === row.id).states, row.default === row.local ? [row.local] : [row.local, row.default]);
  }
});

test('the longest comparison note remains fully visible as plain text', { timeout: 30000 }, async t => {
  const inventory = JSON.parse(readFileSync(new URL('../src/data/emulator-comparisons/bigquery.json', import.meta.url)));
  const row = inventory.reduce((longest, row) => row.notes.length > longest.notes.length ? row : longest);
  const page = await open(t, `/compare/emulators/?service=bigquery&features=all&q=${encodeURIComponent(row.id)}&view=mobile`, 390);
  await settled(page);
  const text = await page.$eval(`${activeTable} tbody td:last-child > p`, node => ({ text: node.textContent, display: getComputedStyle(node).display, clipped: node.scrollHeight > node.clientHeight + 1 }));
  assert.equal(text.text, presentComparisonNotes(row.notes));
  assert.notEqual(text.display, 'none'); assert.equal(text.clipped, false);
  assert.equal(await page.$$eval('[data-comparison-workspace] details', nodes => nodes.length), 0);
});
