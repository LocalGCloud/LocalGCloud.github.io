import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { pickView, switchView, pageWindowURL, desktopPageURL, readPageHistory, desktopSection, initClassic, initViewLinks, loadViewModule } from '../src/scripts/desktop-view.mjs';
import { initDesktop } from '../src/scripts/desktop-controller.mjs';
import { initMobile } from '../src/scripts/mobile-view.mjs';
import { markdownTwinPath } from '../src/utils/markdown-twins.mjs';
import { initServiceFilters } from '../src/scripts/service-filter.mjs';
import { transformSync } from 'esbuild';
import TurndownService from 'turndown';

const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const inline = [...layout.matchAll(/<script is:inline[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
inline.push(readFileSync(new URL('../src/scripts/site-interactions.mjs', import.meta.url), 'utf8'));
const bootstrap = inline.find((script) => script.includes('desktopScript'));

test('Mobile and Classic overrides beat the automatic breakpoint', () => {
  for (const [override, wide, expected] of [
    [undefined, false, 'mobile'], [undefined, true, 'desktop'],
    ['mobile', false, 'mobile'], ['mobile', true, 'mobile'],
    ['classic', false, 'classic'], ['classic', true, 'classic'],
    ['desktop', false, 'mobile'], ['desktop', true, 'desktop'],
    ['unknown', false, 'mobile'],
  ]) assert.equal(pickView({ override, wide }), expected);
});

test('a stalled optional view controller has a bounded failure', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = loadViewModule('data:text/javascript,await new Promise(() => {});');
  const rejected = assert.rejects(pending, /View controller timed out/);
  t.mock.timers.tick(8000);
  await rejected;
});

test('a Mobile navigation queued before router initialization cancels cleanly when the view changes',async()=>{
  const source=readFileSync(new URL('../src/scripts/desktop-view.mjs',import.meta.url),'utf8').replace(/export /g,'');
  const documentListeners=new Map(),windowListeners=new Map(),attrs=new Map(),assigned=[];let release;
  const pane={setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key)};
  const root={dataset:{base:'/'},querySelector:()=>pane};
  const context={URL,console,location:{href:'https://local.cloud/?view=mobile',assign:href=>assigned.push(href)},
    document:{readyState:'loading',documentElement:{dataset:{siteView:'mobile'}},querySelector:selector=>selector==='[data-desktop-shell]'?root:pane,
      addEventListener:(event,fn)=>documentListeners.set(event,fn)},window:{addEventListener:(event,fn)=>windowListeners.set(event,[...(windowListeners.get(event)||[]),fn])}};
  runInNewContext(source,context);
  context.navigation=new Promise(resolve=>{release=resolve;});
  runInNewContext('getNavigation=()=>navigation',context);
  const click={target:{closest:selector=>selector==='a'?{href:'/services/bigquery/',hasAttribute:()=>false}:null},preventDefault(){this.defaultPrevented=true;}};
  documentListeners.get('click')(click);assert.equal(click.defaultPrevented,true);assert.equal(attrs.get('aria-busy'),'true');
  context.document.documentElement.dataset.siteView='desktop';for(const listener of windowListeners.get('lc:view-change'))listener();
  release(null);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(attrs.has('aria-busy'),false);assert.deepEqual(assigned,[]);
});

test('release performance checks include both Desktop suites',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  for(const file of ['verify-desktop-view.test.mjs','verify-desktop-navigation.test.mjs'])assert.ok(pkg.scripts['test:performance'].includes(file),file);
});

test('Classic G H/D/S keyboard navigation retains the selected mode',()=>{
  let key;
  const context={URL,location:{href:'https://local.cloud/docs/?view=classic'},CustomEvent:class{},setTimeout:()=>1,clearTimeout(){},Date,
    document:{activeElement:null,querySelector:()=>({dataset:{base:'/'}}),getElementById:()=>null,createElement:()=>({setAttribute(){},querySelector:()=>null}),body:{appendChild(){}},addEventListener:(_,fn)=>key=fn,dispatchEvent:()=>true}};
  context.window=context;
  runInNewContext(readFileSync(new URL('../src/scripts/keyboard-shortcuts.mjs',import.meta.url),'utf8'),context);
  for(const [letter,path] of [['h','/'],['d','/docs/'],['s','/services/']]){
    key({key:'g'});key({key:letter});
    assert.equal(new URL(context.location.href,'https://local.cloud').pathname,path);
    assert.equal(new URL(context.location.href,'https://local.cloud').searchParams.get('view'),'classic');
  }
});

test('mounted filters release media listeners before swap',()=>{
  const retained=new Set(),events=new Map();
  const wide={matches:true,addEventListener:(_,fn)=>retained.add(fn),removeEventListener:(_,fn)=>retained.delete(fn)};
  const makeCatalog=()=>({querySelector:()=>({dataset:{},closest:()=>({}),addEventListener(){}})});
  const scope={querySelectorAll:()=>[makeCatalog()]};
  const context={scope,matchMedia:()=>wide,document:{addEventListener:(event,fn)=>events.set(event,fn)}};
  for(let i=0;i<5;i++){
    runInNewContext('('+initServiceFilters.toString()+')(scope)',context);
    assert.equal(retained.size,1);assert.ok(events.has('astro:before-swap'));
    events.get('astro:before-swap')();assert.equal(retained.size,0);
  }
});

