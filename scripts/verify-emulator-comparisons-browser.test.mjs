import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import puppeteer from 'puppeteer-core';
import { comparisonMarkState, groupComparisonRows, presentComparisonNotes, resultsText } from '../src/utils/emulator-comparisons.mjs';

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

function contrastRatio(foreground, background) {
  const luminance = color => {
    const channels = color.match(/[\d.]+/g).map(Number).map(value => color.startsWith('rgb(') ? value / 255 : value);
    const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  };
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + .05) / (Math.min(...values) + .05);
}

for (const width of [390, 1440]) {
  test(`comparison controls reserve their space before binding at ${width}px`, async t => {
    const page = await open(t, '/compare/emulators/', width);
    await settled(page);
    const positions = await page.evaluate(() => {
      const content = document.querySelector('.comparison-content');
      const table = content.querySelector('table');
      const controls = [document.querySelector('[data-comparison-tabs]'), content.querySelector('[data-comparison-controls]')];
      const top = () => [content.getBoundingClientRect().top, table.getBoundingClientRect().top];
      const ready = top();
      controls.forEach(node => { node.hidden = true; });
      const pending = top();
      controls.forEach(node => { node.hidden = false; });
      return { ready, pending, link: getComputedStyle(document.querySelector('.comparison-notes a')).textDecorationLine };
    });
    assert.deepEqual(positions.pending, positions.ready, 'binding must not move the content or table');
    assert.match(positions.link, /underline/, 'source links are distinguishable without relying on color');
  });
}

const names = { 'cloud-storage': 'LocalCloud GCS', firestore: 'LocalCloud Firestore', bigtable: 'LocalCloud Bigtable', spanner: 'LocalCloud Spanner', bigquery: 'LocalCloud BigQuery' };
// Counts come from the checked-in inventories so a refreshed document never needs this file edited.
const ids = { 'cloud-storage': 'gcs', firestore: 'firestore', bigtable: 'bigtable', spanner: 'spanner', bigquery: 'bigquery' };
const metrics = JSON.parse(readFileSync(new URL('../src/data/emulator-comparisons/index.json', import.meta.url), 'utf8'));
const stats = slug => metrics[ids[slug]];
const inventory = slug => JSON.parse(readFileSync(new URL(`../src/data/emulator-comparisons/${ids[slug]}.json`, import.meta.url), 'utf8'));
const defaultMode = slug => stats(slug).hasCompetitor ? 'advantages' : 'all';
// The categories a mode lists, in document order; a category with no feature only LocalCloud has is hidden in advantages mode.
const categories = (slug, mode = defaultMode(slug)) => groupComparisonRows(inventory(slug)).filter(group => mode === 'all' || group.exclusive > 0);
const featureCount = (groups, mode) => groups.reduce((sum, group) => sum + (mode === 'all' ? group.total : group.exclusive), 0);
const entryStatus = (slug, mode = defaultMode(slug)) => { const groups = categories(slug, mode); return resultsText(featureCount(groups, mode), groups.length, mode); };
const categoryRows = `${activeTable} tr[data-comparison-category]`;
const visibleGroups = page => page.$$eval(categoryRows, nodes => nodes.filter(node => !node.hidden).length);
const openGroups = page => page.$$eval(`${categoryRows} button[aria-expanded="true"]`, nodes => nodes.length);
const rowCount = page => page.$$eval(`${activeTable} tr[data-feature-id]`, rows => rows.length);
// Opens every listed category and waits until each one has drawn its features.
const openAll = async page => {
  await page.$$eval(`${categoryRows}:not([hidden]) button[aria-expanded="false"]`, buttons => buttons.forEach(button => button.click()));
  await page.waitForFunction(selector => {
    const root = document.querySelector(selector);
    const mode = root.querySelector('input:checked').value;
    const expected = [...root.querySelectorAll('tr[data-comparison-category]:not([hidden])')].reduce((sum, row) => sum + Number(mode === 'all' ? row.dataset.total : row.dataset.exclusive), 0);
    return root.querySelectorAll('tr[data-feature-id]').length === expected;
  }, {}, activeTable);
};
const clickFirstCategory = async page => {
  await page.click(`${categoryRows}:not([hidden]) button`);
  await page.waitForSelector(`${activeTable} tr[data-feature-id]`);
  await settled(page);
};

