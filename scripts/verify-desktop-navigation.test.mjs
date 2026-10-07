import assert from 'node:assert/strict';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeManifest,carryPreviousAssets} from './asset-manifest.mjs';
import {safeDesktopAsset,installDesktopNavigation} from '../src/scripts/desktop-navigation.mjs';

test('desktop assets stay in same-origin build namespaces without redirects credentials or raw/API paths',()=>{
  assert.equal(safeDesktopAsset('/_desktop/manifest.json','https://local.cloud/'),'https://local.cloud/_desktop/manifest.json');
  assert.equal(safeDesktopAsset('/_astro/code.js','https://local.cloud/'),'https://local.cloud/_astro/code.js');
  for(const path of ['https://evil.test/_astro/a.js','https://user:secret@local.cloud/_astro/a.js','/_astro/%2fescape.js','/_astro/../ingest','/install.sh','/_astro/a.js?x=1','/_astro/a.js#x'])assert.equal(safeDesktopAsset(path,'https://local.cloud/'),null,path);
});

async function harness(delayB=false,pageScripts={}, options={}){
  const attrs=new Map(),listeners=new Map(),writes=[];
  const pane={scrollTop:options.initialScroll||0,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),addEventListener:(k,fn)=>listeners.set(k,fn),set innerHTML(value){writes.push(value);this.scrollTop=0;listeners.get('scroll')?.();}};
  const root={dataset:{base:'/',pageStyles:'/_astro/refinements.css',desktopManifest:options.unpinned?undefined:'/_astro/desktop-manifest.0000000000000000.json'},querySelector:()=>pane};
  const location={href:'https://local.cloud/a/',pathname:'/a/',search:'',assign(){throw Error('unexpected native fallback');}};
  const setURL=value=>{const url=new URL(value,location.href);location.href=url.href;location.pathname=url.pathname;location.search=url.search;};
  const replacements=[],entries=[{href:location.href,state:null}];let entryIndex=0;
  const history={state:null,replaceState(state){replacements.push(state);this.state=state;entries[entryIndex]={href:location.href,state};},pushState(state,_,href){this.state=state;setURL(href);entries.splice(++entryIndex,Infinity,{href:location.href,state});}};
  const events=[],empty='empty-style',focused=[];
  const page=path=>({path,title:path,label:path,content:path,style:{key:empty},scripts:pageScripts[path]||[],metadata:[],schemas:[],canonical:null,...options.pages?.[path]});
  let release;
  const documentListeners=new Map(),requests=[];
  const context={URL,Event,TextEncoder,Promise,Map,Set,root,safeDesktopAsset,sha:async()=>empty,location,history,matchMedia:()=>({matches:true}),window:{addEventListener(){}},document:{scripts:options.initialScripts||[],querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>({scrollIntoView(){pane.scrollTop=433;}}),head:{append(){},insertBefore(){}},createElement:()=>({remove(){}}),dispatchEvent:event=>events.push(event.type),addEventListener:(name,fn)=>documentListeners.set(name,fn),title:'A'},fetch:async url=>{requests.push(url);return {ok:true,headers:{get:()=> 'application/json'},json:async()=>url.includes('/desktop-manifest.')?{routes:Object.fromEntries(['b','c','d','e'].map(name=>['/'+name+'/','/_desktop/'+name+'.json']))}:delayB&&url.endsWith('b.json')?new Promise(resolve=>{release=()=>resolve(page('/b/'));}):page('/'+url.match(/([^/]+)\.json$/)[1]+'/')};}};
  const timers=new Map();let timerID=0;
  Object.assign(context,{crypto:{randomUUID:()=> 'fresh-install'},AbortController,setTimeout:(fn)=>{timers.set(++timerID,fn);return timerID;},clearTimeout:id=>timers.delete(id),navigator:{},...options.context});
  const navigate=await runInNewContext('('+installDesktopNavigation.toString()+')({root,validate:href=>new URL(href,location.href).href,before(){},mounted(){}})',context);
  context.document.getElementById=()=>({scrollIntoView(){pane.scrollTop=433;},hasAttribute:()=>false,setAttribute(){},focus(options){focused.push(options);}});
  return {pane,attrs,listeners,writes,context,navigate,setURL,events,focused,replacements,timers,documentListeners,requests,root,entries,async back(){const previous=entries[--entryIndex];history.state=previous.state;setURL(previous.href);return navigate(location.href,true);},get release(){return release;}};
}

