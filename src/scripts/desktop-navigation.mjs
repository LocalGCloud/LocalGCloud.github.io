export function safeDesktopAsset(href, origin, base = '/') {
  try {
    const url = new URL(href, origin);
    if (url.origin !== new URL(origin).origin || url.username || url.password || url.search || url.hash || /%2f|%5c/i.test(url.pathname)) return null;
    if (!url.pathname.startsWith(base + '_astro/') && !url.pathname.startsWith(base + '_desktop/')) return null;
    return url.href;
  } catch { return null; }
}

const sha = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(byte => byte.toString(16).padStart(2,'0')).join('');

export async function installDesktopNavigation({root, validate, before, mounted, synchronized = () => {}, views = ['desktop']}) {
  const pane = root.querySelector('[data-desktop-content]'), base = root.dataset.base || '/';
  const mobile=()=>document.documentElement.dataset.siteView==='mobile';
  const active=()=>views.includes(document.documentElement.dataset.siteView)&&(mobile()||matchMedia('(min-width:64rem)').matches);
  const scrolling=()=>mobile()?document.scrollingElement:pane;
  const originalStyle = await sha([...document.querySelectorAll('style')].map(el => el.textContent).join('\n'));
  const ran = new Set(await Promise.all([...document.scripts].map(async script => script.src ? 'url:' + new URL(script.src).pathname : 'inline:' + await sha(script.textContent))));
  const cache = new Map();
  let manifest, sequence = 0, contentVersion = 0, rendered = new URL(location.href), activeStyle, changing = false, swapping = false, scrollTimer;
  const json = async (url) => {
    const safe = safeDesktopAsset(url,location.href,base);
    if (!safe) throw Error('Invalid desktop content URL');
    const controller=new AbortController();let timer;
    try { return await Promise.race([
      (async()=>{const response=await fetch(safe,{credentials:'same-origin',redirect:'error',signal:controller.signal});
        if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Desktop content unavailable');
        return response.json();})(),
      new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Desktop content timed out'));},8000);})
    ]); } finally {clearTimeout(timer);}
  };
  const content = async (url) => {
    const path = new URL(url).pathname;
    if (cache.has(path)) return cache.get(path);
    manifest ||= json(root.dataset.desktopManifest).catch(error=>{manifest=undefined;throw error;});
    const source = (await manifest).routes[path];
    if (!source) throw Error('No desktop content for route');
    const pending = json(source).then(page => {
      if (page.path !== path || typeof page.content !== 'string' || typeof page.title !== 'string' || !Array.isArray(page.scripts) || !Array.isArray(page.metadata) || !Array.isArray(page.schemas) || !page.style?.key) throw Error('Invalid desktop content');
      return page;
    });
    cache.set(path,pending);
    if (cache.size > 6) cache.delete(cache.keys().next().value);
    try { return await pending; } catch(error) { cache.delete(path); throw error; }
  };
  const script = (item) => new Promise((resolve,reject) => {
    if (!item.rerun && ran.has(item.key)) return resolve();
    const src = safeDesktopAsset(item.src,location.href,base);
    if (!src || !new URL(src).pathname.startsWith(base+'_astro/') || !/^sha256-[A-Za-z0-9+/]+=*$/.test(item.integrity || '')) return reject(Error('Invalid desktop script'));
    const tag = document.createElement('script');
    if (item.type === 'module') tag.type = 'module';
    tag.src = src; tag.integrity = item.integrity; tag.async = false;
    const timer=setTimeout(()=>tag.onerror(),8000);
    tag.onload = () => {clearTimeout(timer);ran.add(item.key);tag.remove();resolve();};
    tag.onerror = () => {clearTimeout(timer);tag.remove();reject(Error('Desktop script failed'));};
    document.head.append(tag);
  });
  const styling = (page) => new Promise((resolve,reject) => {
    if (page.style.key === originalStyle || page.style.coveredBy?.includes(originalStyle)) return resolve(null);
    if (activeStyle?.dataset.styleKey === page.style.key) return resolve(activeStyle);
    const src = safeDesktopAsset(page.style.src,location.href,base);
    if (!src || !new URL(src).pathname.startsWith(base+'_astro/') || !src.endsWith('.css')) return reject(Error('Invalid desktop stylesheet'));
    const tag = document.createElement('link'); tag.rel='stylesheet';tag.href=src;tag.integrity=page.style.integrity;tag.dataset.styleKey=page.style.key;
    const timer=setTimeout(()=>tag.onerror(),8000);
    tag.onload = () => {clearTimeout(timer);resolve(tag);};tag.onerror=()=>{clearTimeout(timer);tag.remove();reject(Error('Desktop stylesheet failed'));};
    const refinements = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href === new URL(root.dataset.pageStyles,location.href).href);
    document.head.insertBefore(tag,refinements || null);
  });
  const metadata = (page) => {
    document.title = page.title;
    document.querySelectorAll('meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],meta[property^="article:"]').forEach(el => el.remove());
    for (const entry of page.metadata) {
      const el=document.createElement('meta');el.setAttribute(entry.name?'name':'property',entry.name||entry.property);el.content=entry.content;document.head.append(el);
    }
    let canonical=document.querySelector('link[rel="canonical"]');
    if (!page.canonical) canonical?.remove();
    else { if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href=page.canonical; }
    let markdown=document.querySelector('link[rel="alternate"][type="text/markdown"]');
    if(!page.markdown)markdown?.remove();
    else {if(!markdown){markdown=document.createElement('link');markdown.rel='alternate';markdown.type='text/markdown';markdown.title='Markdown version';document.head.append(markdown);}markdown.href=page.markdown;}
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>el.remove());
    for(const schema of page.schemas){const el=document.createElement('script');el.type='application/ld+json';el.textContent=JSON.stringify(schema);document.head.append(el);}
  };
  const assets=new Set();
  const warmAssets=(page)=>{
    if (!active()) return;
    const items=page.scripts.filter(item=>item.rerun||!ran.has(item.key));
    if(page.style.key!==originalStyle&&!page.style.coveredBy?.includes(originalStyle))items.push({...page.style,type:'style'});
    for(const item of items){
      const src=safeDesktopAsset(item.src,location.href,base);
      if(!src||!new URL(src).pathname.startsWith(base+'_astro/')||!/^sha256-[A-Za-z0-9+/]+=*$/.test(item.integrity||'')||assets.has(src))continue;
      assets.add(src);const tag=document.createElement('link');tag.rel=item.type==='module'?'modulepreload':'preload';
      if(tag.rel==='preload')tag.as=item.type==='style'?'style':'script';tag.href=src;tag.integrity=item.integrity;
      tag.onload=tag.onerror=()=>tag.remove();document.head.append(tag);
    }
  };
  const focus=target=>{
    if(!target)return;
    if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  };
  const scrollToContent = (url, scroll, traversal = false) => {
    pane.querySelectorAll?.('[data-desktop-fragment]').forEach(el=>el.removeAttribute('data-desktop-fragment'));
    if (url.hash) { try {
      const target=document.getElementById(decodeURIComponent(url.hash.slice(1)));
      const section=target?.closest?.('.field-home__shell > :not(.field-hero)');
      section?.setAttribute('data-desktop-fragment','');
      section?.dispatchEvent(new Event('lc:fragment-show',{bubbles:true}));
      if(target&&!traversal){for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;target.scrollIntoView();focus(target);}
    } catch {} }
    if(traversal||!url.hash)scrolling().scrollTop=scroll||0;
  };
  const positions=new Map(),session=crypto.randomUUID();let entry=0,renderedEntry=session+':0';
  let mode=document.documentElement.dataset.siteView;
  const restoreMode=()=>{history.scrollRestoration=mobile()&&active()?'manual':'auto';};
  restoreMode();
  window.addEventListener('pageshow',restoreMode);
  window.addEventListener('lc:view-change',()=>{
    restoreMode();
    if(mode===document.documentElement.dataset.siteView&&active())return;
    mode=document.documentElement.dataset.siteView;
    ++sequence;changing=false;swapping=false;pane.removeAttribute('aria-busy');
    const current=new URL(location.href);
    // A pending Back already changed the URL; use its real document when leaving Desktop.
    if(current.pathname!==rendered.pathname||current.search!==rendered.search)location.reload();
  });
  const saveScroll=()=>{
    clearTimeout(scrollTimer);scrollTimer=undefined;
    if(swapping||!active())return;
    positions.set(renderedEntry,scrolling().scrollTop);
    if(positions.size>50)positions.delete(positions.keys().next().value);
    if(rendered.pathname===location.pathname&&rendered.search===location.search)history.replaceState({...history.state,lcDesktop:true,lcEntry:renderedEntry,lcScroll:scrolling().scrollTop},'',location.href);
  };
  saveScroll();if(rendered.hash&&active()&&!mobile())scrollToContent(rendered);
  const scrolled=()=>{
    if(swapping||!active())return;
    positions.set(renderedEntry,scrolling().scrollTop);if(positions.size>50)positions.delete(positions.keys().next().value);
    if(!scrollTimer)scrollTimer=setTimeout(saveScroll,500);
  };
  pane.addEventListener('scroll',scrolled,{passive:true});
  window.addEventListener('scroll',()=>{if(mobile())scrolled();},{passive:true});
  window.addEventListener('pagehide',()=>{saveScroll();history.scrollRestoration='auto';});
  const navigate = async (href, traversal = false) => {
    if (!active()) return false;
    const target = validate(href);
    if (!target) return false;
    window.__lcSearch?.close();
    if(!root.dataset.desktopManifest){location.assign(target);return false;}
    if(mobile())document.dispatchEvent(new CustomEvent('lc:before-navigation',{detail:{path:rendered.pathname}}));
    if(!traversal)saveScroll();
    const url = new URL(target), version = ++sequence, savedScroll = traversal ? positions.get(history.state?.lcEntry) ?? history.state?.lcScroll : undefined;
    if (url.pathname===rendered.pathname && url.search===rendered.search) {
      changing=false;pane.removeAttribute('aria-busy');
      if(!traversal)history.pushState({lcDesktop:true,lcEntry:session+':'+ ++entry,lcScroll:0},'',url);
      renderedEntry=history.state?.lcEntry;
      rendered=url;synchronized(url.href);
      scrollToContent(url,savedScroll,traversal);return true;
    }
    pane.setAttribute('aria-busy','true');
    changing=true;
    let nextStyle,mountedVersion;
    try {
      const page = await content(url);
      if (version!==sequence || !active()) return false;
      warmAssets(page);
      nextStyle = await styling(page);
      if(version!==sequence||!active()){if(nextStyle!==activeStyle)nextStyle?.remove();return false;}
      before();
      document.dispatchEvent(new Event('astro:before-swap'));
      saveScroll();swapping=true;
      pane.innerHTML = page.content;
      mountedVersion=++contentVersion;
      if(!traversal)history.pushState({lcDesktop:true,lcEntry:session+':'+ ++entry,lcScroll:0},'',url);
      renderedEntry=history.state?.lcEntry;
      rendered = url;
      if(mobile()&&!traversal&&!url.hash)scrolling().scrollTop=0;
      if(!mobile())swapping=false;
      if(activeStyle!==nextStyle)activeStyle?.remove();activeStyle=nextStyle;
      metadata(page);
      synchronized(url.href);
      await mounted(page,url.href,traversal);
      if(mountedVersion!==contentVersion)return false;
      if(mobile()&&version===sequence&&(traversal||url.hash))scrollToContent(url,savedScroll,traversal);
      swapping=false;
      for(const item of page.scripts){if(mountedVersion!==contentVersion)return false;await script(item);}
      if(mountedVersion!==contentVersion)return false;
      document.dispatchEvent(new Event('astro:page-load'));
      if(version===sequence&&active()){if(!mobile()||traversal||!url.hash)scrollToContent(url,positions.get(renderedEntry)??savedScroll,traversal);if(!url.hash&&!traversal)focus(pane.querySelector?.('main h1, main'));}
      return true;
    } catch(error) {
      if(active()&&(version===sequence||mountedVersion===contentVersion&&!changing)){if(nextStyle!==activeStyle)nextStyle?.remove();location.assign(mountedVersion===contentVersion?rendered:url);}
      return false;
    } finally {if(mountedVersion===contentVersion)swapping=false;if(version===sequence){changing=false;pane.removeAttribute('aria-busy');} }
  };
  window.addEventListener('popstate',()=>{
    if (!active()) { if (history.state?.lcDesktop) location.reload(); return; }
    navigate(location.href,true);
  });
  const warmed=new Set();
  const warm=(event)=>{
    if(!active()||navigator.connection?.saveData||/^(slow-)?2g$/.test(navigator.connection?.effectiveType||''))return;
    const link=event.target.closest('a');
    if(!link||link.hasAttribute('download')||link.hasAttribute('data-view-choice')||link.target&&link.target!=='_self')return;
    const url=validate(link.href);if(!url)return;
    const path=new URL(url).pathname;if(warmed.has(path)||warmed.size===3||path===rendered.pathname)return;
    warmed.add(path);content(url).then(warmAssets).catch(()=>{});
  };
  document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);
  document.addEventListener('pointerdown',event=>{if(mobile())warm(event);},{passive:true});
  const warmMobile=()=>{
    if(!mobile())return;
    for(const link of pane.querySelectorAll?.('.mobile-service-strip a')||[])warm({target:link});
  };
  const idleWarm=()=>{
    if('requestIdleCallback' in window)window.requestIdleCallback(warmMobile,{timeout:2000});
    else setTimeout(warmMobile,0);
  };
  if(document.readyState==='complete')idleWarm();
  else window.addEventListener('load',idleWarm,{once:true});
  return navigate;
}