test('Home filters load only on a fragment reveal and bind once across repeated reveals and mounts',async()=>{
  const source=readFileSync(new URL('../src/components/ServiceFilterBootstrap.astro',import.meta.url),'utf8').match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  assert.match(readFileSync(new URL('../src/components/HomepageVariationFieldManual.astro',import.meta.url),'utf8'),/<ServiceFilterBootstrap lazy/);
  const events=new Map(),loads=[];let bindings=0,visible=false;
  const input={dataset:{},addEventListener(){bindings++;}};
  const catalog={hasAttribute:name=>name==='data-lazy-service-filter'||visible&&name==='data-desktop-fragment',querySelector:()=>input};
  const context={lazy:true,filterScript:'/_astro/filter.mjs',document:{querySelectorAll:()=>[catalog],addEventListener:(name,fn)=>{assert.ok(!events.has(name),'one delegated reveal listener');events.set(name,fn);}},loadModule:async url=>{loads.push(url);return {initServiceFilters:()=>runInNewContext('('+initServiceFilters.toString()+')()',context)};}};
  context.window=context;
  const execute=()=>runInNewContext(source.replace('import(', 'loadModule('),context);
  execute();execute();
  assert.deepEqual(loads,[],'hidden plain Home does not fetch the filter');
  runInNewContext('('+initServiceFilters.toString()+')()',context);
  assert.equal(bindings,0,'a filter module already loaded by Services still skips hidden Home');
  const reveal=()=>events.get('lc:fragment-show')({target:{querySelector:()=>({dataset:{serviceFilterScript:'/_astro/filter.mjs'}})}});
  visible=true;reveal();reveal();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(bindings,1,'direct service-category fragments initialize the revealed filter once');
  input.dataset={};execute();reveal();await new Promise(resolve=>setImmediate(resolve));assert.equal(bindings,2,'a new mounted Home receives its own listener');
});

test('Blog outlines initialize each mounted article with one listener querying current nodes',()=>{
  const source=readFileSync(new URL('../src/layouts/BlogLayout.astro',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const events=new Map(),media=new Set(),first={open:false},second={open:false};let nodes=[first];
  const wide={matches:true,addEventListener:(_,fn)=>media.add(fn)};
  const context={window:{matchMedia:()=>wide},document:{querySelectorAll:()=>nodes,addEventListener:(name,fn)=>events.set(name,fn)}};
  runInNewContext(transformSync(source,{loader:'ts'}).code,context);
  assert.equal(first.open,true);assert.equal(media.size,1);
  nodes=[second];events.get('astro:page-load')();assert.equal(second.open,true);
  wide.matches=false;for(const listener of media)listener();assert.equal(second.open,false);assert.equal(first.open,true,'detached articles are not retained or mutated');
  nodes=[];for(const listener of media)listener();assert.equal(media.size,1);
});

test('Home service Markdown cards form separate list items without changing technical content',()=>{
  const source=readFileSync(new URL('./generate-markdown-twins.mjs',import.meta.url),'utf8');
  const converter=(code)=>runInNewContext(code.slice(code.indexOf('const classes ='),code.indexOf('// Apply a text transform'))+'\nconverter("https://local.cloud/")',{TurndownService,URL});
  const html='<a class="field-service" href="/services/bigquery/"><strong>BigQuery</strong><p>SQL workflows</p><span>HTTP :5388</span></a><a class="field-service" href="/services/spanner/"><strong>Spanner</strong><p>Relational workflows</p><span>gRPC :5385</span></a>';
  const markdown=converter(source).turndown(html);
  assert.equal((markdown.match(/^- /gm)||[]).length,2);assert.ok(!markdown.includes(')['));
  assert.match(markdown,/https:\/\/local\.cloud\/services\/bigquery\//);assert.match(markdown,/SQL workflows/);assert.match(markdown,/HTTP :5388/);
  const previous=source.replace('const link = text ? `[${text}](${href})` : "";\n\t\t\treturn link && classes(node).includes("field-service") ? `\\n- ${link}\\n` : link;','return text ? `[${text}](${href})` : "";');
  assert.notEqual(previous,source);
  const technical='<h1>SDK guide</h1><p>Read <a href="/docs/">docs</a>.</p><pre><code>client.query("select 1")</code></pre><table><tr><th>API</th></tr><tr><td>Query</td></tr></table>';
  assert.equal(converter(source).turndown(technical),converter(previous).turndown(technical));
});

test('authorized pageviews queue before SDK readiness and FAB dismissal survives mounts',()=>{
  const events=new Map(),captured=[];
  let fab={style:{},addEventListener(){}};
  const context={Date,posthog:{capture:(...args)=>captured.push(args)},location:{href:'https://local.cloud/docs/',pathname:'/docs/'},
    lcAnalytics:{isOn:()=>true,isReady:()=>false},localStorage:{getItem:()=> '1',setItem(){}},setInterval(){},
    document:{title:'Docs',body:{dataset:{}},querySelector:selector=>selector==='[data-feedback-fab]'?fab:null,addEventListener:(name,fn)=>events.set(name,fn)}};
  context.window=context;
  runInNewContext(readFileSync(new URL('../src/scripts/site-interactions.mjs',import.meta.url),'utf8'),context);
  fab={style:{}};events.get('astro:page-load')();
  assert.equal(captured.filter(([name])=>name==='$pageview').length,1,'early permitted navigation queues a pageview');
  assert.equal(fab.style.display,'none');assert.ok(events.has('dblclick'),'dismissal delegates to newly mounted FABs');
  context.lcAnalytics.isOn=()=>false;events.get('astro:page-load')();
  assert.equal(captured.filter(([name])=>name==='$pageview').length,1,'privacy choice still prevents capture');
  assert.match(layout,/capture_pageview:\s*false/,'SDK cannot duplicate queued explicit pageviews');
});

test('the real analytics stub retains the initial and early routes exactly once while honoring privacy',()=>{
  for(const off of [false,true]){
    const events=new Map();
    const context={URL,Date,Math,posthogApiHost:'/ingest',cloudflareAnalyticsToken:'',cloudflareAnalyticsEndpoint:'',siteRelease:'fixture',
      navigator:{globalPrivacyControl:off},location:{hostname:'local.cloud',pathname:'/',href:'https://local.cloud/'},localStorage:{getItem:()=>null},
      setTimeout(){},setInterval(){},addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}}),
      document:{title:'Home',readyState:'loading',body:{dataset:{}},querySelector:()=>null,addEventListener:(name,fn)=>events.set(name,fn)}};
    context.window=context;
    runInNewContext(inline.find(script=>script.includes('posthog.init(')),context);
    runInNewContext(readFileSync(new URL('../src/scripts/site-interactions.mjs',import.meta.url),'utf8'),context);
    for(const route of ['docs','services']){context.location.href='https://local.cloud/'+route+'/';context.document.title=route;events.get('astro:page-load')();}
    const config=context.posthog._i[0][1];assert.equal(config.capture_pageview,false);
    config.loaded();
    const views=Array.from(context.posthog).filter(call=>call[0]==='capture'&&call[1]==='$pageview').map(call=>call[2].$current_url);
    assert.deepEqual(views,off?[]:['https://local.cloud/','https://local.cloud/docs/','https://local.cloud/services/']);
  }
});