test('rapid scrolling coalesces history writes and navigation flushes the final reading position',async()=>{
  const h=await harness();
  for(let i=1;i<=120;i++){h.pane.scrollTop=i;h.listeners.get('scroll')();}
  assert.ok(h.replacements.length<=2,'120 scroll events must not exhaust the browser history quota');
  await h.navigate('/b/');
  assert.equal(h.replacements.at(-1).lcScroll,120,'the outgoing page stores its last reading position');
});

test('installing the router preserves an already scrolled page',async()=>{
  const h=await harness(false,{}, {initialScroll:312});assert.equal(h.pane.scrollTop,312);
});

test('successful content navigation focuses the destination heading without disturbing scroll or history focus',async()=>{
  const h=await harness(),focused=[];
  h.pane.querySelector=selector=>({hasAttribute:()=>false,setAttribute:(name,value)=>assert.deepEqual([name,value],['tabindex','-1']),focus:options=>focused.push({selector,...options})});
  await h.navigate('/b/');
  assert.deepEqual(focused,[{selector:'main h1, main',preventScroll:true}]);assert.equal(h.pane.scrollTop,0);
  await h.navigate('/c/#section');assert.equal(focused.length,1);assert.equal(h.pane.scrollTop,433);
  await h.back();assert.equal(focused.length,1,'traversal preserves focus behavior and only restores reading position');
});

test('legacy documents without a pinned manifest use native navigation without fetching new scripts',async()=>{
  const h=await harness(false,{}, {unpinned:true}),assigned=[];
  h.context.location.assign=url=>assigned.push(String(url));
  assert.equal(await h.navigate('/b/'),false);
  assert.deepEqual(assigned,['https://local.cloud/b/']);assert.deepEqual(h.requests,[]);assert.deepEqual(h.writes,[]);
});

test('reading while mounted widgets load is flushed into the real B history entry before C and restored on Back',async()=>{
  const item={src:'/_astro/widget.js',key:'widget',integrity:'sha256-YWJj'};
  const h=await harness(false,{'/b/':[item]});let release;
  h.context.document.head.append=tag=>{if(tag.src)release=()=>tag.onload();};
  const loading=h.navigate('/b/');await new Promise(resolve=>setImmediate(resolve));assert.ok(release);
  h.pane.scrollTop=777;h.listeners.get('scroll')();
  await h.navigate('/c/');
  assert.equal(h.entries[1].href,'https://local.cloud/b/');assert.equal(h.entries[1].state.lcScroll,777);
  release();assert.equal(await loading,false);await h.back();
  assert.equal(h.context.location.pathname,'/b/');assert.equal(h.pane.scrollTop,777);
});

test('widget completion preserves reading begun while loading, and the actual swap flushes reading during a fetch',async()=>{
  const item={src:'/_astro/widget.js',key:'widget',integrity:'sha256-YWJj'};
  const h=await harness(false,{'/b/':[item]});let release;
  h.context.document.head.append=tag=>{if(tag.src)release=()=>tag.onload();};
  const loading=h.navigate('/b/');await new Promise(resolve=>setImmediate(resolve));
  h.pane.scrollTop=777;h.listeners.get('scroll')();release();await loading;assert.equal(h.pane.scrollTop,777);
  const slow=await harness(true),pending=slow.navigate('/b/');
  while(!slow.release)await new Promise(resolve=>setImmediate(resolve));
  slow.pane.scrollTop=923;slow.listeners.get('scroll')();slow.release();await pending;
  assert.equal(slow.entries[0].state.lcScroll,923,'the outgoing entry includes reading after navigation started');
});

test('hover and keyboard-focus warming respect SaveData and slow connections and stop after three routes',async()=>{
  const hover=(h,path,event='pointerover')=>h.documentListeners.get(event)({target:{closest:()=>({href:'https://local.cloud/'+path+'/',hasAttribute:()=>false})}});
  for(const connection of [{saveData:true},{effectiveType:'2g'},{effectiveType:'slow-2g'}]){
    const h=await harness(false,{}, {context:{navigator:{connection}}});
    hover(h,'b');hover(h,'c','focusin');await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(h.requests,[],JSON.stringify(connection));
  }
  const h=await harness();
  for(const [path,event] of [['b','pointerover'],['c','focusin'],['d','pointerover'],['e','focusin'],['b','focusin']])hover(h,path,event);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(h.requests.filter(url=>!url.includes('/desktop-manifest.')).map(url=>new URL(url).pathname),['/_desktop/b.json','/_desktop/c.json','/_desktop/d.json']);
});

