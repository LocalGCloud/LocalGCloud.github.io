import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import worker, { handleRequest } from '../worker/index.mjs';

// The Worker counts /install.sh downloads with one server-side PostHog event. These tests inject
// the transport and the execution context, so no real event is sent.
const origin = 'https://local.cloud';
const key = 'phc_test_project_key';
const script = '#!/bin/sh\necho install\n';

function assetEnv(status = 200, extra = {}) {
  return {
    POSTHOG_PROJECT_KEY: key,
    ...extra,
    ASSETS: { fetch: () => new Response(status === 304 ? null : script, { status, headers: { 'Content-Type': 'text/x-sh' } }) },
  };
}

function context() {
  const pending = [];
  return { pending, waitUntil: (promise) => pending.push(promise) };
}

function installRequest({ method = 'GET', headers = {}, country = 'DE', path = '/install.sh' } = {}) {
  const request = new Request(`${origin}${path}`, { method, headers });
  Object.defineProperty(request, 'cf', { value: { country, city: 'Berlin', latitude: '52.5', asn: 3320 } });
  return request;
}

async function fetchInstall(options = {}, env = assetEnv()) {
  const ctx = context();
  const sent = [];
  const response = await handleRequest(installRequest(options), env, async (request, init) => {
    sent.push({ request, init, body: await request.text() });
    return new Response('{"status":1}');
  }, ctx);
  await Promise.all(ctx.pending);
  return { response, sent, ctx };
}

test('a GET of /install.sh sends one anonymous install_script_fetched event', async () => {
  const { response, sent, ctx } = await fetchInstall({
    headers: { 'User-Agent': 'curl/8.7.1', 'CF-Connecting-IP': '203.0.113.7', 'X-Forwarded-For': '203.0.113.7', 'Cookie': 'session=secret' },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), script);
  assert.equal(ctx.pending.length, 1);
  assert.equal(sent.length, 1);
  const [{ request, init, body }] = sent;
  assert.equal(request.url, 'https://us.i.posthog.com/i/v0/e/');
  assert.equal(request.method, 'POST');
  assert.equal(request.headers.get('Content-Type'), 'application/json');
  for (const header of ['CF-Connecting-IP', 'X-Forwarded-For', 'X-Real-IP', 'Forwarded', 'Cookie', 'User-Agent', 'Referer']) {
    assert.equal(request.headers.get(header), null, `${header} must not reach PostHog`);
  }
  assert.ok(init.signal instanceof AbortSignal);
  const event = JSON.parse(body);
  assert.deepEqual(Object.keys(event).sort(), ['api_key', 'distinct_id', 'event', 'properties']);
  assert.equal(event.api_key, key);
  assert.equal(event.event, 'install_script_fetched');
  assert.match(event.distinct_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual(event.properties, {
    $process_person_profile: false,
    $geoip_disable: true,
    referrer_path: null,
    ua_family: 'curl',
    country: 'DE',
  });
  assert.doesNotMatch(body, /203\.0\.113\.7|Berlin|session=secret|\$ip/);
});

test('each download gets a new random distinct ID', async () => {
  const first = JSON.parse((await fetchInstall()).sent[0].body);
  const second = JSON.parse((await fetchInstall()).sent[0].body);
  assert.notEqual(first.distinct_id, second.distinct_id);
});

test('only a local.cloud referrer path is recorded, without query or fragment', async () => {
  for (const [referrer, expected] of [
    ['https://local.cloud/docs/?utm_source=newsletter#install-the-cli', '/docs/'],
    ['https://www.local.cloud/pricing/', '/pricing/'],
    ['https://github.com/example/private-repo/blob/main/README.md?token=x', null],
    ['not a url', null],
  ]) {
    const event = JSON.parse((await fetchInstall({ headers: { Referer: referrer } })).sent[0].body);
    assert.equal(event.properties.referrer_path, expected, referrer);
  }
});

test('the user agent is reduced to curl, wget or other', async () => {
  for (const [agent, family] of [
    ['curl/8.7.1', 'curl'],
    ['Wget/1.21.4', 'wget'],
    ['Wget2/2.1.0', 'wget'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) curl/8', 'other'],
    ['', 'other'],
  ]) {
    const event = JSON.parse((await fetchInstall({ headers: { 'User-Agent': agent } })).sent[0].body);
    assert.equal(event.properties.ua_family, family, agent);
  }
  // Without Cloudflare request metadata (local tools), the country is null.
  const ctx = context();
  let body;
  await handleRequest(new Request(`${origin}/install.sh`), assetEnv(), async (request) => {
    body = await request.text();
    return new Response('{}');
  }, ctx);
  await Promise.all(ctx.pending);
  assert.equal(JSON.parse(body).properties.country, null);
});

test('the install script response is returned unchanged and before the event completes', async () => {
  const served = new Response(script, { status: 200, headers: { 'Content-Type': 'text/x-sh', 'Cache-Control': 'public, max-age=300' } });
  const ctx = context();
  let calls = 0;
  const response = await handleRequest(installRequest(), { POSTHOG_PROJECT_KEY: key, ASSETS: { fetch: () => served } },
    () => { calls++; return new Promise(() => {}); }, ctx);
  assert.equal(response, served, 'the asset response object is returned as is');
  assert.equal(await response.text(), script);
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
  assert.equal(ctx.pending.length, 1, 'the event is handed to waitUntil');
  await Promise.resolve();
  assert.equal(calls, 1);
});

test('upstream failures are swallowed and never reach the download', async () => {
  for (const send of [
    () => { throw new Error('synchronous failure'); },
    async () => { throw new Error('network failure'); },
    async () => new Response('rate limited', { status: 429 }),
  ]) {
    const ctx = context();
    const response = await handleRequest(installRequest(), assetEnv(), send, ctx);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), script);
    await assert.doesNotReject(Promise.all(ctx.pending));
  }
  // A context that throws from waitUntil does not break the download either.
  const response = await handleRequest(installRequest(), assetEnv(), async () => new Response('ok'),
    { waitUntil: () => { throw new Error('context failure'); } });
  assert.equal(await response.text(), script);
});

