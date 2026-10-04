import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Pagefind's dynamic ES-module import is blocked by some browsers under a
// hash-based strict CSP. Bundle its public API into a lazy classic script;
// the search loader supplies its integrity digest before inserting it.
const root = resolve('dist');
const result = await build({
  entryPoints: [resolve(root, 'pagefind/pagefind.js')],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'LocalCloudPagefind',
  minify: true,
  target: 'es2022',
  // The loader always supplies basePath explicitly; import.meta is unused.
  logOverride: { 'empty-import-meta': 'silent' },
});
const bytes = result.outputFiles[0].contents;
const digest = createHash('sha256').update(bytes).digest('hex');
const integrity = `sha256-${createHash('sha256').update(bytes).digest('base64')}`;
const clientSrc = `/_astro/pagefind-client.${digest.slice(0, 16)}.js`;
await writeFile(resolve(root, clientSrc.slice(1)), bytes);
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
      await writeFile(path, secured);
      count++;
    }
  }
}
await inject(root);
console.log(`Bundled integrity-protected Pagefind client for ${count} pages (${bytes.length} bytes, loaded on search).`);
