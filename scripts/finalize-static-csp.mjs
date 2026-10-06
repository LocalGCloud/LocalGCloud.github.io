import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const scriptHash = (content) => `sha256-${createHash('sha256').update(content).digest('base64')}`;

// Minify rendered inline JavaScript before hashing its exact final bytes.
// Astro's processed scripts are already minified during bundling.
export async function finalizeCsp(html, readAsset) {
  const meta = html.match(/<meta\b[^>]*http-equiv=["']content-security-policy["'][^>]*>/i)?.[0];
  if (!meta) throw new Error('Missing Astro CSP metadata');
  const content = meta.match(/\bcontent="([^"]*)"/)[1];
  const directives = content.split(';').map((item) => item.trim()).filter(Boolean);
  const scriptIndex = directives.findIndex((item) => item.startsWith('script-src '));
  if (scriptIndex < 0) throw new Error('Missing script-src policy');
  const sources = new Set(directives[scriptIndex].slice('script-src '.length).split(/\s+/)
    .filter((source) => !/^'sha256-/.test(source)));
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
      const type = match[1].match(/\btype=["']([^"']+)["']/i)?.[1].toLowerCase() || '';
      const javascript = ['', 'module', 'text/javascript', 'application/javascript'].includes(type);
      const code = javascript ? (await transform(match[2], {
        loader: 'js', target: 'es2022', minify: true, legalComments: 'none', treeShaking: false,
      })).code.trimEnd() : match[2];
      sources.add(`'${scriptHash(code)}'`);
      const replacement = `<script${match[1]}>${code}</script>`;
      html = html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
    }
  }
  directives[scriptIndex] = `script-src ${[...sources].join(' ')}`;
  // A CSP <meta> governs only the elements after it, and Astro emits it after the head's
  // inline scripts. Move it to directly after <meta charset> so it precedes every script.
  html = html.replace(meta, '');
  const charset = html.match(/<meta\b[^>]*\scharset=[^>]*>/i);
  if (!charset) throw new Error('Missing <meta charset> to place the CSP metadata after');
  const at = charset.index + charset[0].length;
  return html.slice(0, at) + meta.replace(content, `${directives.join('; ')};`) + html.slice(at);
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