test('large categories paint before all rows are ready and cancelled batches cannot return', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?features=all&view=classic', 390);
  await settled(page);
  const largest = categories('bigquery', 'all').reduce((a, b) => a.total > b.total ? a : b);
  const firstPaint = await page.$eval(activeTable, async (root, area) => {
    const category = [...root.querySelectorAll('[data-comparison-category]')].find(row => row.dataset.area === area);
    const painted = new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (!root.querySelector('[data-feature-id]')) return;
        observer.disconnect();
        requestAnimationFrame(() => resolve({ rows: root.querySelectorAll('[data-feature-id]').length, busy: root.ariaBusy }));
      });
      observer.observe(root.querySelector('tbody'), { childList: true });
    });
    category.querySelector('button').click();
    return painted;
  }, largest.area);
  assert.ok(firstPaint.rows > 0 && firstPaint.rows < largest.total, 'a frame shows the first results before the whole category is laid out');
  assert.equal(firstPaint.busy, 'true', 'assistive technology can distinguish a complete table');
  await page.$eval(`${categoryRows} button[aria-expanded="true"]`, button => button.click());
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await rowCount(page), 0, 'a cancelled batch cannot reopen a closed category');
  await settled(page);
  await page.$eval(activeTable, (root, area) => [...root.querySelectorAll('[data-comparison-category]')].find(row => row.dataset.area === area).querySelector('button').click(), largest.area);
  await settled(page);
  const shown = await page.$$eval(`${activeTable} [data-feature-id]`, rows => rows.map(row => row.dataset.featureId));
  assert.deepEqual(shown, inventory('bigquery').filter(row => row.area === largest.area).map(row => row.id), 'every row eventually appears once, in document order');
});