function viewHarness({ query = '', saved, wide = true, blockedStorage = false } = {}) {
  const scripts = [], classes = new Set(), listeners = new Map(), timers = [], cleared = [];
  const root = { dataset: {}, classList: {
    toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    remove: (...names) => names.forEach(name => classes.delete(name)),
  } };
  const breakpoint = { matches: wide, addEventListener: (_, callback) => listeners.set('breakpoint', callback) };
  const context = {
    desktopScript: '/_astro/desktop-view.mjs', desktopPageStyles: '/_astro/desktop-pages.css', homeImages:null, URL, URLSearchParams, Event, console,
    addEventListener: (type, callback) => listeners.set(type, callback), dispatchEvent: event => listeners.get(event.type)?.(event),
    setTimeout(callback, delay) { timers.push({callback, delay}); return timers.length; }, clearTimeout(id) { cleared.push(id); },
    location: { search: query, href: 'https://local.cloud/docs/#install-the-cli', origin: 'https://local.cloud' },
    localStorage: {
      getItem: () => { if (blockedStorage) throw Error('blocked'); return saved; },
      setItem() { if (blockedStorage) throw Error('blocked'); },
    },
    matchMedia: () => breakpoint,
    document: { documentElement: root, createElement: () => ({}), head: { appendChild: (script) => scripts.push(script) }, addEventListener: (type, callback) => listeners.set(type, callback) },
  };
  context.window = context;
  runInNewContext(bootstrap, context);
  return { context, root, classes, scripts, listeners, breakpoint, timers, cleared };
}

test('desktop bootstrap uses a trusted module script, loads once on widening, and falls back on failure', () => {
  const h = viewHarness({ query: '?view=desktop', wide: false, blockedStorage: true });
  assert.equal(h.root.dataset.siteView, 'mobile');
  assert.equal(h.scripts.length, 1, 'Mobile loads URL helpers, without Desktop styles or router');
  assert.equal(h.scripts[0].type, 'module');
  assert.equal(h.scripts[0].src, '/_astro/desktop-view.mjs');
  h.breakpoint.matches = true;
  h.listeners.get('breakpoint')();
  assert.equal(h.scripts.length, 2);
  assert.equal(h.root.dataset.siteView, 'desktop');
  assert.equal(h.scripts[1].rel, 'preload', 'Desktop styles download only when Desktop is selected');
  assert.equal(h.scripts[1].href, '/_astro/desktop-pages.css');
  h.listeners.get('breakpoint')();
  assert.equal(h.scripts.length, 2, 'resizing does not load a second controller');
  h.scripts[0].onerror();
  assert.equal(h.root.dataset.siteView, 'classic');
  assert.equal(h.classes.has('desktop-view'), false);
  assert.equal(viewHarness({ query: '?view=classic' }).scripts.length, 1, 'Classic loads only the shared URL controller, no Desktop styles');
  assert.equal(viewHarness({ saved: 'classic' }).root.dataset.siteView, 'desktop', 'plain URLs always default to Desktop');
});

