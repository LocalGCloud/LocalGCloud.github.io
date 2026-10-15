// Check every generated HTML anchor, including Markdown/download destinations and fragments.
// Public links are checked only with --external; a blocked request is reported as unverified.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { walkElements } from './html-structure.mjs';

const dist = resolve('dist'), origin = 'https://local.cloud';
const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
  const named = { '&amp;':'&', '&quot;':'"', '&apos;':"'", '&lt;':'<', '&gt;':'>' };
  return named[entity] ?? String.fromCodePoint(parseInt(entity.slice(entity[2]?.toLowerCase() === 'x' ? 3 : 2, -1), entity[2]?.toLowerCase() === 'x' ? 16 : 10));
});
const attribute = (text, name) => {
  const match = text.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\x60]+))`, 'i'));
  return match ? decode(match[1] ?? match[2] ?? match[3]) : null;
};
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes:true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat();
}
const pages = new Map(), external = new Map(), failures = [];
let internalAnchors = 0, fragments = 0;
for (const file of (await files(dist)).filter(file => file.endsWith('.html'))) {
  const ids = new Set(), links = [];
  walkElements(await readFile(file, 'utf8'), (tag, attrs) => {
    const id = attribute(attrs, 'id'); if (id) ids.add(id);
    if (tag === 'a') {
      const name = attribute(attrs, 'name'); if (name) ids.add(name);
      const href = attribute(attrs, 'href'); if (href !== null) links.push(href);
    }
  });
  pages.set(file, { ids, links });
}
for (const [file, { links }] of pages) {
  const route = '/' + relative(dist, file).split(sep).join('/').replace(/index\.html$/, '');
  for (const href of links) {
    if (!href || /^(mailto:|tel:)/i.test(href)) continue;
    let url;
    try { url = new URL(href, origin + route); } catch { failures.push({ route, href, reason:'Invalid URL' }); continue; }
    if (!['https:', 'http:'].includes(url.protocol)) { failures.push({ route, href, reason:'Unexpected link protocol' }); continue; }
    if (!['local.cloud', 'www.local.cloud'].includes(url.hostname)) {
      if (['localhost', '127.0.0.1'].includes(url.hostname)) continue; // The installed Console is a user-owned runtime.
      url.hash = '';
      if (!external.has(url.href)) external.set(url.href, new Set());
      external.get(url.href).add(route);
      continue;
    }
    internalAnchors++;
    let target;
    try {
      target = resolve(dist, '.' + decodeURIComponent(url.pathname));
      if (target !== dist && !target.startsWith(dist + sep)) throw Error('Path escapes output');
      if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
      await stat(target);
    } catch { failures.push({ route, href, reason:'Missing destination' }); continue; }
    if (url.hash && url.hash !== '#top' && pages.has(target)) {
      fragments++;
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (!pages.get(target).ids.has(fragment)) failures.push({ route, href, reason:'Missing fragment' });
    }
  }
}
const publicLinks = [];
if (process.argv.includes('--external')) {
  const queue = [...external];
  await Promise.all(Array.from({ length:4 }, async () => {
    for (let entry; (entry = queue.shift());) {
      const [url, routes] = entry;
      const result = { url, routes:[...routes] };
      try {
        let response = await fetch(url, { method:'HEAD', redirect:'follow', signal:AbortSignal.timeout(12000) });
        if (response.status >= 400) response = await fetch(url, { redirect:'follow', signal:AbortSignal.timeout(12000) });
        result.status = response.status;
        result.result = response.ok ? 'ok' : [403, 429].includes(response.status) ? 'unverified' : 'failed';
        await response.body?.cancel();
      } catch (error) { result.result = 'unverified'; result.reason = error.message; }
      publicLinks.push(result);
    }
  }));
}
const report = { pages:pages.size, internalAnchors, fragments, externalURLs:external.size, failures, publicLinks };
if (process.env.LINK_AUDIT_REPORT) await writeFile(process.env.LINK_AUDIT_REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, publicLinks:publicLinks.length ? { checked:publicLinks.length, failed:publicLinks.filter(link => link.result === 'failed'), unverified:publicLinks.filter(link => link.result === 'unverified') } : 'Not requested' }, null, 2));
if (failures.length || publicLinks.some(link => link.result === 'failed')) process.exitCode = 1;
