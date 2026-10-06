import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  carryPreviousAssets, listAstroAssets, manifestFile, parseManifest, planCarryOver, serializeManifest, writeManifest,
} from './asset-manifest.mjs';

const liveUrl = 'https://local.cloud/asset-manifest.json';

// A dist/ directory holding the given /_astro/ files and the manifest the build writes for them.
function build(files) {
  const dist = mkdtempSync(join(tmpdir(), 'asset-manifest-'));
  for (const [file, body] of Object.entries(files)) {
    mkdirSync(join(dist, '_astro'), { recursive: true });
    writeFileSync(join(dist, file), body);
  }
  writeManifest(dist);
  return dist;
}

// A fake origin serving the deployed manifest and bundles; every request is recorded.
function origin(deployed, { manifestStatus = 200, missing = [] } = {}) {
  const requests = [];
  const fetchImpl = async (url) => {
    const { pathname } = new URL(url);
    requests.push(pathname);
    if (pathname === '/asset-manifest.json') {
      return new Response(manifestStatus === 200 ? serializeManifest(Object.keys(deployed)) : 'nope', { status: manifestStatus });
    }
    if (pathname in deployed && !missing.includes(pathname)) return new Response(deployed[pathname]);
    return new Response('<!doctype html>404', { status: 404 });
  };
  return { fetchImpl, requests };
}

const quiet = () => {};

test('the build manifest lists every /_astro/ file, sorted, and nothing else', () => {
  const dist = build({ '/_astro/b.CCCCCCCC.js': 'b', '/_astro/a.AAAAAAAA.css': 'a' });
  writeFileSync(join(dist, 'index.html'), '<!doctype html>');
  mkdirSync(join(dist, '_astro', 'nested'));
  writeFileSync(join(dist, '_astro', 'nested', 'c.DDDDDDDD.woff2'), 'c');
  assert.deepEqual(listAstroAssets(dist), ['/_astro/a.AAAAAAAA.css', '/_astro/b.CCCCCCCC.js', '/_astro/nested/c.DDDDDDDD.woff2']);
  writeManifest(dist);
  assert.deepEqual(parseManifest(readFileSync(join(dist, manifestFile), 'utf8')), listAstroAssets(dist));
  rmSync(dist, { recursive: true });
});

test('a manifest with any path outside /_astro/ is rejected whole', () => {
  for (const file of ['/index.html', '/_astro/../wrangler.jsonc', '/_astro/./a.js', '//evil.example/_astro/a.js', '/_astro/a.js?x=1', '_astro/a.js', 7]) {
    assert.throws(() => parseManifest(JSON.stringify({ version: 1, files: ['/_astro/ok.AAAAAAAA.js', file] })), /invalid asset path/, String(file));
  }
  assert.throws(() => parseManifest('{"files": []}'), /version 1/);
  assert.throws(() => parseManifest('<!doctype html>'), SyntaxError);
});

test('the plan carries only previous files that this build neither lists nor has', () => {
  const previous = ['/_astro/old.AAAAAAAA.css', '/_astro/shared.BBBBBBBB.js', '/_astro/old.AAAAAAAA.css', '/_astro/disk.CCCCCCCC.js'];
  const current = ['/_astro/shared.BBBBBBBB.js', '/_astro/new.DDDDDDDD.css'];
  assert.deepEqual(planCarryOver(previous, current, (file) => file === '/_astro/disk.CCCCCCCC.js'), ['/_astro/old.AAAAAAAA.css']);
  assert.deepEqual(planCarryOver([], current), []);
});

test('carrying downloads the previous generation into dist/_astro/ without listing it in the new manifest', async () => {
  const dist = build({ '/_astro/shared.BBBBBBBB.js': 'shared', '/_astro/new.DDDDDDDD.css': 'new' });
  const manifestBefore = readFileSync(join(dist, manifestFile), 'utf8');
  const previous = origin({ '/_astro/shared.BBBBBBBB.js': 'shared-old-bytes', '/_astro/old.AAAAAAAA.css': 'old css' });
  const result = await carryPreviousAssets({ dist, liveUrl, fetchImpl: previous.fetchImpl, log: quiet });
  assert.deepEqual(result, { carried: ['/_astro/old.AAAAAAAA.css'], failed: [] });
  assert.equal(readFileSync(join(dist, '_astro', 'old.AAAAAAAA.css'), 'utf8'), 'old css');
  assert.equal(readFileSync(join(dist, '_astro', 'shared.BBBBBBBB.js'), 'utf8'), 'shared', 'this build\'s own files are never overwritten');
  assert.deepEqual(previous.requests, ['/asset-manifest.json', '/_astro/old.AAAAAAAA.css']);
  assert.equal(readFileSync(join(dist, manifestFile), 'utf8'), manifestBefore);

  // One deploy later, the live manifest is this build's, so the carried file is not carried again.
  const next = build({ '/_astro/newer.EEEEEEEE.css': 'newer' });
  const deployed = Object.fromEntries(listAstroAssets(dist).map((file) => [file, readFileSync(join(dist, file))]));
  const live = origin(Object.fromEntries(parseManifest(manifestBefore).map((file) => [file, deployed[file]])));
  const second = await carryPreviousAssets({ dist: next, liveUrl, fetchImpl: live.fetchImpl, log: quiet });
  assert.deepEqual(second.carried.sort(), ['/_astro/new.DDDDDDDD.css', '/_astro/shared.BBBBBBBB.js']);
  assert.ok(!existsSync(join(next, '_astro', 'old.AAAAAAAA.css')), 'only one previous generation is kept');
  rmSync(dist, { recursive: true });
  rmSync(next, { recursive: true });
});

test('an unreachable or missing live manifest warns and carries nothing', async () => {
  const dist = build({ '/_astro/new.DDDDDDDD.css': 'new' });
  for (const fetchImpl of [
    origin({}, { manifestStatus: 404 }).fetchImpl,
    async () => { throw new TypeError('fetch failed'); },
    async () => new Response('{"version":1,"files":["/etc/passwd"]}'),
  ]) {
    const logs = [];
    assert.deepEqual(await carryPreviousAssets({ dist, liveUrl, fetchImpl, log: (line) => logs.push(line) }), { carried: [], failed: [] });
    assert.match(logs.join('\n'), /^::warning::Not carrying previous bundles/);
  }
  assert.deepEqual(listAstroAssets(dist), ['/_astro/new.DDDDDDDD.css']);
  rmSync(dist, { recursive: true });
});

test('a previous bundle that no longer downloads is skipped with a warning', async () => {
  const dist = build({ '/_astro/new.DDDDDDDD.css': 'new' });
  const previous = origin({ '/_astro/gone.AAAAAAAA.js': 'gone', '/_astro/kept.BBBBBBBB.js': 'kept' }, { missing: ['/_astro/gone.AAAAAAAA.js'] });
  const logs = [];
  const result = await carryPreviousAssets({ dist, liveUrl, fetchImpl: previous.fetchImpl, log: (line) => logs.push(line) });
  assert.deepEqual(result, { carried: ['/_astro/kept.BBBBBBBB.js'], failed: ['/_astro/gone.AAAAAAAA.js'] });
  assert.ok(!existsSync(join(dist, '_astro', 'gone.AAAAAAAA.js')), 'a 404 page is never saved as a bundle');
  assert.match(logs.join('\n'), /::warning::Could not carry \/_astro\/gone\.AAAAAAAA\.js/);
  rmSync(dist, { recursive: true });
});
