export function pickView({ override } = {}) {
  return override === 'classic' ? 'classic' : 'desktop';
}

export function switchView(event) {
  const link = event.target.closest('[data-view-choice]');
  if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const url = new URL(location.href);
  if (link.dataset.viewChoice === 'classic') url.searchParams.set('view', 'classic');
  else url.searchParams.delete('view');
  location.href = url.href;
}

export function pageWindowURL(href, origin, basePath = '/') {
  if (typeof href !== 'string' || !href.trim()) return null;
  try {
    const site = new URL(origin);
    const url = new URL(href, site);
    const path = decodeURIComponent(url.pathname);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== site.origin || url.username || url.password) return null;
    if (/%2f|%5c/i.test(url.pathname) || !path.startsWith(basePath)) return null;
    if (/\/ingest(?:\/|$)/.test(path) || /\.[^/]+$/.test(path) && !/\.html$/i.test(path)) return null;
    url.searchParams.delete('view');
    return url.href;
  } catch {
    return null;
  }
}

export function desktopSection(path, base = '/') {
  const section = path.startsWith(base) ? path.slice(base.length).split('/')[0] : '';
  if (['services', 'compatibility', 'gcp-emulator'].includes(section)) return 'Services';
  if (['ai', 'agents', 'workflows', 'local-cloud-for-ai-agents'].includes(section)) return 'AI Agents';
  if (section === 'docs') return 'Docs';
  if (section === 'pricing') return 'Pricing';
  return '';
}

export function desktopPageURL(href, origin, base = '/') {
  return pageWindowURL(href, origin, base);
}

export function readPageHistory(raw, current, origin, base = '/') {
  try {
    const values = JSON.parse(raw || '[]');
    if (!Array.isArray(values)) return [];
    const here = new URL(pageWindowURL(current, origin, base));
    return values.flatMap((item) => {
      if (!item || typeof item.url !== 'string') return [];
      const url = pageWindowURL(item.url, origin, base);
      if (!url) return [];
      const page = new URL(url);
      if (page.pathname === here.pathname && page.search === here.search) return [];
      return [{
        url,
        title: typeof item.title === 'string' ? item.title.slice(0, 100) : 'Previous page',
        summary: typeof item.summary === 'string' ? item.summary.slice(0, 280) : '',
      }];
    }).slice(-6);
  } catch { return []; }
}

export function initClassic() {
  const base = document.querySelector('[data-desktop-shell]')?.dataset.base || '/';
  const formatLinks = (scope) => {
    scope.querySelectorAll('a[href]').forEach((link) => {
      if (link.hasAttribute('data-view-choice') || link.hasAttribute('download')) return;
      const page = pageWindowURL(link.href, location.href, base);
      if (!page) return;
      const url = new URL(page);
      url.searchParams.set('view', 'classic');
      link.href = url.href;
    });
  };
  formatLinks(document);
  const results = document.getElementById('search-results');
  if (results) new MutationObserver(() => formatLinks(results)).observe(results, { childList: true });
}

