import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';

const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const dist = new URL('../dist/', import.meta.url);
const types = { '.mp4': 'video/mp4', '.html': 'text/html', '.mjs': 'application/javascript', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

async function verifyRollingHeadline(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('h1 .headline-drum')].some(element => element.getClientRects().length));
  const visibleCopy = await page.$$eval('.field-hero :is(.field-intro, .mobile-intro, .hero-facts)', elements => elements.filter(element => element.getClientRects().length).map(element => element.textContent.trim()));
  assert.equal(visibleCopy.length, 3, 'show one introduction, one facts line, and the free-use terms');
  assert.match(visibleCopy[0], /Run Google Cloud Services locally/);
  assert.equal(visibleCopy[1], 'No GCP account, credentials, or billing.');
  assert.equal(visibleCopy[2], 'Free to use');
  assert.equal(await page.$eval('.hero-facts a', link => link.pathname + link.hash), '/docs/licensing/#free-for-open-source-projects');
  assert.equal(await page.$('[data-headline-pause]'), null);
  const overlay = await page.$$eval('.hero-benefits', captions => {
    const caption = captions.find(element => element.getClientRects().length);
    const bounds = caption.getBoundingClientRect();
    const image = caption.previousElementSibling.getBoundingClientRect();
    return {
      labels: [...caption.children].map(badge => badge.textContent),
      overImage: bounds.left >= image.left && bounds.right <= image.right && bounds.top >= image.top && bounds.bottom <= image.bottom && image.bottom - bounds.bottom < 16,
    };
  });
  assert.deepEqual(overlay, { labels: ['$0 cost', 'No setup', 'Fast development'], overImage: true });
  const frame = time => page.evaluate(time => {
    const drum = [...document.querySelectorAll('h1 .headline-drum')].find(element => element.getClientRects().length);
    const animations = drum.getAnimations({ subtree: true });
    animations.forEach(animation => { animation.currentTime = time; });
    const faces = [...drum.querySelectorAll('[data-word]')];
    return {
      count: animations.length,
      words: faces.filter(face => +getComputedStyle(face).opacity > .99).map(face => face.dataset.word),
      transform: getComputedStyle(faces[0]).transform,
      width: drum.getBoundingClientRect().width,
    };
  }, time);
  const first = await frame(0);
  assert.equal(first.count, 6, 'each face has an intro and a steady loop');
  assert.deepEqual(first.words, ['AI agents.']);
  for (const [time, word] of [[1950, 'AI agents.'], [2750, 'developers.'], [4950, 'developers.'], [5750, 'CI pipelines.'], [8950, 'CI pipelines.'], [9750, 'AI agents.'], [13950, 'AI agents.'], [14750, 'developers.'], [18950, 'developers.'], [19750, 'CI pipelines.'], [23950, 'CI pipelines.'], [24750, 'AI agents.']]) {
    const next = await frame(time);
    assert.deepEqual(next.words, [word], `heading face at ${time}ms`);
    assert.equal(next.width, first.width, 'word changes reserve the longest width');
  }
  assert.notEqual((await frame(2100)).transform, first.transform, 'the transition rotates in 3D');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.equal((await frame(3100)).count, 0, 'reduced motion keeps the heading static');
  assert.equal(await page.$eval('h1', heading => heading.innerText.trim().replace(/\s+/g, ' ')), 'A local cloud for AI agents.');
  const accessibility = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
  assert.ok(accessibility.nodes.some(node => node.role?.value === 'heading' && node.name?.value === 'A local cloud for AI agents.'), 'accessible heading stays stable');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
}