test('a new search cancels pending row batches and keeps only its latest results', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?features=all&view=classic', 390);
  await settled(page);
  await page.$eval(activeTable, async root => {
    const category = [...root.querySelectorAll('[data-comparison-category]')].sort((a, b) => Number(b.dataset.total) - Number(a.dataset.total))[0];
    category.querySelector('button').click();
    await Promise.resolve();
    const input = root.querySelector('input[type="search"]');
    for (const value of ['v', 'vector', 'no-such-feature-xyz']) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await settled(page);
  assert.equal(await rowCount(page), 0);
  assert.equal(await visibleGroups(page), 0);
  assert.match(await status(page), /No matching features/);
  assert.equal(new URL(page.url()).searchParams.get('q'), 'no-such-feature-xyz');
  await page.$eval(`${activeTable} input[type="search"]`, input => { input.value = 'sql.function.abs'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await settled(page);
  assert.ok(await page.$(`${activeTable} [data-feature-id="sql.function.abs"]`), 'search still recovers after cancelled work');
  await page.click(`${categoryRows}:not([hidden]) button`);
  await settled(page);
  assert.equal(await rowCount(page), 0, 'a reader can collapse a matching category while the search is active');
  await page.click(`${categoryRows}:not([hidden]) button`);
  await settled(page);
  assert.ok(await page.$(`${activeTable} [data-feature-id="sql.function.abs"]`));
});

for (const slug of Object.keys(ids)) {
  test(`${slug}: categories are table rows that start collapsed, count what is supported and open to documented features`, { timeout: 60000 }, async t => {
    const page = await open(t, `/compare/emulators/${slug}/?view=classic`);
    await settled(page);
    const service = stats(slug), mode = defaultMode(slug), groups = categories(slug);
    assert.equal(await visibleGroups(page), groups.length, 'one category row per document section that has something to show');
    assert.equal(await openGroups(page), 0, 'categories are collapsed by default');
    assert.equal(await rowCount(page), 0, 'no feature rows until a category opens');
    assert.equal(await page.$$eval('main details', nodes => nodes.length), 0, 'categories are rows of the one table, not separate widgets');
    assert.equal(await page.$$eval('main table', nodes => nodes.length), 1);
    assert.equal(await status(page), entryStatus(slug));
    assert.deepEqual(await page.$$eval(`${categoryRows}:not([hidden]) .comparison-category-name`, nodes => nodes.map(node => node.textContent)), groups.map(group => group.area));
    const numbers = await page.$$eval(`${categoryRows}:not([hidden])`, rows => rows.map(row => {
      const [supported, missing] = [row.children[1], row.children[2]].map(cell => cell.querySelector('.comparison-count'));
      return { area: row.dataset.area, supported: supported.querySelector('.sr-only').textContent, supportedGlyph: supported.firstElementChild.textContent, supportedClass: supported.className,
        supportedColor: getComputedStyle(supported).color, missing: missing.querySelector('.sr-only').textContent, missingGlyph: missing.firstElementChild.textContent,
        missingClass: missing.className, missingColor: getComputedStyle(missing).color, details: row.children[3].textContent.trim(), cells: row.children.length };
    }));
    for (const [index, group] of groups.entries()) {
      const row = numbers[index];
      assert.equal(row.supported, `${group.supported} supported`, `${group.area}: LocalCloud's number counts the features it supports`);
      assert.equal(row.missing, `${group.missing} not supported`, `${group.area}: the competitor's number counts the features it lacks`);
      assert.equal(row.supportedGlyph, group.supported ? `✓ ${group.supported}` : '0');
      assert.equal(row.missingGlyph, group.missing ? `✕ ${group.missing}` : '0');
      assert.match(row.supportedClass, group.supported ? /comparison-count--supported/ : /comparison-count--zero/);
      assert.match(row.missingClass, group.missing ? /comparison-count--missing/ : /comparison-count--zero/);
      if (group.supported) assert.equal(row.supportedColor, 'rgb(19, 115, 51)');
      if (group.missing) assert.ok(contrastRatio(row.missingColor, 'rgb(241, 243, 244)') >= 4.5, 'missing counts meet WCAG AA on category rows');
      assert.equal(row.details, '', 'the Details cell of a category row stays empty');
      assert.equal(row.cells, service.hasCompetitor ? 4 : 3);
    }
    const meta = await page.$eval('.comparison-meta', node => node.textContent.replace(/\s+/g, ' ').trim());
    assert.equal(meta.replace(/ \(not in [^)]+\)$/, ''), `${service.total.toLocaleString('en-US')} features in total · ${service.exclusive.toLocaleString('en-US')} only available in LocalCloud`);
    assert.match(meta, /\(not in [^)]+\)$/, 'the line names the emulator the count is measured against');
    assert.equal(await page.$$eval('select', nodes => nodes.length), 0, 'categories replace the area filter');
    assert.equal(await page.$$eval('input[value="broader"]', nodes => nodes.length), 0);
    assert.equal(await page.$$eval('[data-comparison-controls] input[type="radio"]', radios => radios.length), service.hasCompetitor ? 2 : 1);
    assert.equal(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
    assert.ok(!await page.$eval('main', node => node.innerText.includes('JSON comparison view')));

    await clickFirstCategory(page);
    assert.equal(await openGroups(page), 1);
    assert.equal(await rowCount(page), mode === 'all' ? groups[0].total : groups[0].exclusive, 'a category lists the features it counts');
    assert.equal(await page.$eval(`${activeTable} thead th:nth-child(2)`, node => node.textContent.trim()), names[slug]);
    assert.equal(await page.$$eval(`${activeTable} thead th`, cells => cells.length), service.hasCompetitor ? 4 : 3);
    assert.equal(await page.$$eval(`${activeTable} tr[data-feature-id] th small`, nodes => nodes.length), 0, 'the category is a row, not repeated under each feature');
    assert.equal(await page.$eval(`${categoryRows}:not([hidden])`, row => row.nextElementSibling.dataset.featureId !== undefined), true, 'features sit directly under their category row');
    const sources = new Map(inventory(slug).map(row => [row.id, row]));
    const shown = await page.$$eval(`${activeTable} tr[data-feature-id]`, rows => rows.map(row => {
      const link = row.querySelector('.comparison-doc a');
      return { id: row.dataset.featureId, description: row.querySelector('td:last-child > p:first-child').textContent, href: link?.href, target: link?.target, rel: link?.rel, label: link?.firstElementChild.textContent, hidden: row.querySelector('.comparison-doc').hidden };
    }));
    for (const row of shown) {
      const source = sources.get(row.id);
      assert.ok(row.description.length > 20 && row.description === source.description, `${row.id}: the description explains the feature`);
      assert.equal(row.hidden, false, `${row.id}: every feature links its documentation`);
      assert.equal(row.href, new URL(source.docs).href);
      assert.equal(row.target, '_blank');
      assert.match(row.rel, /noopener/);
      assert.match(row.label, /^(?:Google Cloud|Firebase|Google) docs$/);
    }
    assert.equal(await page.$eval('.comparison-table td', node => getComputedStyle(node).paddingTop), '10px', 'dynamic rows retain compact table styling');
    await page.click(`${categoryRows}:not([hidden]) button`);
    assert.equal(await rowCount(page), 0, 'closing a category removes its features');
    assert.equal(await openGroups(page), 0);
    await page.click(`${categoryRows}:not([hidden]) button`);
    await page.waitForSelector(`${activeTable} tr[data-feature-id]`);

    if (service.hasCompetitor) {
      await choose(page, 'all');
      assert.equal(await visibleGroups(page), categories(slug, 'all').length);
      assert.equal(await rowCount(page), groups[0].total, 'All features lists every feature in the open category');
      assert.equal(await status(page), entryStatus(slug, 'all'));
    }
    await page.type(`${activeTable} input[type="search"]`, 'no-such-feature-xyz'); await settled(page);
    assert.match(await status(page), /No matching features/);
    assert.equal(await visibleGroups(page), 0);
    await page.$eval(`${activeTable} input[type="search"]`, input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }); await settled(page);
    assert.equal(await status(page), entryStatus(slug, service.hasCompetitor ? 'all' : mode));

    const last = inventory(slug).at(-1);
    await page.type(`${activeTable} input[type="search"]`, last.id); await settled(page);
    assert.ok(await page.$(`${activeTable} tr[data-feature-id="${last.id}"]`), 'a search opens the category holding the match');
    assert.match(await status(page), /^\d[\d,]* matching features? in \d+ categor(?:y|ies)\.$/);
    assert.equal(await page.$eval(`${categoryRows}:not([hidden]) small`, node => /matching feature/.test(node.textContent)), true, 'while searching a category row counts its matches');
    await page.$eval(`${activeTable} input[type="search"]`, input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }); await settled(page);
    assert.equal(await openGroups(page), 1, 'categories a search opened close again; the one the reader opened stays');
    assert.equal(await page.$eval(`${categoryRows}:not([hidden]) small`, node => /^\d[\d,]* features?$/.test(node.textContent)), true);
  });
}