test('a script that never loads falls back within the resource timeout',async()=>{
  const item={src:'/_astro/stuck.js',key:'stuck',integrity:'sha256-YWJj'};
  const h=await harness(false,{'/b/':[item]}),assigned=[];
  h.context.location.assign=url=>assigned.push(String(url));
  const pending=h.navigate('/b/');
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(h.timers.size,'widget loading has a bounded timeout');
  for(const callback of [...h.timers.values()])callback();
  assert.equal(await pending,false);assert.equal(h.attrs.has('aria-busy'),false);
  assert.deepEqual(assigned,['https://local.cloud/b/']);
});

test('Back and Forward restore positions captured before the throttled history write',async()=>{
  const h=await harness();await h.navigate('/b/');
  h.pane.scrollTop=248;h.listeners.get('scroll')();const bState=h.context.history.state;
  await h.navigate('/c/');h.pane.scrollTop=900;h.listeners.get('scroll')();const cState=h.context.history.state;
  h.setURL('/b/');h.context.history.state=bState;await h.navigate('/b/',true);
  assert.equal(h.pane.scrollTop,248);
  h.setURL('/c/');h.context.history.state=cState;await h.navigate('/c/',true);
  assert.equal(h.pane.scrollTop,900);
});

test('entry identities from an earlier native reload cannot collide with new visits',async()=>{
  const h=await harness();await h.navigate('/b/');
  h.pane.scrollTop=333;h.listeners.get('scroll')();
  h.context.history.state={lcEntry:1,lcScroll:111};await h.navigate('/b/',true);
  assert.equal(h.pane.scrollTop,111,'an older entry restores its own saved reading position');
});

test('a widget failure after same-mounted-page hash navigation falls back at the latest fragment',async()=>{
  const item={src:'/_astro/stuck.js',key:'stuck',integrity:'sha256-YWJj'};
  const h=await harness(false,{'/b/':[item]}),assigned=[];
  h.context.location.assign=url=>assigned.push(String(url));
  const pending=h.navigate('/b/');await new Promise(resolve=>setImmediate(resolve));
  await h.navigate('/b/#section');
  for(const callback of [...h.timers.values()])callback();
  assert.equal(await pending,false);assert.deepEqual(assigned,['https://local.cloud/b/#section']);
});

test('a fetch that never settles times out and falls back without retaining a busy pane',async()=>{
  const assigned=[];
  const h=await harness(false,{}, {context:{fetch:()=>new Promise(()=>{})}});
  h.context.location.assign=url=>assigned.push(String(url));
  const pending=h.navigate('/b/');
  await Promise.resolve();await Promise.resolve();
  assert.ok(h.timers.size,'navigation installs a bounded fetch timeout');
  for(const callback of [...h.timers.values()])callback();
  assert.equal(await pending,false);
  assert.deepEqual(assigned,['https://local.cloud/b/']);
  assert.equal(h.attrs.has('aria-busy'),false);
});

