import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createMappedScript } from './finalize-static-csp.mjs';

// Pagefind's dynamic ES-module import is blocked by some browsers under a
// hash-based strict CSP. Bundle its public API into a lazy classic script;
// the search loader supplies its integrity digest before inserting it.
const root = resolve('dist');
const result = await build({
  entryPoints: [resolve(root, 'pagefind/pagefind.js')],
  bundle: true,
  write: false,
  outfile: resolve(root, '_astro/pagefind-client.js'),
  sourcemap: 'external',
  format: 'iife',
  globalName: 'LocalCloudPagefind',
  minify: true,
  target: 'es2022',
  // The loader always supplies basePath explicitly; import.meta is unused.
  logOverride: { 'empty-import-meta': 'silent' },
});
const asset = createMappedScript(
  result.outputFiles.find((file) => file.path.endsWith('.js')).text,
  result.outputFiles.find((file) => file.path.endsWith('.js.map')).text,
  'pagefind-client',
);
const bytes = Buffer.from(asset.code);
const integrity = `sha256-${createHash('sha256').update(bytes).digest('base64')}`;
const clientSrc = asset.src;
await writeFile(resolve(root, clientSrc.slice(1)), bytes);
await writeFile(resolve(root, `${clientSrc.slice(1)}.map`), asset.map);
let count = 0;
async function inject(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inject(path);
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      if (!html.includes('id="search-modal"')) continue;
      const secured = html.replace(/<div\b[^>]*id="search-modal"[^>]*>/, (tag) => {
        const clean = tag.replace(/\s+data-client-(?:src|integrity)="[^"]*"/g, '');
        return clean.slice(0, -1) + ` data-client-src="${clientSrc}" data-client-integrity="${integrity}">`;
      });
      if (!secured.includes(`data-client-src="${clientSrc}"`)) throw new Error(`search-modal tag was not rewritten in ${path}`);
      await writeFile(path, secured);
      count++;
    }
  }
}
await inject(root);
console.log(`Bundled integrity-protected Pagefind client for ${count} pages (${bytes.length} bytes, loaded on search).`);
