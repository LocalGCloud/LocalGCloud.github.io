import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptHash = (content) => `sha256-${createHash('sha256').update(content).digest('base64')}`;

// Astro's processed scripts are hashed during bundling. Inline scripts need
// hashes of their final rendered bytes, including whitespace, after the build.
export async function finalizeCsp(html, readAsset) {
  const meta = html.match(/<meta\b[^>]*http-equiv=["']content-security-policy["'][^>]*>/i)?.[0];
  if (!meta) throw new Error('Missing Astro CSP metadata');
  const content = meta.match(/\bcontent="([^"]*)"/)[1];
  const directives = content.split(';').map((item) => item.trim()).filter(Boolean);
  const scriptIndex = directives.findIndex((item) => item.startsWith('script-src '));
  if (scriptIndex < 0) throw new Error('Missing script-src policy');
  const sources = new Set(directives[scriptIndex].slice('script-src '.length).split(/\s+/));
  for (const match of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].reverse()) {
    const src = match[1].match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (src) {
      const url = new URL(src, 'https://local.cloud/');
      if (url.origin !== 'https://local.cloud') throw new Error(`Unexpected script origin: ${src}`);
      const hash = scriptHash(await readAsset(url.pathname));
      sources.add(`'${hash}'`);
      const attrs = match[1].replace(/\s+integrity=["'][^"']*["']/gi, '');
      const replacement = `<script${attrs} integrity="${hash}">${match[2]}</script>`;
      html = html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
    } else if (match[2].trim()) {
      sources.add(`'${scriptHash(match[2])}'`);
    }
  }
  directives[scriptIndex] = `script-src ${[...sources].join(' ')}`;
  return html.replace(meta, meta.replace(content, `${directives.join('; ')};`));
}

async function finalize() {
  const root = resolve('dist');
  let count = 0;
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.name.endsWith('.html')) {
        const result = await finalizeCsp(await readFile(path, 'utf8'), async (pathname) => {
          const asset = resolve(root, `.${decodeURIComponent(pathname)}`);
          const pathFromRoot = relative(root, asset);
          if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) throw new Error('Script path escapes dist');
          return readFile(asset);
        });
        await writeFile(path, result);
        count++;
      }
    }
  }
  await visit(root);
  console.log(`Verified and finalized script CSP hashes for ${count} HTML pages.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await finalize();