test('destination metadata replaces stale canonical social schema and Markdown discovery',async()=>{
  const entry=(values)=>({...values,remove(){this.removed=true;},setAttribute(name,value){this[name]=value;}});
  const stale=[entry({name:'robots'}),entry({property:'article:published_time'}),entry({type:'application/ld+json'})];
  const canonical=entry({href:'https://local.cloud/a/'}),markdown=entry({href:'/a.md'}),installed=[];
  const h=await harness(false,{}, {pages:{'/b/':{title:'B',metadata:[{name:'description',content:'B description'},{property:'og:title',content:'B'}],schemas:[{'@type':'WebPage',name:'B'}],canonical:'https://local.cloud/b/',markdown:'/b.md'},'/c/':{canonical:null,markdown:null,metadata:[{name:'robots',content:'noindex, nofollow'}]}}});
  h.context.document.querySelectorAll=selector=>selector.startsWith('meta')?[...stale.slice(0,2),...installed.filter(el=>el.name||el.property)].filter(el=>!el.removed):selector.startsWith('script')?stale.slice(2):[];
  h.context.document.querySelector=selector=>selector.includes('canonical')?canonical:markdown;
  h.context.document.createElement=()=>entry({});h.context.document.head.append=el=>installed.push(el);
  await h.navigate('/b/');
  assert.equal(h.context.document.title,'B');assert.equal(canonical.href,'https://local.cloud/b/');assert.equal(markdown.href,'/b.md');
  assert.ok(stale.every(el=>el.removed));assert.ok(installed.some(el=>el.property==='og:title'&&el.content==='B'));
  assert.ok(installed.some(el=>el.name==='description'&&el.content==='B description'&&!el.removed));
  assert.ok(!installed.some(el=>el.name==='robots'&&!el.removed),'indexable B removes stale noindex');
  assert.ok(installed.some(el=>el.type==='application/ld+json'&&JSON.parse(el.textContent).name==='B'));
  await h.navigate('/c/');assert.ok(canonical.removed&&markdown.removed);
  assert.ok(installed.some(el=>el.name==='description'&&el.removed),'destination without description removes B description');
  assert.ok(installed.some(el=>el.name==='robots'&&el.content==='noindex, nofollow'&&!el.removed));
  await h.navigate('/b/');
  assert.ok(!installed.some(el=>el.name==='robots'&&!el.removed),'returning to indexable B removes C noindex');
  assert.equal(installed.filter(el=>el.name==='description'&&!el.removed).length,1);
});

test('styles covered by the original document are reused and scripts warm concurrently without execution',async()=>{
  const descriptor=name=>({src:'/_astro/'+name+'.js',key:name,integrity:'sha256-YWJj',type:'module'});
  const h=await harness(false,{'/b/':[descriptor('one'),descriptor('two')]},{pages:{'/b/':{style:{key:'subset',coveredBy:['empty-style']}}}}),links=[],scripts=[];
  h.context.document.head.insertBefore=()=>assert.fail('covered CSS must not create a stylesheet');
  h.context.document.head.append=el=>{if(el.src){scripts.push(el.src);queueMicrotask(()=>el.onload());}else links.push(el);};
  await h.navigate('/b/');
  assert.deepEqual(links.filter(el=>el.rel==='modulepreload').map(el=>new URL(el.href).pathname),['/_astro/one.js','/_astro/two.js']);
  assert.equal(scripts.length,2,'execution still happens in route script order');
});

test('a requested hidden Home section is revealed before focus and the plain URL restores Home',async()=>{
  const h=await harness();let revealed=false;
  const section={setAttribute(){revealed=true;},removeAttribute(){revealed=false;},dispatchEvent(event){assert.equal(event.type,'lc:fragment-show');assert.equal(event.bubbles,true);}};
  h.pane.querySelectorAll=()=>revealed?[section]:[];
  h.context.document.getElementById=()=>({closest:()=>section,scrollIntoView(){assert.ok(revealed);},hasAttribute:()=>true,focus(){}});
  await h.navigate('/a/#faq-one');assert.ok(revealed);
  await h.navigate('/a/');assert.equal(revealed,false);
});

test('slow navigation canceled by the current page leaves no busy state or stale content',async()=>{
  const h=await harness(true),pending=h.navigate('/b/');
  while(!h.release)await new Promise(resolve=>setTimeout(resolve,0));
  await h.navigate('/a/');h.release();await pending;
  assert.equal(h.attrs.has('aria-busy'),false);assert.deepEqual(h.writes,[]);
  assert.ok(!h.events.includes('astro:page-load'),'canceling with the current page does not count as another pageview');
});

test('history restores actual reading position after hash navigation and ignores swap-time scroll resets',async()=>{
  const h=await harness();await h.navigate('/b/#section');assert.equal(h.pane.scrollTop,433);
  h.pane.scrollTop=1433;h.listeners.get('scroll')();
  for(const callback of [...h.timers.values()])callback();const saved=h.context.history.state;
  await h.navigate('/c/');h.setURL('/b/#section');h.context.history.state=saved;
  await h.navigate(h.context.location.href,true);
  assert.equal(h.pane.scrollTop,1433);assert.equal(h.attrs.has('aria-busy'),false);
});

