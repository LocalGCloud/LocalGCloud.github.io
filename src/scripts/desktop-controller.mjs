// Keep window controls and routing out of a phone visit.
export async function initDesktop({ pageWindowURL, desktopPageURL, readPageHistory, desktopSection, initClassic }) {
  const root = document.querySelector('[data-desktop-shell]');
  const main = root?.querySelector('[data-desktop-main]');
  const deck = root?.querySelector('[data-desktop-history]');
  const tasks = root?.querySelector('[data-desktop-tasks]');
  if (!root || !main || !deck || !tasks) return;
  if (root.dataset.ready === 'failed') {
    document.documentElement.classList.remove('desktop-view');
    document.documentElement.dataset.siteView = 'classic';
    initClassic();
    return;
  }
  if (root.dataset.ready) return;
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
  let navigationRevision = 0;
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
    const revision = navigationRevision;
    const active = () => revision === navigationRevision && wide.matches && document.documentElement.dataset.siteView === 'desktop';
    navigationReady.then(navigate => { if (active()) return navigate ? navigate(url) : (remember(),location.assign(url)); })
      .catch(() => { if (active()) location.assign(url); });
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
    if (document.documentElement.dataset.siteView === 'desktop') main.querySelector('[data-window-titlebar]').focus();
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
  window.addEventListener('pagehide', () => { if (wide.matches && document.documentElement.dataset.siteView === 'desktop') remember(); });
  const modeURL = desktopPageURL(location.href, location.href, base);
  if (modeURL) history.replaceState(history.state, '', modeURL);
  const syncTab = () => { root.querySelector('.desktop-open-tab').href = location.href; };
  const syncURL = (url) => {
    pageURL=url;syncTab();
    const skip=document.querySelector('.skip-link');if(skip)skip.href=new URL('#main-content',url).href;
    root.querySelectorAll('[data-view-choice]').forEach(link=>{const next=new URL(url);const choice=link.dataset.viewChoice;if(choice==='classic'||choice==='mobile')next.searchParams.set('view',choice);else next.searchParams.delete('view');link.href=next.href;});
  };
  syncURL(location.href);
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
  wide.addEventListener('change', () => { ++navigationRevision; if (!wide.matches) show(); });
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
    root.dataset.ready = 'failed';
    main.hidden = false;
    if (document.documentElement.dataset.siteView === 'desktop') {
      document.documentElement.classList.remove('desktop-view');
      document.documentElement.dataset.siteView = 'classic';
      initClassic();
    }
  }
}