test('a stalled Desktop controller restores readable Classic content and a late arrival keeps Classic', () => {
  const h = viewHarness();
  assert.equal(h.timers.length, 1);
  assert.equal(h.timers[0].delay, 8000);
  h.timers[0].callback();
  assert.equal(h.classes.has('desktop-view'), false, 'pending visibility guard is removed');
  assert.equal(h.root.dataset.siteView, 'classic');
  let classic = false;
  h.context.document.readyState = 'complete';
  h.context.initClassic = () => { classic = true; };
  h.context.initDesktop = () => { throw Error('late module must not start Desktop'); };
  h.context.switchView = () => {};
  const source = readFileSync(new URL('../src/scripts/desktop-view.mjs', import.meta.url), 'utf8');
  runInNewContext(source.slice(source.indexOf("if (typeof document !== 'undefined')")), h.context);
  h.scripts[1].onload();
  assert.equal(classic, true);
  assert.equal(h.classes.has('desktop-view'), false);
});

test('automatic resizing updates the view, while explicit Mobile and Classic stay stable', () => {
  const h = viewHarness({ wide: false });
  h.breakpoint.matches = true; h.listeners.get('breakpoint')();
  assert.equal(h.root.dataset.siteView, 'desktop');
  h.breakpoint.matches = false; h.listeners.get('breakpoint')();
  assert.equal(h.root.dataset.siteView, 'mobile');
  assert.ok(h.classes.has('mobile-view')); assert.ok(!h.classes.has('desktop-view'));
  for (const choice of ['mobile', 'classic']) {
    const explicit = viewHarness({ query: '?view=' + choice });
    assert.equal(explicit.root.dataset.siteView, choice);
    assert.ok(!explicit.listeners.has('breakpoint'));
    assert.equal(explicit.scripts.length, 1);
  }
});

test('Mobile centers only the strip once, preserves traversal and never scrolls the document', () => {
  for (const traversal of [false, true]) {
    const strip = { dataset: {}, scrollLeft: 17, clientWidth: 320, querySelector: () => ({ offsetLeft: 600, offsetWidth: 80 }) };
    const context = { URL, location: { href: 'https://local.cloud/services/cloud-run/' },
      performance: { getEntriesByType: () => [{ type: traversal ? 'back_forward' : 'navigate' }] },
      initViewLinks() {}, desktopSection,
      document: { querySelector: () => null, querySelectorAll: selector => selector === '.mobile-service-strip' ? [strip] : [], scrollTo: () => assert.fail('document must not scroll') } };
    runInNewContext('(' + initMobile.toString() + ')({initViewLinks,desktopSection})', context);
    assert.equal(strip.scrollLeft, traversal ? 17 : 480);
    strip.scrollLeft = 100;
    runInNewContext('(' + initMobile.toString() + ')({initViewLinks,desktopSection})', context);
    assert.equal(strip.scrollLeft, 100, 'resizing preserves a manual horizontal scroll');
  }
});

test('Mobile leaves an overview disclosure open for an existing descendant fragment', () => {
  const target = {};
  const overview = { dataset: {}, open: true, contains: node => node === target };
  const context = { URL, initViewLinks() {}, desktopSection, location: { href: 'https://local.cloud/services/bigquery/#typical-uses-title' },
    document: { getElementById: id => id === 'typical-uses-title' ? target : null, querySelector: () => null, querySelectorAll: selector => selector === '.mobile-service-context' ? [overview] : [] } };
  runInNewContext('(' + initMobile.toString() + ')({initViewLinks,desktopSection})', context);
  assert.equal(overview.open, true);
  context.location.href = 'https://local.cloud/services/bigquery/';
  runInNewContext('(' + initMobile.toString() + ')({initViewLinks,desktopSection})', context);
  assert.equal(overview.open, false);
});

test('native Mobile history restores a valid horizontal offset and ignores corrupt scroll state', () => {
  for (const saved of ['1200', 'broken', '-1', null]) {
    const strip={dataset:{},scrollLeft:17,clientWidth:320,querySelector:()=>({offsetLeft:600,offsetWidth:80})};
    const context={URL,initViewLinks(){},desktopSection,location:{href:'https://local.cloud/services/bigquery/'},
      performance:{getEntriesByType:()=>[{type:'back_forward'}]},sessionStorage:{getItem:()=>saved},
      document:{querySelector:()=>null,querySelectorAll:selector=>selector==='.mobile-service-strip'?[strip]:[]}};
    runInNewContext('('+initMobile.toString()+')({initViewLinks,desktopSection})',context);
    assert.equal(strip.scrollLeft,saved==='1200'?1200:17);
  }
});

test('content-only Mobile Back restores strip and overview even though the document navigation type stays navigate',()=>{
  const strip={dataset:{},scrollLeft:0,clientWidth:320,querySelector:()=>({offsetLeft:600,offsetWidth:80})};
  const overview={dataset:{},open:false,contains:()=>false};
  const context={URL,initViewLinks(){},desktopSection,location:{href:'https://local.cloud/services/bigquery/',pathname:'/services/bigquery/'},
    performance:{getEntriesByType:()=>[{type:'navigate'}]},sessionStorage:{getItem:key=>key.includes('overview')?'true':'1200'},
    document:{querySelector:()=>null,querySelectorAll:selector=>selector==='.mobile-service-strip'?[strip]:selector==='.mobile-service-context'?[overview]:[]}};
  runInNewContext('('+initMobile.toString()+')({initViewLinks,desktopSection,historyTraversal:true})',context);
  assert.equal(strip.scrollLeft,1200);assert.equal(overview.open,true);
});