test('a later same-page anchor cancels an older pending route without a new pageview',async()=>{
  const h=await harness(true),pending=h.navigate('/b/');
  while(!h.release)await new Promise(resolve=>setTimeout(resolve,0));
  await h.navigate('/a/#section');h.release();await pending;
  assert.equal(h.context.location.href,'https://local.cloud/a/#section');
  assert.equal(h.pane.scrollTop,433);assert.deepEqual(h.writes,[]);assert.deepEqual(h.events,[]);
  assert.equal(h.focused.length,1);assert.equal(h.focused[0].preventScroll,true);
});

test('canceled navigation never appends the rest of its old widget scripts',async()=>{
  const descriptor=name=>({src:'/_astro/'+name+'.js',key:name,integrity:'sha256-YWJj',rerun:true});
  const h=await harness(false,{'/b/':[descriptor('first'),descriptor('second')]}),appended=[];
  let release;
  h.context.document.head.append=tag=>{if(!tag.src)return;appended.push(tag.src);release=()=>tag.onload();};
  const pending=h.navigate('/b/');
  while(!release)await new Promise(resolve=>setTimeout(resolve,0));
  await h.navigate('/c/');release();await pending;
  assert.deepEqual(appended,['https://local.cloud/_astro/first.js']);
  assert.equal(h.context.location.href,'https://local.cloud/c/');
});

test('an anchor chosen while current page widgets load lets their initialization finish once',async()=>{
  const descriptor=name=>({src:'/_astro/'+name+'.js',key:name,integrity:'sha256-YWJj',rerun:true});
  const h=await harness(false,{'/b/':[descriptor('first'),descriptor('second')]}),appended=[];
  let release;
  h.context.document.head.append=tag=>{if(!tag.src)return;appended.push(tag.src);if(appended.length===1)release=()=>tag.onload();else queueMicrotask(()=>tag.onload());};
  const pending=h.navigate('/b/');while(!release)await new Promise(resolve=>setTimeout(resolve,0));
  await h.navigate('/b/#section');release();await pending;
  assert.equal(appended.length,2);assert.equal(h.events.filter(event=>event==='astro:page-load').length,1);
  assert.equal(h.context.location.href,'https://local.cloud/b/#section');assert.equal(h.pane.scrollTop,433);
});

const builtManifest=()=>{
  const home=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const path=home.match(/data-desktop-manifest="([^"]+)"/)?.[1];assert.match(path||'',/^\/_astro\/desktop-manifest\.[a-f0-9]{16}\.json$/);
  return JSON.parse(readFileSync(new URL('../dist'+path,import.meta.url),'utf8'));
};