test('no event for HEAD, non-200 responses, other paths, or without a key or context', async () => {
  const never = () => assert.fail('no event expected');
  const cases = [
    [installRequest({ method: 'HEAD' }), assetEnv(), context()],
    [installRequest(), assetEnv(304), context()],
    [installRequest(), assetEnv(404), context()],
    [installRequest({ path: '/install.sh.sig' }), assetEnv(), context()],
    [installRequest({ path: '/docs/install.sh' }), assetEnv(), context()],
    [installRequest(), assetEnv(200, { POSTHOG_PROJECT_KEY: '' }), context()],
    [installRequest(), assetEnv(), undefined],
  ];
  for (const [request, env, ctx] of cases) {
    await handleRequest(request, env, never, ctx);
    assert.equal(ctx?.pending.length ?? 0, 0, `${request.method} ${new URL(request.url).pathname}`);
  }
});

test('the Worker entry point passes its execution context through', async () => {
  const realFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (request) => { sent.push(request.url); return new Response('{}'); };
  try {
    const ctx = context();
    const response = await worker.fetch(installRequest(), assetEnv(), ctx);
    await Promise.all(ctx.pending);
    assert.equal(await response.text(), script);
    assert.deepEqual(sent, ['https://us.i.posthog.com/i/v0/e/']);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('the Worker key is the public project key the pages already embed', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const pageKey = layout.match(/posthog\.init\('(phc_[A-Za-z0-9]+)'/)?.[1];
  assert.ok(pageKey, 'BaseLayout must initialize PostHog with its project key');
  assert.equal(config.vars?.POSTHOG_PROJECT_KEY, pageKey);
});