test('explicit Mobile survives service links and dynamic search, preserving the content anchor', () => {
  const link = { href: '/services/spanner/#main-content', hasAttribute: () => false };
  const search = { href: '/docs/#install-the-cli', hasAttribute: () => false };
  const results = { dataset: {}, querySelectorAll: () => [search] };
  let observed;
  const context = { URL, pageWindowURL, location: { href: 'https://local.cloud/?view=mobile' },
    MutationObserver: class { constructor(fn) { observed = fn; } observe() {} },
    document: { querySelector: () => null, querySelectorAll: () => [link], getElementById: () => results } };
  runInNewContext('(' + initViewLinks.toString() + ')("mobile")', context);
  observed();
  assert.equal(link.href, 'https://local.cloud/services/spanner/?view=mobile#main-content');
  assert.equal(search.href, 'https://local.cloud/docs/?view=mobile#install-the-cli');
});

test('automatic fallback keeps clean links and native view-choice URLs retain query and fragment', () => {
  const plain={href:'/docs/#usage',hasAttribute:()=>false};
  const choice={href:'/?view=mobile',dataset:{viewChoice:'mobile'},hasAttribute:attr=>attr==='data-view-choice'};
  const context={URL,pageWindowURL,location:{href:'https://local.cloud/?q=x#section'},
    document:{querySelector:()=>null,querySelectorAll:()=>[plain,choice],getElementById:()=>null}};
  runInNewContext('const initViewLinks='+initViewLinks.toString()+';('+initClassic.toString()+')()',context);
  assert.equal(plain.href,'https://local.cloud/docs/#usage');
  assert.equal(choice.href,'https://local.cloud/?q=x&view=mobile#section');
});

test('view switching preserves the real current page and fragment', () => {
  const h = viewHarness();
  const click = { target: { closest: () => ({ dataset: { viewChoice: 'classic' } }) }, preventDefault() {} };
  h.context.click = click;
  const choose = () => runInNewContext('(' + switchView.toString() + ')(click)', h.context);
  choose();
  assert.equal(h.context.location.href, 'https://local.cloud/docs/?view=classic#install-the-cli');
  h.context.location.href = 'https://local.cloud/services/bigquery/?view=desktop#workflows';
  choose();
  assert.equal(h.context.location.href, 'https://local.cloud/services/bigquery/?view=classic#workflows');
  h.root.dataset.activePage = 'https://evil.test/';
  choose();
  assert.equal(new URL(h.context.location.href).origin, 'https://local.cloud');
  click.target.closest = () => ({ dataset: { viewChoice: 'desktop' } });
  h.context.location.href = 'https://local.cloud/docs/?lang=python&view=classic#install-the-cli';
  choose();
  assert.equal(h.context.location.href, 'https://local.cloud/docs/?lang=python#install-the-cli');
});

test('Classic keeps explicit view URLs for page links and dynamic search results, leaving files external links and view choices alone', () => {
  const link = (href, attributes = []) => ({ href, hasAttribute: (name) => attributes.includes(name) });
  const choice = { ...link('/', ['data-view-choice']), dataset: { viewChoice: 'desktop' } };
  const links = [link('/services/'), link('/docs/#install-the-cli'), link('/pricing.md'), link('https://example.com/'), choice, link('/docs/', ['download'])];
  let observed;
  const results = { dataset: {}, querySelectorAll: () => [searchLink] };
  const searchLink = link('/services/bigquery/');
  const context = {
    URL, pageWindowURL, location: { href: 'https://local.cloud/?view=classic' },
    MutationObserver: class { constructor(callback) { observed = callback; } observe() {} },
    document: { querySelector: () => ({ dataset: { base: '/' } }), querySelectorAll: () => links, getElementById: () => results },
  };
  runInNewContext('const initViewLinks = ' + initViewLinks.toString() + ';(' + initClassic.toString() + ')()', context);
  assert.equal(links[0].href, 'https://local.cloud/services/?view=classic');
  assert.equal(links[1].href, 'https://local.cloud/docs/?view=classic#install-the-cli');
  assert.deepEqual(links.slice(2).map(l => l.href), ['/pricing.md', 'https://example.com/', 'https://local.cloud/', '/docs/']);
  observed();
  assert.equal(searchLink.href, 'https://local.cloud/services/bigquery/?view=classic');
});

