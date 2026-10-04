import assert from 'node:assert/strict';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';
import { compressHtml } from '../worker/static-response.mjs';
import { handleRequest } from '../worker/index.mjs';

const html = '<!doctype html><html><body>LocalCloud — ' + 'static content '.repeat(400) + '</body></html>';
function asset(body = html, extra = {}) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate, no-transform',
      'Content-Length': String(Buffer.byteLength(html)),
      'Content-Security-Policy': "script-src 'sha256-example' 'strict-dynamic'",
      'ETag': '"release-content"',
      'Vary': 'Origin',
    },
    ...extra,
  });
}
function request(encoding, extra = {}) {
  return new Request('https://local.cloud/docs/', {
    headers: encoding === undefined ? {} : { 'Accept-Encoding': encoding },
    ...extra,
  });
}

test('gzip preserves the exact HTML and CSP while reducing its transfer size', async () => {
  const response = compressHtml(request('br, gzip, deflate'), asset());
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(gunzipSync(bytes).toString(), html);
  assert.ok(bytes.length < Buffer.byteLength(html) / 4);
  assert.equal(response.headers.get('Content-Encoding'), 'gzip');
  assert.equal(response.headers.get('Content-Length'), null);
  assert.equal(response.headers.get('Vary'), 'Origin, Accept-Encoding');
  assert.equal(response.headers.get('ETag'), 'W/"release-content"');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate, no-transform');
  assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'sha256-example' 'strict-dynamic'");
});

test('compression honors explicit gzip exclusions and quality values', async () => {
  for (const encoding of [undefined, 'br', 'gzip;q=0', 'gzip;q=0, *;q=1', '*;q=0', 'gzip;q=invalid']) {
    const response = compressHtml(request(encoding), asset());
    assert.equal(response.headers.get('Content-Encoding'), null, encoding);
    assert.equal(await response.text(), html);
    assert.match(response.headers.get('Vary'), /Accept-Encoding/);
  }
  for (const encoding of ['GZIP', 'gzip; q=0.5', '*;q=0.2', '*;q=0, gzip;q=1']) {
    assert.equal(compressHtml(request(encoding), asset()).headers.get('Content-Encoding'), 'gzip', encoding);
  }
});

test('HEAD advertises the same gzip representation without sending a body', async () => {
  const response = compressHtml(request('gzip', { method: 'HEAD' }), asset(null));
  assert.equal(response.headers.get('Content-Encoding'), 'gzip');
  assert.equal(response.headers.get('Content-Length'), null);
  assert.equal(response.headers.get('ETag'), 'W/"release-content"');
  assert.equal(await response.text(), '');
});

test('range, encoded, binary and non-read requests retain their original response', () => {
  const cases = [
    [request('gzip', { headers: { 'Range': 'bytes=0-20', 'Accept-Encoding': 'gzip' } }), asset()],
    [request('gzip'), asset('encoded', { headers: { 'Content-Type': 'text/html', 'Content-Encoding': 'br' } })],
    [request('gzip'), asset('partial', { status: 206, headers: { 'Content-Type': 'text/html', 'Content-Range': 'bytes 0-6/100' } })],
    [request('gzip'), asset('font', { headers: { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=31536000, immutable' } })],
    [request('gzip', { method: 'POST' }), asset()],
    [request('gzip'), new Response(null, { status: 304 })],
    [request('gzip'), new Response(null, { status: 301, headers: { Location: '/docs/' } })],
  ];
  for (const [req, response] of cases) assert.equal(compressHtml(req, response), response);
});

test('HTML 404 responses keep their status and decompress correctly', async () => {
  const response = compressHtml(request('gzip'), asset(html, { status: 404 }));
  assert.equal(response.status, 404);
  assert.equal(gunzipSync(Buffer.from(await response.arrayBuffer())).toString(), html);
});

test('asset requests use compression without contacting the analytics upstream', async () => {
  const req = request('gzip');
  const response = await handleRequest(req, {
    ASSETS: { fetch: (received) => { assert.equal(received, req); return asset(); } },
  }, () => assert.fail('HTML requests must not contact PostHog'));
  assert.equal(gunzipSync(Buffer.from(await response.arrayBuffer())).toString(), html);
});