async function verifyVisitorShortcuts(browser, base) {
  const page = await browser.newPage();
  const errors = [];
  let videoRequests = 0;
  const videoUrl = base + '/brand/localcloud-launch.mp4';
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url() === videoUrl) videoRequests++;
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
    localStorage.setItem('lc-desktop-weather', 'off');
    document.addEventListener('click', event => {
      if (event.target.matches('[data-contact-form] a[href^="mailto:"]')) {
        window.testEmailDraft = event.target.href;
        event.preventDefault();
      }
    }, true);
  });

  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(base + '/docs/', { waitUntil: 'load' });
  await page.waitForSelector('.desktop-ready');
  const desktopDemo = '.desktop-shortcuts [data-open-demo]';
  const demo = '[data-demo-player]';
  await page.waitForSelector(desktopDemo, { visible: true });
  assert.equal(videoRequests, 0, 'the player loads no video before activation');
  assert.equal(await page.$eval('.desktop-shortcuts a[href="/docs/mcp/"]', link => link.innerText), 'MCP');
  await page.focus(desktopDemo);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-demo-player] video')?.currentTime > 0);
  assert.equal(await page.$eval(demo, dialog => dialog.matches(':modal')), true);
  assert.ok(Math.abs(await page.$eval(demo + ' video', video => video.duration) - 50.7) < 0.1);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close demo');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-demo-player] video').hasAttribute('src'));
  assert.equal(await page.$eval(desktopDemo, link => link === document.activeElement), true, 'closing restores keyboard focus');
  assert.equal(await page.$eval(demo + ' video', video => video.paused), true);
  assert.ok(videoRequests > 0);

  const codes = { mcp: 'plug', demo: 'monitor-play', contact: 'headset', quickstart: 'quick-guide', changelog: 'history' };
  assert.equal((await page.$$('.desktop-shortcuts a.desktop-shortcut')).length, 13);
  const glyphs = await page.$$eval('.desktop-shortcuts a > svg', icons => Object.fromEntries(icons.map(icon => [
    icon.parentElement.dataset.desktopShortcut,
    [icon.querySelector('use').getAttribute('href').split('#')[1], icon.getBoundingClientRect().width],
  ])));
  assert.deepEqual(glyphs, Object.fromEntries(Object.entries(codes).map(([id, glyph]) => [id, [glyph, 44]])));
  assert.equal((await page.$$('.desktop-shortcuts a > img')).length, 8);
  await page.evaluate(() => { window.testShortcut = document.querySelector('[data-desktop-shortcut="demo"]'); });
  await page.click('[data-arrange-icons]');
  await page.waitForSelector('[data-desktop-arranging] .desktop-arrange-controls', { visible: true });
  const from = await (await page.$(desktopDemo)).boundingBox();
  const to = await (await page.$('[data-desktop-shortcut="home"]')).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForSelector('.desktop-shortcuts-left [data-open-demo]');
  await page.focus('[data-my-cloud]');
  await page.keyboard.press('ArrowLeft');
  await page.waitForSelector('.desktop-shortcuts-left [data-my-cloud]');
  assert.equal(new URL(page.url()).pathname, '/docs/');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('[data-arrange-icons]', button => button.getAttribute('aria-pressed')), 'false');
  await page.click('.desktop-navigation > a[href="/"]');
  await page.waitForFunction(() => location.pathname === '/' && document.querySelector('h1').classList.contains('field-hero__headline'));
  assert.equal(await page.$eval('.desktop-shortcuts-left [data-open-demo]', link => window.testShortcut === link), true);
  assert.equal((await page.$$('.desktop-shortcuts a.desktop-shortcut')).length, 13);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.desktop-shortcuts-left [data-my-cloud]');
  await page.waitForSelector('.desktop-shortcuts-left [data-open-demo]');
  await page.click('[data-arrange-icons]');
  await page.waitForSelector('[data-reset-layout]', { visible: true });
  await page.click('[data-reset-layout]');
  await page.waitForSelector('.desktop-shortcuts-right [data-my-cloud]');
  await page.waitForSelector('.desktop-shortcuts-right [data-open-demo]');
  assert.equal(await page.evaluate(() => localStorage.getItem('lc-desktop-layout')), null);
  await page.click('[data-arrange-icons]');

  await page.click('.desktop-shortcuts a[href="/contact/#contact-form"]');
  await page.waitForSelector('[data-contact-form]', { visible: true });
  assert.equal(new URL(page.url()).hash, '#contact-form');
  await page.click('[data-contact-form] button');
  assert.equal(await page.evaluate(() => window.testEmailDraft), undefined, 'an incomplete form does not launch email');
  await page.type('[name="subject"]', 'Licensing & MCP');
  await page.type('[name="message"]', 'First line\nSecond line + #');
  await page.click('[data-contact-form] button');
  const url = new URL(await page.evaluate(() => window.testEmailDraft));
  assert.equal(url.pathname, 'info@local.cloud');
  assert.equal(url.searchParams.get('subject'), 'Licensing & MCP');
  assert.equal(url.searchParams.get('body'), 'First line\r\nSecond line + #');

  await page.setViewport({ width: 320, height: 812 });
  await page.goto(base + '/', { waitUntil: 'load' });
  const responsiveDemo = '.hero-shortcuts [data-open-demo]';
  await page.waitForSelector(responsiveDemo, { visible: true });
  await page.click(responsiveDemo);
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[data-demo-player]');
    if (!dialog) return false;
    const { left, right } = dialog.getBoundingClientRect();
    return dialog.matches(':modal') && left >= 0 && right <= innerWidth;
  });
  await page.click(demo + ' button');
  await page.waitForFunction(() => !document.querySelector('[data-demo-player]').open);
  await page.click('.hero-shortcuts a[href*="/contact/"][href$="#contact-form"]');
  await page.waitForSelector('#contact-form-title', { visible: true });
  await page.waitForFunction(() => document.querySelector('#contact-form-title').getBoundingClientRect().top
    >= document.querySelector('.site-header').getBoundingClientRect().bottom);

  await page.setJavaScriptEnabled(false);
  await page.goto(base + '/?view=classic', { waitUntil: 'load' });
  assert.equal(await page.$eval(responsiveDemo, link => link.href), videoUrl);
  assert.deepEqual(errors, []);
  await page.close();
}