test('mobile filters search the complete inventory and restore shared URL state', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?features=all&q=sql.function.abs&view=mobile&audience=humans&page=2', 390);
  await settled(page);
  assert.ok(await page.$eval('tr[data-feature-id]', row => row.textContent.includes('ABS')));
  assert.equal(await openGroups(page), await visibleGroups(page), 'every category with a match is open');
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
  assert.equal(await status(page), entryStatus('bigtable'));
  await page.click('[data-comparison-service="bigtable"] a.comparison-guide');
  await page.waitForSelector('[data-service-heading]');
  await page.click('main a[href*="/compare/emulators/?service=bigtable"]');
  await settled(page);
  assert.equal(await status(page), entryStatus('bigtable'));
});

test('blocked inventory fetch keeps the category list and can retry', { timeout: 30000 }, async t => {
  let client;
  const page = await open(t, '/compare/emulators/spanner/?view=classic', 1440, true, async page => {
    client = await page.createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.setBlockedURLs', { urls: ['*/_astro/spanner.*.json'] });
  });
  await settled(page);
  assert.match(await status(page), /Could not load/);
  assert.equal(await visibleGroups(page), categories('spanner').length, 'the category headers need no download');
  await client.send('Network.setBlockedURLs', { urls: [] });
  await choose(page, 'all');
  assert.equal(await status(page), entryStatus('spanner', 'all'));
  await page.click(`${activeTable} tr[data-comparison-category]:not([hidden]) button`);
  await page.waitForSelector(`${activeTable} tr[data-feature-id]`);
  assert.equal(await rowCount(page), categories('spanner', 'all')[0].total);
});