export async function initDesktop() {
  const root = document.querySelector('[data-desktop-shell]');
  const main = root?.querySelector('[data-desktop-main]');
  const deck = root?.querySelector('[data-desktop-history]');
  const tasks = root?.querySelector('[data-desktop-tasks]');
  if (!root || !main || !deck || !tasks || root.dataset.ready) return;
  root.dataset.ready = 'true';
  document.querySelectorAll('script[type="speculationrules"]').forEach(script=>script.remove());
  const styles = document.createElement('link');
  styles.rel = 'stylesheet';
  styles.href = root.dataset.pageStyles;
  const loaded = new Promise((resolve) => {
    const finish = (ready) => { clearTimeout(timer); resolve(ready); };
    const timer = setTimeout(() => finish(false), 8000);
    styles.onload = () => finish(true);
    styles.onerror = () => finish(false);
    document.head.append(styles);
  });
  const presentContent = () => {
    const headline = main.querySelector('h1');
    const desktopHeadline = main.querySelector('[data-desktop-headline]')?.content;
    if (headline && desktopHeadline && !headline.dataset.desktopHeadlineReady) {
      headline.append(desktopHeadline.cloneNode(true));headline.dataset.desktopHeadlineReady='true';
    }
    const hero = main.querySelector('[data-desktop-hero]');
    if(hero && !hero.dataset.heroReady){hero.after(hero.content.cloneNode(true));hero.dataset.heroReady='true';}
  };
  presentContent();

  const wide = matchMedia('(min-width: 64rem)');
  const base = root.dataset.base || '/';
  const key = 'lc-desktop-history-v1';
  let title = root.dataset.pageLabel || 'Home', pageURL = location.href;
  let navigationReady = Promise.resolve(null);
  const restore = root.querySelector('[data-desktop-restore]');
  const currentURL = () => pageWindowURL(pageURL, location.href, base);
  const historyPages = () => {
    let saved;
    try { saved = sessionStorage.getItem(key); } catch {}
    return readPageHistory(saved, pageURL, location.href, base);
  };
  const remember = () => {
    const summary = [...(main.querySelector('main')?.querySelectorAll('p') || [])]
      .filter((p) => p.getClientRects().length)
      .slice(0, 2).map((p) => p.innerText.trim()).join(' ').slice(0, 280);
    const entry = { url: currentURL(), title, summary };
    try { sessionStorage.setItem(key, JSON.stringify([...historyPages(), entry].slice(-6))); } catch {}
  };
  const go = (href) => {
    const url = desktopPageURL(href, location.href, base);
    if (!url) return false;
    if(main.hidden)show();
    navigationReady.then(navigate => navigate ? navigate(url) : (remember(),location.assign(url))).catch(()=>location.assign(url));
    return true;
  };
  const returnPrevious = () => {
    const previous = historyPages().at(-1);
    if (!previous) return false;
    go(previous.url);
    return true;
  };
  const show = () => {
    main.hidden = false;
    restore.hidden = true;
    main.querySelector('[data-window-titlebar]').focus();
  };
  const renderHistory = () => {
    const previous = historyPages();
    deck.replaceChildren();
    tasks.replaceChildren();
    previous.slice(-2).reverse().forEach((entry, index) => {
      const preview = document.createElement('a');
      preview.className = 'desktop-history-window';
      preview.href = desktopPageURL(entry.url, location.href, base);
      preview.style.setProperty('--history-depth', String(index + 1));
      preview.setAttribute('aria-label', 'Return to ' + entry.title);
      const bar = document.createElement('span');
      bar.className = 'desktop-history-title';
      bar.textContent = 'local.cloud — ' + entry.title;
      const body = document.createElement('div');
      body.className = 'desktop-history-preview';
      const heading = document.createElement('h2');
      heading.textContent = entry.title;
      const summary = document.createElement('p');
      summary.textContent = entry.summary;
      body.append(heading, summary);
      preview.append(bar, body);
      deck.append(preview);
    });
    previous.slice().reverse().forEach((entry) => {
      const link = document.createElement('a');
      link.href = desktopPageURL(entry.url, location.href, base);
      link.textContent = entry.title;
      link.title = 'Return to ' + entry.title;
      tasks.append(link);
    });
    root.querySelector('[data-desktop-back]').disabled = previous.length === 0;
  };
  renderHistory();
  window.addEventListener('pageshow', () => { if (main.hidden) show(); renderHistory(); });
  window.addEventListener('pagehide', () => { if (wide.matches) remember(); });
  const modeURL = desktopPageURL(location.href, location.href, base);
  if (modeURL) history.replaceState(history.state, '', modeURL);
  const syncTab = () => { root.querySelector('.desktop-open-tab').href = location.href; };
  const syncURL = (url) => {
    pageURL=url;syncTab();
    const skip=document.querySelector('.skip-link');if(skip)skip.href=new URL('#main-content',url).href;
    root.querySelectorAll('[data-view-choice]').forEach(link=>{const next=new URL(url);if(link.dataset.viewChoice==='classic')next.searchParams.set('view','classic');else next.searchParams.delete('view');link.href=next.href;});
  };
  syncTab();
  window.addEventListener('hashchange', () => syncURL(location.href));

  document.addEventListener('click', (event) => {
    if (!wide.matches || document.documentElement.dataset.siteView !== 'desktop' || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    if (!link || link.hasAttribute('data-view-choice') || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    const url = desktopPageURL(link.href, location.href, base);
    if (!url) return;
    event.preventDefault();
    go(url);
  }, { capture: true });
  document.addEventListener('lc:navigate', (event) => {
    if (!wide.matches || document.documentElement.dataset.siteView !== 'desktop' || !desktopPageURL(event.detail?.href, location.href, base)) return;
    event.preventDefault();
    go(event.detail.href);
  });
  root.querySelector('[data-desktop-back]').addEventListener('click', returnPrevious);
  restore.addEventListener('click', show);
  main.querySelectorAll('[data-window-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.windowAction;
      if (action === 'minimize') { main.hidden = true; restore.hidden = false; restore.focus(); }
      if (action === 'close') {
        if (!returnPrevious()) { main.hidden = true; restore.hidden = false; restore.focus(); }
      }
      if (action === 'expand') {
        const expanded = main.toggleAttribute('data-expanded');
        button.setAttribute('aria-pressed', String(expanded));
        button.setAttribute('aria-label', expanded ? 'Restore window size' : 'Expand window');
      }
    });
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && main.hidden) show(); });
  wide.addEventListener('change', () => { if (!wide.matches) show(); });
  if(root.dataset.navigationScript) navigationReady=import(root.dataset.navigationScript).then(module=>module.installDesktopNavigation({
    root,validate:href=>desktopPageURL(href,location.href,base),before:remember,
    synchronized:syncURL,
    mounted:(page,url)=>{
      pageURL=url;title=page.label;root.dataset.pageLabel=title;
      main.querySelector('[data-window-titlebar]>span').textContent='local.cloud — '+title;
      root.querySelector('[data-desktop-current]').textContent=title;
      root.querySelectorAll('[data-desktop-shortcut]').forEach(link=>{
        const active=link.dataset.windowLabel===desktopSection(new URL(url).pathname,base);
        link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
      });
      let md=root.querySelector('.desktop-markdown');
      if(page.markdown&&!md){md=document.createElement('a');md.className='desktop-markdown';md.textContent='.md';md.target='_blank';md.rel='noopener noreferrer';md.setAttribute('aria-label','Read this page as Markdown');main.querySelector('[data-window-titlebar]').insertBefore(md,root.querySelector('.desktop-open-tab'));}
      if(md){md.hidden=!page.markdown;if(page.markdown)md.href=page.markdown;}
      presentContent();renderHistory();syncURL(url);
      main.querySelectorAll('.reveal').forEach(element=>element.classList.add('visible'));
      root.querySelectorAll('.desktop-menu[open]').forEach(menu=>{menu.open=false;});
    }
  })).catch(error=>{console.warn('Desktop content navigation unavailable',error);return null;});
  // Bind controls before the optional presentation finishes downloading.
  if (await loaded) document.documentElement.classList.add('desktop-ready');
  else {
    document.documentElement.classList.remove('desktop-view');
    document.documentElement.dataset.siteView = 'classic';
    main.hidden = false;
    initClassic();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', switchView);
  const start = () => {
    if (document.documentElement.dataset.siteView === 'classic') return initClassic();
    initDesktop().catch((error) => {
      document.documentElement.classList.remove('desktop-view');
      document.documentElement.dataset.siteView = 'classic';
      console.error('Desktop view could not start', error);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