test('shared dialogs, rolling headline, narrow search and automatic weather work in a real browser', { timeout: 90_000 }, async t => {
  assert.ok(executablePath, 'Chrome is required for interface regression checks');
  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/api/weather') {
      setTimeout(() => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ theme: 'rain', expiresAt: Date.now() + 1800000 })); }, 200);
      return;
    }
    try {
      let file = new URL('.' + path, dist);
      if (!file.href.startsWith(dist.href)) throw Error('outside assets');
      if (statSync(file).isDirectory()) file = new URL('index.html', file.href.replace(/\/?$/, '/'));
      response.writeHead(200, { 'Content-Type': types[extname(file.pathname)] || 'application/octet-stream' });
      response.end(readFileSync(file));
    } catch { response.writeHead(404); response.end(); }
  });
  if (!process.env.INTERFACE_BASE_URL) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.INTERFACE_BASE_URL || `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath, headless: true });
  t.after(async () => { await browser.close(); if (server.listening) await new Promise(resolve => server.close(resolve)); });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 800 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
    localStorage.setItem('lc-desktop-weather', 'off');
    localStorage.setItem('lc-weather-motion', 'play');
  });
  await page.goto(base + '/', { waitUntil: 'load' });
  await verifyRollingHeadline(page);
  await page.waitForSelector('.desktop-view.desktop-ready');
  assert.equal(await page.evaluate(() => {
    const animations = document.querySelector('h1').getAnimations({ subtree: true });
    animations.forEach(animation => { animation.currentTime = 14_750; });
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    return animations.length > 0 && animations.every(animation => animation.currentTime === 0);
  }), true, 'a restored visit restarts the intro cadence');
  // Chromium can expose browser-chrome traversal as body focus. Native inertness
  // must prevent every actual page control outside the modal from taking focus.
  const inside = selector => page.$eval(selector, element => element.contains(document.activeElement) || element.matches(':modal') && document.activeElement === document.body);
  const searchTrigger = '.desktop-toolbar [data-search-trigger]';
  await page.click(searchTrigger);
  await page.waitForFunction(() => document.querySelector('#search-modal').open);
  assert.equal(await page.$eval('#search-modal', dialog => dialog.matches(':modal')), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'search-input');
  assert.equal(await page.$eval(searchTrigger, button => { button.focus(); return button === document.activeElement; }), false, 'background controls are inert');
  await page.type('#search-input', 'bigquery');
  await page.waitForSelector('.search-modal__result');
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    assert.equal(await inside('#search-modal'), true, 'focus stays in Search');
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#search-modal', dialog => dialog.open), false);
  assert.equal(await page.$eval(searchTrigger, button => button === document.activeElement), true, 'Search restores its trigger');
  await page.click(searchTrigger);
  await page.click('.search-modal__kbd');
  assert.equal(await page.$eval('#search-modal', dialog => dialog.hidden), true, 'Search has a pointer close control');
  await page.click(searchTrigger);
  await page.mouse.click(5, 5);
  assert.equal(await page.$eval('#search-modal', dialog => dialog.open), false, 'Search dismisses outside its panel');

  await page.focus(searchTrigger);
  await page.keyboard.press('?');
  await page.waitForFunction(() => document.querySelector('.kbd-help')?.open);
  assert.equal(await inside('.kbd-help'), true, 'help moves focus inside');
  await page.keyboard.press('Tab');
  assert.equal(await inside('.kbd-help'), true, 'help contains focus');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(searchTrigger, button => button === document.activeElement), true, 'help restores focus');

  await page.click('.desktop-navigation a[href="/docs/"]');
  await page.waitForFunction(() => location.pathname === '/docs/' && !document.querySelector('[data-desktop-content]').hasAttribute('aria-busy'));
  const accessibility = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
  assert.ok(accessibility.nodes.some(node => node.role?.value === 'navigation' && node.name?.value === 'History'), 'recent-page previews belong to a named navigation landmark');

  const explore = '.desktop-navigation details:first-of-type';
  await page.click(explore + ' summary');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(explore, menu => menu.open), false);
  assert.equal(await page.$eval(explore + ' summary', summary => summary === document.activeElement), true);
  await page.click(explore + ' summary');
  await page.click('h1');
  assert.equal(await page.$eval(explore, menu => menu.open), false, 'Explore dismisses outside');
  await page.click('[data-weather] summary');
  await page.waitForSelector('[data-weather-pause]');
  await page.click('[data-weather-choice="rain"]');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('[data-weather]', menu => menu.open), false, 'Theme dismisses with Escape');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.desktopWeather), 'rain');
  await page.click('[data-weather] summary');
  await page.click('[data-weather-pause]');
  assert.equal(await page.$eval('[data-weather-pause]', button => button.getAttribute('aria-pressed')), 'true');
  await page.click('h1');
  assert.equal(await page.$eval('[data-weather]', menu => menu.open), false);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.desktopWeather), 'rain', 'dismissing does not stop the theme');

  await page.setViewport({ width: 320, height: 812 });
  await page.waitForSelector('.mobile-view');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  await page.click('.mobile-search');
  assert.equal(await page.$eval('.search-modal__container', element => { const r = element.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), true);
  assert.equal(await page.$eval('.search-modal__kbd', element => { const r = element.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), true, 'close control stays reachable at 320px');
  await page.click('.search-modal__kbd');
  await page.click('#site-nav-toggle');
  await page.focus('#site-nav-mobile a');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'site-nav-toggle');
  await page.goBack();
  await page.waitForSelector('h1 .headline-drum');
  await verifyRollingHeadline(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320, 'longest heading word fits on mobile after remount');
  await page.goto(base + '/?view=classic', { waitUntil: 'load' });
  await verifyRollingHeadline(page);
  await page.goto(base + '/?audience=agents', { waitUntil: 'load' });
  assert.equal(await page.$eval('h1', heading => heading.getAnimations({ subtree: true }).length), 0, 'agent document stays static');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(base + '/?view=classic&audience=humans&headline=roll', { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.querySelectorAll('h1 [data-word="developers."]')].some(face => face.getClientRects().length && Number(getComputedStyle(face).opacity) > .99));
  await page.goto(base + '/?view=classic', { waitUntil: 'load' });
  assert.equal(await page.$eval('h1', heading => heading.getAnimations({ subtree: true }).length), 0, 'the animation override stays with its URL');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setJavaScriptEnabled(false);
  await page.goto(base + '/?view=classic', { waitUntil: 'load' });
  await verifyRollingHeadline(page);
  assert.deepEqual(errors, []);

  await verifyVisitorShortcuts(browser, base);

  const automatic = await browser.newPage();
  await automatic.setViewport({ width: 1280, height: 800 });
  await automatic.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await automatic.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
    localStorage.setItem('lc-audience', 'humans');
    localStorage.setItem('lc-desktop-weather', 'auto'); localStorage.setItem('lc-weather-motion', 'play');
  });
  const forecast = automatic.waitForResponse(response => new URL(response.url()).pathname === '/api/weather');
  await automatic.goto(base + '/', { waitUntil: 'load' });
  assert.equal(await automatic.evaluate(() => document.documentElement.dataset.desktopWeather), undefined, 'main theme paints before weather');
  const result = await forecast;
  assert.equal(result.status(), 200);
  const data = await result.json();
  assert.ok(['off', 'rain', 'sun', 'snow', 'autumn'].includes(data.theme));
  await automatic.waitForFunction(theme => (document.documentElement.dataset.desktopWeather || 'off') === theme, {}, data.theme);
  const timing = await automatic.evaluate(() => {
    const request = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/api/weather');
    return { request: request.startTime, load: performance.getEntriesByType('navigation')[0].loadEventEnd };
  });
  assert.ok(timing.request - timing.load >= 1400, 'weather waits until after load plus its delay');
});
