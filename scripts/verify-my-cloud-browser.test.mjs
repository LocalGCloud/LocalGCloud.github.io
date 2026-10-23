import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import test, { before, after } from 'node:test';
import puppeteer from 'puppeteer-core';

const origin = 'https://local.cloud';
const consoleURL = 'http://localhost:5380/';
const dist = new URL('../dist/', import.meta.url);
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const consoleServer = createServer((_, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<title>Local Console</title>'); });
let ownsConsole;
before(async () => {
  try {
    await new Promise((resolve, reject) => { consoleServer.once('error', reject); consoleServer.listen(5380, '127.0.0.1', resolve); });
    ownsConsole = true;
  } catch (error) { if (error.code !== 'EADDRINUSE') throw error; }
  assert.equal((await fetch(consoleURL)).status, 200, 'the local console must actually be running');
});
after(async () => { if (ownsConsole) await new Promise(resolve => consoleServer.close(resolve)); });

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));

for (const permission of [undefined, 'denied', 'granted']) {
  test(`the built launcher stays on the page until the console answers with ${permission || 'default'} browser permissions`, { timeout: 30_000 }, async (t) => {
    assert.ok(executablePath, 'Chrome is required for the localhost permission regression test');
    const browser = await puppeteer.launch({ executablePath, headless: true });
    t.after(() => browser.close());
    const client = await browser.target().createCDPSession();
    if (permission) await client.send('Browser.setPermission', { permission: { name: 'loopback-network' }, setting: permission, origin });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setRequestInterception(true);
    // Probes wait here, like a browser prompt or a slow container, until the test answers them.
    const held = [];
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin) {
        if (request.url() === consoleURL) held.push(request);
        else await request.abort();
        return;
      }
      try {
        const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const contentType = /\.(m?js)$/.test(path) ? 'application/javascript' : /\.css$/.test(path) ? 'text/css'
          : /\.svg$/.test(path) ? 'image/svg+xml' : /\.json$/.test(path) ? 'application/json' : /\.png$/.test(path) ? 'image/png' : 'text/html';
        await request.respond({ status: 200, contentType, body: readFileSync(new URL(path, dist)) });
      } catch { await request.abort(); }
    });
    await page.goto(origin + '/', { waitUntil: 'networkidle0' });
    const nextProbe = async () => { while (!held.length) await pause(25); return held.shift(); };
    const dialogOpen = () => page.$eval('[data-my-cloud-dialog]', dialog => dialog.open);
    const pages = async () => (await browser.pages()).length;
    const before = await pages();

    if (permission === 'denied') {
      await page.click('[data-my-cloud]');
      await page.waitForFunction(() => document.querySelector('[data-my-cloud-dialog]').open);
      assert.deepEqual(await page.$eval('[data-my-cloud-setup]', setup => [setup.hidden, setup.open]), [false, false], 'an unchecked console gets setup one click away, not pushed open');
      assert.match(await page.$eval('[data-my-cloud-status]', status => status.textContent), /browser couldn’t check localhost/);
      assert.equal(held.length, 0, 'denied permission skips the probe');
    } else if (!permission) {
      await page.click('[data-my-cloud]');
      const probe = await nextProbe();
      assert.equal(await pages(), before, 'a new tab would hide the browser prompt for localhost access');
      await page.waitForFunction(() => document.querySelector('[data-my-cloud-dialog]').open);
      assert.match(await page.$eval('[data-my-cloud-status]', status => status.textContent), /Checking localhost:5380/);
      await client.send('Browser.setPermission', { permission: { name: 'loopback-network' }, setting: 'granted', origin });
      await probe.continue();
      await page.waitForFunction(() => document.querySelector('[data-my-cloud-open]').classList.contains('is-running'));
      assert.equal(await page.$eval('[data-my-cloud-setup]', setup => setup.hidden), true, 'an answered prompt that finds the console never offers setup');
    } else {
      await page.click('[data-my-cloud]');
      let probe = await nextProbe();
      assert.equal(await pages(), before, 'no blank tab opens while the console is being checked');
      assert.equal(await dialogOpen(), false, 'a quick check never flashes the dialog');
      const consoleTarget = browser.waitForTarget(target => target.url() === consoleURL, { timeout: 12_000 });
      await probe.continue();
      const target = await consoleTarget;
      assert.equal(await dialogOpen(), false, 'a confirmed response opens the console');
      await (await target.page()).close();
      await page.bringToFront();

      await page.click('[data-my-cloud]');
      probe = await nextProbe();
      await probe.abort('connectionrefused');
      await page.waitForFunction(() => document.querySelector('[data-my-cloud-dialog]').open);
      assert.deepEqual(await page.$eval('[data-my-cloud-setup]', setup => [setup.hidden, setup.open]), [false, true], 'a console that is not running opens setup');
      assert.equal(await pages(), before, 'a console that is not running never gets a blank tab');
      await page.click('[data-my-cloud-retry]');
      probe = await nextProbe();
      await probe.continue();
      await page.waitForFunction(() => document.querySelector('[data-my-cloud-open]').classList.contains('is-running'));
      assert.equal(await page.$eval('[data-my-cloud-open]', link => link.textContent), '✓ Working now · Open console ↗');
    }
    assert.equal(await pages(), before, 'the launcher left no extra tab behind');
  });
}