test('pending styles keep controls responsive and a failed or stalled download restores usable Classic content', async () => {
  for (const outcome of ['load', 'error', 'timeout']) {
  const listeners = new Map();
  const button = (action) => ({ dataset: { windowAction: action }, addEventListener: (_, handler) => listeners.set(action, handler) });
  let styles, focused = false, assigned = false;
  const restore = { hidden: true, focus() { focused = true; }, addEventListener() {} };
  const main = { hidden: false, querySelector: () => null, querySelectorAll: () => [button('close')] };
  const deck = { replaceChildren() {} }, tasks = { replaceChildren() {} }, back = { addEventListener() {} }, openTab = {};
  const elements = { '[data-desktop-main]': main, '[data-desktop-history]': deck, '[data-desktop-tasks]': tasks, '[data-desktop-restore]': restore, '[data-desktop-back]': back, '.desktop-open-tab': openTab };
  const root = { dataset: { pageStyles: '/desktop.css', pageLabel: 'Home' }, querySelector: (selector) => elements[selector], querySelectorAll: () => [] };
  const classes = new Set(['desktop-view']);
  const html = { dataset: { siteView: 'desktop' }, classList: { add: name => classes.add(name), remove: name => classes.delete(name) } };
  let timeout, cleared = false, classic = false;
  let resized;
  const wide = { matches: true, addEventListener: (_, fn) => { resized = fn; } };
  const context = {
    setTimeout(callback, delay) { assert.equal(delay, 8000); timeout = callback; return 1; },
    clearTimeout(id) { assert.equal(id, 1); cleared = true; }, initClassic() { classic = true; },
    URL, pageWindowURL, desktopPageURL, readPageHistory, desktopSection, location: { href: 'https://local.cloud/', assign() { assigned = true; } },
    sessionStorage: { getItem: () => null }, history: { replaceState() {} },
    matchMedia: () => wide, window: { addEventListener() {} },
    document: { documentElement: html, createElement: () => ({}), head: { append: (link) => { styles = link; } }, querySelector: (selector) => selector === '[data-desktop-shell]' ? root : null, querySelectorAll: () => [], getElementById: () => null, addEventListener: (name, fn) => listeners.set(name, fn) },
  };
  const pending = runInNewContext('(' + initDesktop.toString() + ')({pageWindowURL,desktopPageURL,readPageHistory,desktopSection,initClassic})', context);
  assert.ok(listeners.has('close'), 'control must not wait for the stylesheet');
  listeners.get('lc:navigate')({ detail: { href: '/docs/' }, preventDefault() {} });
  html.dataset.siteView = 'mobile'; wide.matches = false; resized();
  html.dataset.siteView = 'desktop'; wide.matches = true; resized();
  await Promise.resolve();
  assert.equal(assigned, false, 'a queued native fallback is canceled across Mobile and back');
  listeners.get('close')();
  assert.equal(main.hidden, true);
  assert.equal(restore.hidden, false);
  assert.equal(focused, true);
  assert.equal(assigned, false);
  if (outcome === 'timeout') timeout();
  else styles['on' + outcome]();
  await pending;
  assert.equal(cleared, true);
  if (outcome === 'load') {
    assert.ok(classes.has('desktop-ready'), 'ready layout can be painted');
    assert.equal(classic, false);
  } else {
    assert.equal(html.dataset.siteView, 'classic');
    assert.equal(classes.has('desktop-view'), false, 'pending visibility guard no longer applies');
    assert.equal(main.hidden, false, 'fallback content remains visible even after closing a pending window');
    assert.equal(classic, true, 'fallback links retain Classic mode');
    styles.onload();
    assert.equal(classes.has('desktop-ready'), false, 'late styling cannot reactivate Desktop after timeout');
  }
  }
});

test('hidden windows do not accumulate reading time and Escape cancels queued keyboard help', () => {
  let now = 0, tick;
  const listeners = new Map(), captured = [], scripts = [], replayed = [];
  const main = { hidden: true };
  const context = {
    Date: { now: () => now }, Math,
    posthog: { capture: (event, data) => captured.push({ event, data }) },
    location: { pathname: '/docs/' },
    document: {
      title: 'Docs', hidden: false, activeElement: null,
      body: { dataset: { keyboardScript: '/_astro/keyboard-shortcuts.mjs' } },
      head: { appendChild: (script) => scripts.push(script) },
      createElement: () => ({}), querySelector: (selector) => selector === '[data-desktop-main]' ? main : null,
      addEventListener: (type, callback) => listeners.set(type, callback),
      removeEventListener: (type) => listeners.delete(type),
      dispatchEvent: (event) => replayed.push(event),
    },
    setInterval: (callback) => { tick = callback; }, clearInterval() {},
    localStorage: { getItem: () => null },
    KeyboardEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
  };
  context.window = context;
  runInNewContext(inline.find((script) => script.includes("posthog.capture('code_copied'")), context);
  now = 125_000; tick();
  main.hidden = false;
  now += 5_000; tick();
  assert.equal(captured.length, 0);
  for (let i = 0; i < 5; i++) { now += 5_000; tick(); }
  assert.deepEqual(captured.map((event) => event.data.seconds), [30]);
  main.hidden = true;
  now += 125_000;
  main.hidden = false;
  now += 5_000; tick();
  assert.deepEqual(captured.map((event) => event.data.seconds), [30], 'a suspended hidden tab cannot jump to the 120s bucket');
  const key = listeners.get('keydown');
  key({ key: '?', preventDefault() {} });
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].type, 'module');
  key({ key: 'Escape' });
  scripts[0].onload();
  assert.equal(replayed.length, 0, 'help stays dismissed when a slow module finishes loading');
  key({ key: 'g', preventDefault() {} });
  key({ key: 'x', preventDefault() {} });
  key({ key: 'd', preventDefault() {} });
  scripts[0].onload();
  assert.equal(replayed.length, 0, 'an intervening key cancels the pending g+d sequence');
});

