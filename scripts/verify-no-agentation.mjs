import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function verifyNoAgentation(directory) {
  let checked = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    assert.doesNotMatch(entry.name, /agentation/i, `Development-only visual feedback leaked into ${file}`);
    if (entry.isDirectory()) {
      checked += verifyNoAgentation(file);
    } else if (/\.(?:html|m?js|css|json|map|md|txt)$/.test(entry.name)) {
      assert.doesNotMatch(readFileSync(file, 'utf8'),
        /agentation|(?:localhost|127\.0\.0\.1|\[::1\]):4747|node_modules[\\/]react(?:-dom)?[\\/]|react\.(?:transitional\.)?element/i,
        `Development-only visual feedback leaked into ${file}`);
      checked++;
    }
  }
  return checked;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const checked = verifyNoAgentation(fileURLToPath(new URL('../dist/', import.meta.url)));
  assert.ok(checked > 0, 'Build the site before checking production output');
  console.log(`Verified ${checked} production files exclude Agentation and its React runtime.`);
}
