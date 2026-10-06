import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { expectedSearchRoutes, siteOrigin } from './search-routes.mjs';

const run = promisify(execFile);
const validator = new URL('./verify-live-seo.mjs', import.meta.url);

async function verifyFixture(t, overrides = {}) {
  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (!expectedSearchRoutes.some((route) => route.path === path)) {
      response.writeHead(404).end();
      return;
    }
    const html = path === '/' || path.endsWith('/');
    response.setHeader('Content-Type', html ? 'text/html' : 'text/plain');
    response.end(overrides[path] ?? (html
      ? `<html><head><link rel="canonical" href="${siteOrigin}${path}"></head><body>LocalCloud</body></html>`
      : '# LocalCloud\nRaw agent documentation.\n'));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  try {
    const output = await run(process.execPath, [validator.pathname], {
      env: {
        ...process.env,
        SEO_VERIFY_BASE_URL: `http://127.0.0.1:${server.address().port}`,
        SEO_VERIFY_ATTEMPTS: '1',
      },
    });
    return { code: 0, ...output };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

test('accepts HTML canonical URLs and raw Markdown/text without HTML tags', async (t) => {
  const result = await verifyFixture(t);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /verification passed/);
});

test('rejects an HTML fallback returned with HTTP 200 for a raw document', async (t) => {
  const result = await verifyFixture(t, { '/ai/agents.md': '<!doctype html><html>Fallback page</html>' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/ai\/agents\.md: raw document returned HTML/);
});

test('rejects an empty raw document', async (t) => {
  const result = await verifyFixture(t, { '/llms.txt': '  \n' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/llms\.txt: raw document is empty/);
});

test('continues to reject incorrect canonical URLs on HTML pages', async (t) => {
  const result = await verifyFixture(t, { '/docs/': '<html><head><link rel="canonical" href="https://wrong.example/docs/"></head></html>' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /\/docs\/: canonical https:\/\/wrong\.example\/docs\/ does not equal/);
});

test('fails in CI when no base URL is configured, and skips locally', async () => {
  const env = { ...process.env, SEO_VERIFY_BASE_URL: '' };
  delete env.CI;
  const local = await run(process.execPath, [validator.pathname], { env });
  assert.match(local.stdout, /skipped/);
  await assert.rejects(
    run(process.execPath, [validator.pathname], { env: { ...env, CI: 'true' } }),
    (error) => error.code === 1 && /requires SEO_VERIFY_BASE_URL in CI/.test(error.stderr),
  );
});
