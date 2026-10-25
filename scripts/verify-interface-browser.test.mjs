import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';

const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const dist = new URL('../dist/', import.meta.url);
const types = { '.html': 'text/html', '.mjs': 'application/javascript', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

test('shared dialogs, popups, narrow search and automatic weather work in a real browser', { timeout: 90_000 }, async t => {
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
  await page.waitForSelector('.desktop-view.desktop-ready');
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
  assert.deepEqual(errors, []);

  const automatic = await browser.newPage();
  await automatic.setViewport({ width: 1280, height: 800 });
  await automatic.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await automatic.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
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
