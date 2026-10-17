import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { services } from '../src/data/services.ts';
import { getServiceCodeExamples } from '../src/data/serviceGuides.ts';

const source = await readFile(new URL('../src/pages/docs/sdk-examples.mdx', import.meta.url), 'utf8');

test('every supported service has usable client examples; unsupported services have none', () => {
  for (const service of services) {
    const examples = getServiceCodeExamples(service.id, source);
    assert.equal(examples.length > 0, service.marketingStatus === 'supported', service.id);
    assert.ok(examples.length <= 5, `${service.id} exceeds the tab component capacity`);
    assert.equal(new Set(examples.map((example) => example.label)).size, examples.length, service.id);
    for (const example of examples) {
      assert.ok(example.title && example.code.trim() && example.description, `${service.id}: ${example.label}`);
      assert.ok(example.verification?.trim(), `${service.id}: ${example.label} needs an observable expected result`);
      if (example.output) assert.ok(example.code.includes(example.output), `${service.id}: expected output must match a literal in the maintained example`);
      if (example.discovery) assert.match(example.verification, /empty list|no printed rows/);
      assert.ok(example.summary?.trim(), `${service.id}: ${example.label} needs a purpose summary`);
      assert.doesNotMatch(example.summary, /\n/, `${service.id}: keep the purpose summary to one sentence`);
      if (example.label === 'gcloud CLI') {
        assert.match(example.environment, /CLOUDSDK_API_ENDPOINT_OVERRIDES_/);
        assert.match(example.environment, /CLOUDSDK_AUTH_DISABLE_CREDENTIALS=true/);
        assert.doesNotMatch(example.environment, /localhost:\d+/);
      }
      for (const shell of [example.environment, example.setup, example.run, ...(!example.filename ? [example.code] : [])].filter(Boolean)) {
        const result = spawnSync('bash', ['-n'], { input: shell, encoding: 'utf8' });
        assert.equal(result.status, 0, `${service.id}: ${example.label}: ${result.stderr}`);
      }
    }
  }
});

test('Java REST samples compile, including requests with JSON bodies', async (context) => {
  if (spawnSync('javac', ['-version']).status !== 0) return context.skip('JDK is unavailable');
  const directory = await mkdtemp(join(tmpdir(), 'localcloud-java-rest-'));
  try {
    for (const service of services) {
      for (const example of getServiceCodeExamples(service.id, source).filter((example) => example.label === 'Java · REST')) {
        const path = join(directory, 'Hello.java');
        await writeFile(path, example.code);
        const result = spawnSync('javac', ['--release', '17', path], { encoding: 'utf8' });
        assert.equal(result.status, 0, `${service.id}: ${result.stderr}`);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