test('content-addressed manifests pin old documents to their original shared modules across deployments',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'desktop-manifest-'));
  try{
    const dist=join(directory,'dist');
    const generation=version=>{
      rmSync(dist,{recursive:true,force:true});
      mkdirSync(join(dist,'_astro'),{recursive:true});mkdirSync(join(dist,'a'),{recursive:true});mkdirSync(join(dist,'b'),{recursive:true});
      writeFileSync(join(dist,'_astro/Header.'+version+'.js'),'// '+version+' header');
      for(const route of ['','a/','b/'])writeFileSync(join(dist,route,'index.html'),'<title>'+version+'</title><div data-desktop-shell data-desktop-manifest=""><script type="module" src="/_astro/Header.'+version+'.js" integrity="sha256-YWJj"></script><template data-desktop-content-start></template><main><h1>'+route+version+'</h1></main><template data-desktop-content-end></template></div>');
      execFileSync(process.execPath,[new URL('./generate-desktop-content.mjs',import.meta.url).pathname],{cwd:directory,stdio:'pipe'});
      writeManifest(dist);
      return readFileSync(join(dist,'a/index.html'),'utf8').match(/data-desktop-manifest="([^"]+)"/)[1];
    };
    const oldURL=generation('old'),oldBytes=readFileSync(join(dist,oldURL),'utf8');
    const previous=readFileSync(join(dist,'asset-manifest.json'),'utf8');
    const previousAssets=new Map(JSON.parse(previous).files.map(path=>[path,readFileSync(join(dist,path))]));
    const newURL=generation('new');
    const carried=await carryPreviousAssets({dist,log(){},fetchImpl:async url=>({ok:true,text:async()=>previous,arrayBuffer:async()=>previousAssets.get(new URL(url).pathname)})});
    assert.ok(carried.carried.includes(oldURL),'existing one-generation carry preserves the pinned manifest');
    assert.ok(!JSON.parse(readFileSync(join(dist,'asset-manifest.json'),'utf8')).files.includes(oldURL),'carried manifests are not retained into a second generation');
    assert.notEqual(newURL,oldURL);assert.equal(readFileSync(join(dist,oldURL),'utf8'),oldBytes);
    assert.deepEqual(JSON.parse(readFileSync(join(dist,'_desktop/manifest.json'),'utf8')),{routes:{}});
    const appended=[],h=await harness(false,{}, {initialScripts:[{src:'https://local.cloud/_astro/Header.old.js'}],context:{sha:async text=>createHash('sha256').update(text).digest('hex'),fetch:async url=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>JSON.parse(readFileSync(join(dist,new URL(url).pathname),'utf8'))})}});
    // The initial old Header is already installed; its key must never load the new Header delegate.
    h.root.dataset.desktopManifest=oldURL;
    h.context.document.head.append=tag=>{if(tag.src){appended.push(tag.src);queueMicrotask(()=>tag.onload());}};
    await h.navigate('/b/');
    assert.deepEqual(appended,[],'the existing Header delegate is installed once, with no new generation mixed in');
    assert.ok(h.writes[0].includes('b/old'),'the old page receives its original content generation');
    const newManifest=JSON.parse(readFileSync(join(dist,newURL),'utf8'));
    assert.ok(JSON.parse(readFileSync(join(dist,newManifest.routes['/b/']),'utf8')).scripts.some(item=>item.src==='/_astro/Header.new.js'));
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('generated content covers every retained route and reruns externalized classic panel widgets',()=>{
  const manifest=builtManifest();
  const baseline=JSON.parse(readFileSync(new URL('./fixtures/classic-site-routes.json',import.meta.url),'utf8'));
  for(const route of baseline.routes){const path='/'+route.path.replace(/index\.html$/,'');assert.ok(manifest.routes[path],path);}
  const docs=JSON.parse(readFileSync(new URL('../dist'+manifest.routes['/docs/'],import.meta.url),'utf8'));
  assert.ok(docs.scripts.some(script=>script.rerun&&script.src.startsWith('/_astro/inline.')));
  assert.ok(!/<script\b/i.test(docs.content),'routed markup contains no executable script tags');
  const pages=Object.values(manifest.routes).map(src=>JSON.parse(readFileSync(new URL('../dist'+src,import.meta.url),'utf8')));
  const styles=new Map(pages.map(page=>[page.style.key,readFileSync(new URL('../dist'+page.style.src,import.meta.url),'utf8')]));
  for(const page of pages){
    assert.ok(page.style.coveredBy?.length,page.path+' declares styles that cover its complete CSS');
    for(const hash of page.style.coveredBy)assert.ok(styles.get(hash)?.startsWith(styles.get(page.style.key)),page.path+' exact CSS prefix');
  }
});

test('desktop payloads retain canonical metadata, Markdown discovery and every static JSON-LD schema',()=>{
  const manifest=builtManifest();
  let markdownPages=0;
  for(const [path,src] of Object.entries(manifest.routes)){
    const file=path.endsWith('/')?path+'index.html':path;
    const html=readFileSync(new URL('../dist'+file,import.meta.url),'utf8');
    const page=JSON.parse(readFileSync(new URL('../dist'+src,import.meta.url),'utf8'));
    assert.equal(page.canonical,html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1]||null,path);
    const schemas=[...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
    assert.deepEqual(page.schemas,schemas,path+' structured data');
    assert.ok(page.metadata.some(meta=>meta.name==='description'),path+' description');
    assert.ok(page.metadata.some(meta=>meta.property==='og:title'),path+' social title');
    const md=html.match(/<link[^>]+type="text\/markdown"[^>]+href="([^"]+)"/)?.[1]||null;
    assert.equal(page.markdown,md,path+' Markdown discovery');if(md)markdownPages++;
    if(path==='/404.html')assert.ok(page.metadata.some(meta=>meta.name==='robots'&&meta.content==='noindex, nofollow'));
  }
  assert.equal(markdownPages,83);
  const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
  assert.match(headers, /\/_desktop\/\*\s+X-Robots-Tag: noindex/);
});