test('without JavaScript the categories remain listed with their counts and no download links', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/firestore/?view=classic', 390, false);
  const groups = categories('firestore');
  assert.equal(await page.$$eval(categoryRows, nodes => nodes.filter(node => !node.hidden).length), groups.length);
  assert.deepEqual(await page.$$eval(`${categoryRows}:not([hidden])`, rows => rows.map(row => [row.children[1].querySelector('.sr-only').textContent, row.children[2].querySelector('.sr-only').textContent])),
    groups.map(group => [`${group.supported} supported`, `${group.missing} not supported`]), 'the numbers are in the page without JavaScript');
  assert.equal(await page.$$eval('main a[download]', links => links.length), 0);
  assert.equal(await page.$eval('[data-comparison-controls]', node => node.hidden), true);
  assert.equal(await page.$$eval('tr[data-feature-id]', rows => rows.length), 0);
  assert.equal(await page.$eval(`${categoryRows} .comparison-chevron`, node => getComputedStyle(node).visibility), 'hidden', 'no expand affordance without JavaScript');
  assert.ok(await page.$eval('main', node => node.textContent.includes('Enable JavaScript to list the features in each category')));
});

test('agent audience exposes the complete JSON view with a documentation link for every row', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/bigquery/?view=classic&audience=agents');
  await settled(page);
  assert.notEqual(await page.$eval('[data-comparison-agent]', node => getComputedStyle(node).display), 'none');
  const data = await page.$eval('[data-comparison-agent] a', async link => (await fetch(link.href)).json());
  assert.equal(data.length, stats('bigquery').total);
  assert.ok(data.every(row => /^https:\/\/(?:docs\.)?cloud\.google\.com\//.test(row.docs)));
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
  assert.deepEqual(await page.$$eval('[role="tab"] small', nodes => nodes.map(node => node.textContent)),
    Object.keys(ids).map(slug => `${stats(slug).total.toLocaleString('en-US')} features · ${stats(slug).exclusive.toLocaleString('en-US')} only in LocalCloud`));
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
  assert.equal(await visibleGroups(page), categories('bigquery', 'all').length);
  await page.evaluate(() => window.workspaceMarker = 'retained');
  for (const slug of Object.keys(ids)) {
    await page.click(`[data-service-tab="${slug}"]`);
    await settled(page);
    assert.equal(new URL(page.url()).pathname, '/compare/emulators/');
    assert.equal(new URL(page.url()).searchParams.get('service'), slug);
    assert.equal(await page.evaluate(() => window.workspaceMarker), 'retained', 'tab switches never navigate');
    assert.equal(await page.$eval(`[data-comparison-service="${slug}"] .comparison-heading`, node => node.textContent.trim()), names[slug]);
    if (stats(slug).hasCompetitor) await choose(page, 'advantages');
    assert.equal(await visibleGroups(page), categories(slug).length);
    assert.equal(await status(page), entryStatus(slug));
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

test('mobile workspace keeps tabs above the categories and retains view and audience', { timeout: 30000 }, async t => {
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
  assert.equal(await status(page), entryStatus('spanner'));
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.dataset.serviceTab === 'firestore');
  await settled(page);
  assert.equal(await status(page), entryStatus('firestore'));
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
  await choose(page, 'all');
  await page.evaluate(() => window.releaseInventory());
  await page.waitForFunction(() => !document.querySelector('[data-comparison-service="spanner"] [data-emulator-comparison]').hasAttribute('aria-busy'));
  assert.equal(new URL(page.url()).searchParams.get('service'), 'firestore');
  assert.equal(new URL(page.url()).searchParams.get('features'), 'all');
  assert.equal(await status(page), entryStatus('firestore', 'all'));
});

test('workspace without JavaScript retains the category list and real service links', { timeout: 30000 }, async t => {
  const page = await open(t, '/compare/emulators/?view=classic', 390, false);
  assert.equal(await page.$$eval(`${categoryRows}`, nodes => nodes.filter(node => !node.hidden).length), categories('cloud-storage').length);
  assert.equal(await page.$eval('[role="tablist"]', tabs => tabs.hidden), true, 'interactive tabs stay hidden without JavaScript');
  assert.equal(await page.$eval('main a[href*="/compare/emulators/firestore/"]', node => new URL(node.href).pathname), '/compare/emulators/firestore/');
});

test('the first categories show immediately in Desktop, Classic and Mobile', { timeout: 30000 }, async t => {
  for (const [view, width] of [['desktop', 1440], ['classic', 1440], ['mobile', 390]]) {
    const page = await open(t, `/compare/emulators/?service=bigtable&view=${view}`, width);
    await page.setViewport({ width, height: 900 });
    await settled(page);
    const position = await page.$eval(`${activeTable} tr[data-comparison-category]:not([hidden]) button`, node => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom }));
    assert.ok(position.top > 0 && position.bottom < (view === 'mobile' ? 780 : 700), `${view}: the first category is visible with room for more (${JSON.stringify(position)})`);
    assert.equal(await page.$eval('[data-comparison-service="bigtable"] .comparison-heading', node => getComputedStyle(node).fontSize), '20px');
  }
});

test('a documented limit reads as a green check, never as a separate Scoped result', { timeout: 60000 }, async t => {
  const page = await open(t, '/compare/emulators/?view=classic');
  await settled(page);
  await choose(page, 'all');
  await openAll(page);
  const sources = new Map(inventory('cloud-storage').map(row => [row.id, row]));
  assert.ok([...sources.values()].some(row => row.local === 'limited') && [...sources.values()].some(row => row.other === 'limited'), 'the sample contains limited results on both sides');
  const marks = await page.$$eval(`${activeTable} tr[data-feature-id]`, rows => rows.map(row => ({ id: row.dataset.featureId, states: [...row.querySelectorAll('.comparison-state')].filter(node => !node.closest('[hidden]')).map(node => node.dataset.state) })));
  for (const row of marks) {
    const source = sources.get(row.id);
    assert.deepEqual(row.states, [comparisonMarkState(source.local), comparisonMarkState(source.other)], `${row.id}: a limited result shows the supported mark`);
  }
  assert.equal(await page.$$eval(`${activeTable} .comparison-state[data-state="limited"]`, nodes => nodes.length), 0);
  assert.ok(marks.every(row => !(row.states[0] === 'unavailable' && row.states[1] === 'unavailable')), 'a feature neither side supports is never listed');
  assert.ok(!await page.$eval('main', node => node.innerText.includes('Scoped')));
  const limited = [...sources.values()].find(row => row.local === 'limited' && row.notes);
  assert.ok(await page.$eval(`${activeTable} tr[data-feature-id="${limited.id}"]`, row => row.querySelector('.comparison-limit').textContent.startsWith('Note: ')), 'the limit stays visible as a note');
});

test('availability marks keep accessible labels, notes stay inline and profile duplicates disappear', { timeout: 60000 }, async t => {
  const markdown = readFileSync(new URL('../dist/compare/emulators/cloud-storage.md', import.meta.url), 'utf8');
  for (const group of categories('cloud-storage')) {
    assert.ok(markdown.includes(`${group.area} ${group.total} features`), `${group.area}: the Markdown twin lists each category with its size`);
    assert.ok(markdown.includes(`| ${group.supported} supported | ${group.missing} not supported |`), `${group.area}: and the two numbers`);
  }
  const listedCategories = markdown.split('\n').filter(line => line.startsWith('| ') && /\d+ features \|/.test(line)).map(line => line.split('|')[1].trim());
  assert.deepEqual(listedCategories, categories('cloud-storage').map(group => `${group.area} ${group.total} features`), 'the twin lists exactly the categories in the default filter');
  const page = await open(t, '/compare/emulators/?view=classic');
  await settled(page);
  await choose(page, 'all');
  await openAll(page);
  for (const [state, label, mark] of [['available', 'Available', '✓'], ['unavailable', 'Not available', '✕']]) {
    const output = await page.$eval(`${activeTable} .comparison-state[data-state="${state}"]`, node => {
      const mark = node.querySelector('.comparison-mark');
      return { label: node.querySelector('.comparison-label').textContent, hiddenMark: mark.getAttribute('aria-hidden'), mark: getComputedStyle(mark, '::before').content, color: getComputedStyle(mark, '::before').color };
    });
    const { color, ...accessible } = output;
    assert.deepEqual(accessible, { label, hiddenMark: 'true', mark: `"${mark}"` });
    assert.ok(contrastRatio(color, 'rgb(241, 243, 244)') >= 4.5, `${state} marks meet WCAG AA`);
  }
  const client = await page.createCDPSession();
  const { nodes } = await client.send('Accessibility.getFullAXTree');
  assert.ok(nodes.some(node => !node.ignored && node.name?.value === 'Available'));
  assert.ok(nodes.some(node => !node.ignored && node.name?.value === 'Not available'));
  const source = inventory('cloud-storage');
  const details = await page.$$eval(`${activeTable} tr[data-feature-id]`, rows => rows.map(row => {
    const [description, , limit] = row.lastElementChild.querySelectorAll(':scope > p');
    return { id: row.dataset.featureId, description: description.textContent, limit: limit && !limit.hidden ? limit.textContent : '' };
  }));
  assert.equal(details.length, source.length);
  for (const row of source) {
    const shown = details.find(item => item.id === row.id);
    assert.equal(shown.description, row.description, `${row.id}: the description is always shown`);
    assert.equal(shown.limit, row.notes ? `Note: ${presentComparisonNotes(row.notes)}` : '', `${row.id}: the limit note follows it when there is one`);
  }
  await page.click('[data-service-tab="firestore"]'); await settled(page);
  await choose(page, 'all');
  await openAll(page);
  const profiles = await page.$$eval(`${activeTable} tr[data-feature-id]`, rows => {
    const cell = rows.find(row => row.querySelector('th > span').textContent === 'Required composite-index rejection for queries').querySelector('td');
    return [...cell.querySelectorAll('.comparison-state')].map(node => ({ state: node.dataset.state, label: node.querySelector('.comparison-label').textContent }));
  });
  assert.deepEqual(profiles, [{ state: 'available', label: 'Available' }, { state: 'unavailable', label: 'Not available' }]);
  assert.ok(await page.$eval(`${activeTable} .comparison-state[data-state="unknown"]`, node => node.textContent.includes('Not assessed')));
  const firestore = inventory('firestore');
  const visibleProfiles = await page.$$eval(`${activeTable} tr[data-feature-id]`, rows => rows.map(row => ({ id: row.dataset.featureId,
    states: [...row.querySelector('td').querySelectorAll('.comparison-state')].filter(node => !node.closest('[hidden]')).map(node => node.dataset.state) })));
  for (const row of firestore) {
    const local = comparisonMarkState(row.local), other = comparisonMarkState(row.default);
    assert.deepEqual(visibleProfiles.find(result => result.id === row.id).states, other === local ? [local] : [local, other]);
  }
});

test('the longest comparison note and description remain fully visible as plain text', { timeout: 30000 }, async t => {
  const rows = inventory('bigquery');
  const row = rows.reduce((longest, row) => row.notes.length > longest.notes.length ? row : longest);
  const page = await open(t, `/compare/emulators/?service=bigquery&features=all&q=${encodeURIComponent(row.id)}&view=mobile`, 390);
  await settled(page);
  const read = selector => page.$eval(`${activeTable} tr[data-feature-id] td:last-child > ${selector}`, node => ({ text: node.textContent, display: getComputedStyle(node).display, clipped: node.scrollHeight > node.clientHeight + 1 }));
  const text = await read('.comparison-limit'), description = await read('p:first-child'), doc = await read('.comparison-doc');
  assert.equal(text.text, `Note: ${presentComparisonNotes(row.notes)}`);
  assert.equal(description.text, row.description);
  assert.match(doc.text, /^(?:Google Cloud|Firebase|Google) docs ↗/);
  for (const part of [text, description, doc]) { assert.notEqual(part.display, 'none'); assert.equal(part.clipped, false); }
  assert.equal(await page.$$eval('[data-comparison-workspace] details', nodes => nodes.length), 0);
});
