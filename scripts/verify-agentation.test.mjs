import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import agentation from './agentation-integration.mjs';
import { verifyNoAgentation } from './verify-no-agentation.mjs';

test('only explicitly opted-in development injects the toolbar entry', () => {
  const previous = process.env.LOCAL_AGENTATION;
  try {
    for (const flag of [undefined, '0', '1', 'true']) {
      if (flag === undefined) delete process.env.LOCAL_AGENTATION;
      else process.env.LOCAL_AGENTATION = flag;
      for (const command of ['dev', 'build', 'preview', 'sync']) {
        const injected = [];
        agentation.hooks['astro:config:setup']({ command, injectScript: (...args) => injected.push(args) });
        assert.equal(injected.length, flag === '1' && command === 'dev' ? 1 : 0, `${command}, flag=${flag}`);
        if (injected.length) assert.deepEqual(injected[0], ['page', 'import "/src/scripts/agentation-dev.mjs";']);
      }
    }
  } finally {
    if (previous === undefined) delete process.env.LOCAL_AGENTATION;
    else process.env.LOCAL_AGENTATION = previous;
  }
});

const source = readFileSync(new URL('../src/scripts/agentation-dev.mjs', import.meta.url), 'utf8')
  .replaceAll('import.meta', 'meta').replaceAll('import(', 'load(');

async function browser(hostname, development = true) {
  let mounted, cleanup, renders = 0, unmounts = 0, props;
  const loaded = [];
  const host = { remove() { mounted = undefined; } };
  const modules = {
    react: { createElement: (_, nextProps) => { props = nextProps; } },
    'react-dom/client': { createRoot: () => ({ render() { renders++; }, unmount() { unmounts++; } }) },
    agentation: { Agentation: () => {} },
  };
  const context = {
    location: { hostname },
    meta: { env: { DEV: development }, hot: { accept() {}, dispose(callback) { cleanup = callback; } } },
    document: { getElementById: () => mounted, createElement: () => host, body: { append(node) { mounted = node; } } },
    load: async name => { loaded.push(name); return modules[name]; },
  };
  const run = () => runInNewContext(`(async () => { ${source} })()`, context);
  await run();
  return { loaded, run, dispose: () => cleanup(), get mounted() { return mounted; },
    get renders() { return renders; }, get unmounts() { return unmounts; }, get props() { return props; } };
}

test('loopback development mounts once, connects locally, and cleans up for hot reload', async () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const page = await browser(hostname);
    assert.deepEqual(page.loaded, ['react', 'react-dom/client', 'agentation']);
    assert.equal(page.props.endpoint, 'http://localhost:4747');
    assert.equal(page.mounted.id, 'local-agentation-root');
    await page.run();
    assert.equal(page.renders, 1);
    assert.equal(page.loaded.length, 3, 'a second mount must not reload React');
    page.dispose();
    assert.equal(page.unmounts, 1);
    assert.equal(page.mounted, undefined);
    await page.run();
    assert.equal(page.renders, 2);
  }
});

test('non-loopback hosts and production never import Agentation or React', async () => {
  for (const hostname of ['local.cloud', '192.168.1.10', 'example.localhost', 'localhost.example.com']) {
    const page = await browser(hostname);
    assert.equal(page.loaded.length, 0, hostname);
    assert.equal(page.mounted, undefined);
  }
  assert.equal((await browser('localhost', false)).loaded.length, 0);
});

test('the production guard checks nested output, manifests and source maps', t => {
  const directory = mkdtempSync(join(tmpdir(), 'agentation-output-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, '_astro'));
  writeFileSync(join(directory, 'index.html'), '<main>LocalCloud</main>');
  const file = join(directory, '_astro', 'bundle.js.map');
  writeFileSync(file, '{"sources":["site-interactions.mjs"]}');
  assert.equal(verifyNoAgentation(directory), 2);
  for (const leak of ['agentation', 'http://localhost:4747', 'http://127.0.0.1:4747',
    'node_modules/react-dom/client.js', 'node_modules/react/index.js', 'react.transitional.element']) {
    writeFileSync(file, leak);
    assert.throws(() => verifyNoAgentation(directory), /Development-only visual feedback leaked/);
  }
  rmSync(file);
  writeFileSync(join(directory, 'asset-manifest.json'), '{"files":["/_astro/agentation-dev.js"]}');
  assert.throws(() => verifyNoAgentation(directory), /asset-manifest.json/);
  rmSync(join(directory, 'asset-manifest.json'));
  writeFileSync(join(directory, '_astro', 'agentation.js'), 'export {};');
  assert.throws(() => verifyNoAgentation(directory), /agentation.js/);
});
