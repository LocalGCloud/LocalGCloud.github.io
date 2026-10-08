import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { transform } from 'esbuild';
import { createMappedScript } from './finalize-static-csp.mjs';

const root = resolve('dist');
const digest = (text) => createHash('sha256').update(text).digest('hex');
const integrity = (text) => 'sha256-' + createHash('sha256').update(text).digest('base64');
const attribute = (attrs, name) => attrs.match(new RegExp('\\b' + name + '="([^"]*)"'))?.[1];
const decode = (value) => value.replace(/&#(x[\da-f]+|\d+);|&(?:amp|quot|lt|gt|apos);/gi, (token,number) => number ? String.fromCodePoint(Number.parseInt(number.replace(/^x/i,''),/^x/i.test(number)?16:10)) : ({'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&apos;':"'"})[token.toLowerCase()]);
const files = async (directory) => (await Promise.all((await readdir(directory, {withFileTypes:true})).map(entry => entry.isDirectory() ? files(resolve(directory,entry.name)) : [resolve(directory,entry.name)]))).flat();
const inlineAssets = new Map(), routes = {};
const htmlFiles = (await files(root)).filter(file => file.endsWith('.html'));
const inlineStyles = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file,'utf8');
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n');
  inlineStyles.set(digest(css),css);
}
await mkdir(resolve(root,'_desktop'),{recursive:true});
for (const file of htmlFiles) {
  const html = await readFile(file,'utf8');
  const start = html.match(/<template\b[^>]*data-desktop-content-start[^>]*><\/template>/);
  const end = html.match(/<template\b[^>]*data-desktop-content-end[^>]*><\/template>/);
  if (!start || !end) throw Error('Missing desktop content boundary: ' + file);
  const panelStart = start.index + start[0].length;
  const content = html.slice(panelStart,end.index).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
  const scripts = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (match.index < html.indexOf('</head>') && /\bdata-critical-bootstrap\b/.test(match[1])) continue;
    const type = attribute(match[1],'type') || '';
    if (!['','module','text/javascript','application/javascript'].includes(type)) continue;
    let src = attribute(match[1],'src'), sri = attribute(match[1],'integrity'), key;
    if (src) {
      if (!src.startsWith('/_astro/')) throw Error('Unexpected desktop script URL: ' + src);
      key = 'url:' + src;
    } else {
      const source = match[2];
      if (!source.trim()) continue;
      key = 'inline:' + digest(source);
      if (!inlineAssets.has(source)) {
        const output = await transform(source,{loader:'js',target:'es2022',minify:true,legalComments:'none',treeShaking:false,sourcemap:'external',sourcesContent:true,sourcefile:'rendered-inline.js'});
        const asset = createMappedScript(output.code,output.map,'inline');
        await writeFile(resolve(root,asset.src.slice(1)),asset.code);
        await writeFile(resolve(root,asset.src.slice(1)+'.map'),asset.map);
        inlineAssets.set(source,{src:asset.src,sri:integrity(asset.code)});
      }
      ({src,sri}=inlineAssets.get(source));
    }
    scripts.push({src,integrity:sri,type,key,rerun:match.index>=panelStart&&match.index<end.index&&type!=='module'});
  }
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
  const cssKey = digest(css), styleURL = '/_astro/desktop-content.' + cssKey.slice(0,16) + '.css';
  const coveredBy = [...inlineStyles].filter(([,initial])=>initial.startsWith(css)).map(([key])=>key);
  await writeFile(resolve(root,styleURL.slice(1)),css);
  const shell = html.match(/<div\b[^>]*data-desktop-shell[^>]*>/)?.[0] || '';
  const path = '/' + relative(root,file).split(sep).join('/').replace(/index\.html$/,'');
  const metadata = [...html.matchAll(/<meta\b([^>]*)>/gi)].flatMap(match => {
    const name = attribute(match[1],'name'), property = attribute(match[1],'property');
    if (!['description','robots'].includes(name) && !/^(?:og:|twitter:|article:)/.test(property || name || '')) return [];
    return [{name,property,content:decode(attribute(match[1],'content') || '')}];
  });
  const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(match => JSON.parse(match[1]));
  const payload = {path,title:decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'LocalCloud'),label:decode(attribute(shell,'data-page-label')||'Home'),content,scripts,style:{src:styleURL,key:cssKey,integrity:integrity(css),coveredBy},metadata,schemas,canonical:html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||null,markdown:html.match(/<a\b[^>]*href="([^"]+)"[^>]*class="desktop-markdown"/)?.[1]||null};
  const text = JSON.stringify(payload), src = '/_astro/desktop-content.' + digest(text).slice(0,16) + '.json';
  await writeFile(resolve(root,src.slice(1)),text);
  routes[path] = src;
}
const manifest = JSON.stringify({routes});
const manifestURL = '/_astro/desktop-manifest.' + digest(manifest).slice(0,16) + '.json';
await writeFile(resolve(root,manifestURL.slice(1)),manifest);
for (const file of htmlFiles) {
  const html = await readFile(file,'utf8');
  await writeFile(file,html.replace(/(<div\b[^>]*data-desktop-shell[^>]*?)\sdata-desktop-manifest="[^"]*"/, '$1 data-desktop-manifest="' + manifestURL + '"'));
}
// Legacy documents cannot mix new shared modules with their old, already installed delegates.
await writeFile(resolve(root,'_desktop/manifest.json'),JSON.stringify({routes:{}}));
console.log('Generated persistent desktop content for ' + Object.keys(routes).length + ' routes.');
