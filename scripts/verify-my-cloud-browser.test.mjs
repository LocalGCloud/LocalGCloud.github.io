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

for (const permission of [undefined, 'denied', 'granted']) {
  test(`the built launcher opens a running Console with ${permission || 'default'} browser permissions`, { timeout: 30_000 }, async (t) => {
    assert.ok(executablePath, 'Chrome is required for the localhost permission regression test');
    const browser = await puppeteer.launch({ executablePath, headless: true });
    t.after(() => browser.close());
    if (permission) {
      const client = await browser.target().createCDPSession();
      await client.send('Browser.setPermission', { permission: { name: 'loopback-network' }, setting: permission, origin });
    }
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setRequestInterception(true);
    let probes = 0, blockProbe = false;
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin) {
        if (request.url() === consoleURL) { probes++; if (blockProbe) await request.abort('connectionrefused'); else await request.continue(); }
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
    const consoleTarget = browser.waitForTarget(target => target.url() === consoleURL, { timeout: 12_000 });
    await page.click('[data-my-cloud]');
    const target = await consoleTarget;
    assert.equal(await page.$eval('[data-my-cloud-dialog]', dialog => dialog.open), false, 'a blocked probe must never show installation');
    if (permission === 'denied') assert.equal(probes, 0, 'denied permission goes straight to the Console');
    if (permission === 'granted') {
      assert.ok(probes > 0, 'granted permission still performs the lightweight HTTP check');
      await (await target.page()).close();
      await page.bringToFront();
      blockProbe = true;
      await page.click('[data-my-cloud]');
      await page.waitForFunction(() => document.querySelector('[data-my-cloud-dialog]').open);
      assert.equal(await page.$eval('[data-my-cloud-setup]', setup => setup.hidden), false, 'failed checks with permission still offer setup');
      blockProbe = false;
      await page.click('[data-my-cloud-retry]');
      await page.waitForFunction(() => document.querySelector('[data-my-cloud-open]').classList.contains('is-running'));
      assert.equal(await page.$eval('[data-my-cloud-open]', link => link.textContent), '✓ Working now · Open console ↗');
    }
  });
}