test('only an explicit Classic URL changes the default view', () => {
  assert.equal(pickView({}), 'desktop');
  assert.equal(pickView({ saved: 'classic' }), 'desktop');
  assert.equal(pickView({ override: 'classic', saved: 'desktop' }), 'classic');
  assert.equal(pickView({ override: 'desktop', saved: 'classic' }), 'desktop');
  assert.equal(pickView({ override: 'garbage', saved: 'classic' }), 'desktop');
  assert.equal(pickView({ saved: 'garbage' }), 'desktop');
});

test('managed windows accept local HTML pages and retain fragments', () => {
  assert.equal(pageWindowURL('/docs/#install-the-cli', 'https://local.cloud'), 'https://local.cloud/docs/#install-the-cli');
  assert.equal(pageWindowURL('/services/bigquery/?view=desktop', 'https://local.cloud'), 'https://local.cloud/services/bigquery/');
  assert.equal(pageWindowURL('/site/docs/', 'https://example.test', '/site/'), 'https://example.test/site/docs/');
  assert.equal(pageWindowURL('/404.html', 'https://local.cloud'), 'https://local.cloud/404.html');
});

test('managed windows reject external, executable, raw-file, credentialed and out-of-base destinations', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,hi', 'http://localhost:5380', '//evil.test/docs/',
    '/llms.txt', '/ai/agents.md', '/install.sh', '/sitemap.xml', '/icons/gcs.svg', '/ingest', '/ingest/events',
    'https://name:secret@local.cloud/docs/', '/ai/agents%2emd', '/docs%2fprivate/', '']) {
    assert.equal(pageWindowURL(href, 'https://local.cloud'), null, href);
  }
  assert.equal(pageWindowURL('/other/docs/', 'https://example.test', '/site/'), null);
  assert.equal(pageWindowURL('/site/../other/', 'https://example.test', '/site/'), null);
});

test('all desktop navigation URLs preserve the real route, query and fragment without a mode parameter', () => {
  assert.equal(desktopPageURL('/services/bigquery/#examples', 'https://local.cloud'), 'https://local.cloud/services/bigquery/#examples');
  assert.equal(desktopPageURL('/docs/?lang=python&view=classic#install-the-cli', 'https://local.cloud'), 'https://local.cloud/docs/?lang=python#install-the-cli');
  assert.equal(desktopPageURL('/pricing.md', 'https://local.cloud'), null);
  assert.equal(desktopPageURL('http://localhost:5380', 'https://local.cloud'), null);
});


test('history previews reject corrupt/external/raw state, exclude the current page and remain bounded', () => {
  for (const raw of ['bad JSON', '{}', 'null']) assert.deepEqual(readPageHistory(raw, '/docs/', 'https://local.cloud'), []);
  const entries = [{url:'/docs/#one',title:'Self'}, {url:'https://evil.test/',title:'External'}, {url:'/llms.txt',title:'Raw'}, ...Array.from({length:9},(_,i)=>({url:'/page-'+i+'/',title:'x'.repeat(200),summary:'y'.repeat(500)}))];
  const result = readPageHistory(JSON.stringify(entries), '/docs/#two', 'https://local.cloud');
  assert.equal(result.length, 6);
  assert.ok(result.every(p=>p.url.startsWith('https://local.cloud/page-')&&p.title.length===100&&p.summary.length===280));
});

test('deep links retain their desktop shortcut category', () => {
  assert.equal(desktopSection('/'), 'Home');
  assert.equal(desktopSection('/site/', '/site/'), 'Home');
  assert.equal(desktopSection('/site/', '/'), '');
  assert.equal(desktopSection('/services/bigquery/'), 'Services');
  assert.equal(desktopSection('/compatibility/'), 'Services');
  assert.equal(desktopSection('/docs/sdk-examples/'), 'Docs');
  assert.equal(desktopSection('/site/docs/privacy/', '/site/'), 'Docs');
  assert.equal(desktopSection('/local-cloud-for-ai-agents/'), 'AI Agents');
  assert.equal(desktopSection('/pricing/'), 'Pricing');
  assert.equal(desktopSection('/blog/'), '');
});

