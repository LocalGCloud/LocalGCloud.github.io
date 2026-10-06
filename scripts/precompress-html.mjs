import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

// Runs after finalize-static-csp so each sidecar holds the exact bytes the CSP hashes cover.
// The Worker serves `<page>.html.br` to clients that accept Brotli (worker/static-response.mjs).
const root = resolve('dist');
let pages = 0;
let originalBytes = 0;
let compressedBytes = 0;

async function compress(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await compress(path);
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(path);
      const brotli = brotliCompressSync(html, {
        params: {
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
          [constants.BROTLI_PARAM_SIZE_HINT]: html.length,
        },
      });
      await writeFile(`${path}.br`, brotli);
      pages++;
      originalBytes += html.length;
      compressedBytes += brotli.length;
    }
  }
}

await compress(root);
if (!pages) throw new Error('No HTML pages found to precompress in dist/');
console.log(`Precompressed ${pages} HTML pages with Brotli (${originalBytes} → ${compressedBytes} bytes).`);