test('deferred desktop, keyboard and page-style assets stay small without changing the initial page ceilings', () => {
  const directory = new URL('../dist/_astro/', import.meta.url);
  // View modules now have content-addressed minified assets and public source maps.
  for (const [prefix, limit] of [['desktop-view.', 7500], ['desktop-controller.', 10000], ['mobile-view.', 2500], ['desktop-navigation.', 12000], ['site-interactions.', 5500], ['keyboard-shortcuts.', 5500], ['desktop-pages.', 9000], ['service-filter.', 2000]]) {
    const files = readdirSync(directory).filter(name => name.startsWith(prefix) && !name.endsWith('.map'));
    const file = files.find(name => name.endsWith('.js')) ?? files[0];
    assert.ok(file, 'missing deferred asset: ' + prefix);
    assert.ok(readFileSync(new URL(file, directory)).length <= limit, file + ' exceeds its deferred asset budget');
    if (/^(desktop-view|desktop-controller|mobile-view|desktop-navigation)\./.test(file)) {
      const map = JSON.parse(readFileSync(new URL(file + '.map', directory), 'utf8'));
      assert.ok(map.sourcesContent.some(source => source.includes('export ')), file + ' retains readable source');
      assert.ok(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8').includes('/_astro/' + file), 'Home references the mapped asset ' + file);
    }
  }
});

test('Home startup preloads only the image for the selected view and viewport',()=>{
  const home=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  assert.doesNotMatch(home,/<link\b[^>]*rel="preload"[^>]*as="image"/,'Home images preload only through the view/viewport selector');
  for(const [query,wide,image] of [['',true,'desktop'],['?view=classic',true,'classic'],['',false,'mobile'],['?view=mobile',true,'mobile']]){
    const h=viewHarness({query,wide});
    h.context.homeImages={desktop:{href:'/desktop.webp',imageSrcset:'/small.webp 480w, /desktop.webp 1800w',imageSizes:'56.16vw'},mobile:{href:'/mobile.webp',imageSrcset:'/small.webp 320w, /mobile.webp 800w',imageSizes:'calc(100vw - 64px)'},classic:{href:'/classic.svg'}};
    h.scripts.length=0;
    runInNewContext(bootstrap,h.context);
    const images=h.scripts.filter(item=>item.as==='image');
    assert.equal(images.length,1);assert.equal(images[0].href,h.context.homeImages[image].href);assert.equal(images[0].fetchPriority,'high');
    assert.equal(images[0].imageSrcset,h.context.homeImages[image].imageSrcset);
    assert.equal(images[0].imageSizes,h.context.homeImages[image].imageSizes);
  }
});

test('homepage and catalog filtering matches rendered facts, restores all cards, and exposes empty results', () => {
  const style = () => ({ setProperty(name, value, priority) { this[name] = value; this.priority = priority; } });
  const cards = [
    { textContent: 'BigQuery SQL workflows HTTP/REST :5388', style: style() },
    { textContent: 'Firestore opt-in to save memory GRPC :5384', style: style() },
  ];
  const sections = cards.map((card) => ({ style: style(), querySelectorAll: () => [card] }));
  const empty = { hidden: true };
  let update, bindings = 0;
  const input = { value: '', dataset: {}, addEventListener: (_, callback) => { update = callback; bindings++; } };
  const catalog = {
    querySelector: (selector) => selector === '[data-filter-input]' ? input : empty,
    querySelectorAll: () => sections,
  };
  const scope = { querySelectorAll: () => [catalog] };
  initServiceFilters(scope);
  initServiceFilters(scope);
  assert.equal(bindings, 1);
  input.value = '5388'; update();
  assert.equal(cards[0].style.display, '');
  assert.equal(cards[1].style.display, 'none');
  assert.equal(cards[1].style.priority, 'important', 'filtering overrides the Desktop grid display rule');
  assert.equal(empty.hidden, true);
  input.value = 'not-a-service'; update();
  assert.equal(empty.hidden, false);
  assert.ok(sections.every((section) => section.style.display === 'none'));
  input.value = ''; update();
  assert.equal(empty.hidden, true);
  assert.ok(cards.every((card) => card.style.display === ''));
  input.dataset.filterBound = '';
  input.closest = () => ({});
  let resized;
  const wide = { matches: true, addEventListener: (_, handler) => { resized = handler; } };
  runInNewContext('(' + initServiceFilters.toString() + ')(scope)', { scope, matchMedia: () => wide });
  input.value = 'BigQuery'; update();
  assert.equal(cards[1].style.display, 'none');
  wide.matches = false; resized();
  assert.equal(input.value, '', 'narrowing clears a filter whose control is Desktop-only');
  assert.ok(cards.every((card) => card.style.display === ''));
});

test('all pre-change HTML routes retain their canonical and original main content region', () => {
  const baseline = JSON.parse(readFileSync(new URL('./fixtures/classic-site-routes.json', import.meta.url), 'utf8'));
  for (const route of baseline.routes) {
    const file = new URL('../dist/' + route.path, import.meta.url);
    assert.ok(existsSync(file), 'lost route: ' + route.path);
    const html = readFileSync(file, 'utf8');
    assert.match(html, /<main\b[^>]*id="main-content"/, route.path);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, route.path);
    if (route.canonical) assert.ok(html.includes('href="' + route.canonical + '"'), 'changed canonical: ' + route.path);
    assert.doesNotMatch(html.replace(/<a\b[^>]*data-view-choice[^>]*>/g, ''), /<a\b[^>]*href="[^"]*[?&]view=(?:classic|desktop)/, 'server-rendered page links need no Desktop rewrite: ' + route.path);
  }
});

test('every content route exposes its generated Markdown version; error pages are excluded', () => {
  const baseline = JSON.parse(readFileSync(new URL('./fixtures/classic-site-routes.json', import.meta.url), 'utf8'));
  let count = 0;
  for (const entry of baseline.routes) {
    if (entry.path === '404.html') continue;
    const route = '/' + entry.path.replace(/index\.html$/, '');
    const twin = markdownTwinPath(route);
    assert.ok(twin, route);
    const file = new URL('../dist' + twin, import.meta.url);
    assert.ok(existsSync(file), twin);
    assert.match(readFileSync(file, 'utf8'), /^# .+/);
    assert.ok(readFileSync(new URL('../dist/' + entry.path, import.meta.url), 'utf8').includes('href="'+twin+'"'), route);
    count++;
  }
  assert.equal(count, 83);
});
