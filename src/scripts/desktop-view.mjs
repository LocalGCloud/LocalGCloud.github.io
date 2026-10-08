export function pickView({ override, wide = true } = {}) {
  if (override === 'classic' || override === 'mobile') return override;
  return wide ? 'desktop' : 'mobile';
}

export function switchView(event) {
  const link = event.target.closest('[data-view-choice]');
  if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const url = new URL(location.href);
  const choice = link.dataset.viewChoice;
  if (choice === 'classic' || choice === 'mobile') url.searchParams.set('view', choice);
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

export function initViewLinks(view) {
  const base = document.querySelector('[data-desktop-shell]')?.dataset.base || '/';
  const formatLinks = (scope) => {
    scope.querySelectorAll('a[href]').forEach((link) => {
      if (link.hasAttribute('data-view-choice')) {
        const url = new URL(location.href);
        const choice = link.dataset.viewChoice;
        if (choice === 'classic' || choice === 'mobile') url.searchParams.set('view', choice);
        else url.searchParams.delete('view');
        link.href = url.href;
        return;
      }
      if (link.hasAttribute('download')) return;
      const page = pageWindowURL(link.href, location.href, base);
      if (!page) return;
      const url = new URL(page);
      if (view === 'classic' || view === 'mobile') url.searchParams.set('view', view);
      link.href = url.href;
    });
  };
  formatLinks(document);
  const results = document.getElementById('search-results');
  if (results && !results.dataset.viewLinksReady) {
    results.dataset.viewLinksReady = 'true';
    new MutationObserver(() => formatLinks(results)).observe(results, { childList: true });
  }
}

export function initClassic() {
  initViewLinks(new URL(location.href).searchParams.get('view'));
}

export async function loadViewModule(src) {
  let timer;
  try {
    return await Promise.race([import(src), new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('View controller timed out')), 8000);
    })]);
  } finally { clearTimeout(timer); }
}

export async function initMobile() {
  for (const template of document.querySelectorAll('[data-mobile-headline]')) {
    if (!template.dataset.headlineReady) {
      template.closest('.field-hero').querySelector('h1').append(template.content.cloneNode(true));
      template.dataset.headlineReady = 'true';
    }
  }
  for (const template of document.querySelectorAll('[data-mobile-hero]')) {
    if (!template.dataset.heroReady) {
      template.after(template.content.cloneNode(true));
      template.dataset.heroReady = 'true';
    }
  }
  const root = document.querySelector('[data-desktop-shell]');
  const { initMobile: initialize } = await loadViewModule(root.dataset.mobileScript);
  if (document.documentElement.dataset.siteView === 'mobile') initialize({ initViewLinks, desktopSection });
}

export async function initDesktop() {
  const root = document.querySelector('[data-desktop-shell]');
  const { initDesktop: initialize } = await loadViewModule(root.dataset.controllerScript);
  if (document.documentElement.dataset.siteView === 'desktop') return initialize({ pageWindowURL, desktopPageURL, readPageHistory, desktopSection, initClassic });
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', switchView);
  window.addEventListener('hashchange', () => initViewLinks(new URL(location.href).searchParams.get('view')));
  const start = () => {
    if (document.documentElement.dataset.siteView === 'classic') return initClassic();
    if (document.documentElement.dataset.siteView === 'mobile') {
      const main = document.querySelector('[data-desktop-main]');
      if (main) main.hidden = false;
      return initMobile().catch(error => {
        if (document.documentElement.dataset.siteView === 'mobile') {
          document.documentElement.classList.remove('mobile-view');
          document.documentElement.dataset.siteView = 'classic';
          initClassic();
        }
        console.error('Mobile view could not start', error);
      });
    }
    for (const context of document.querySelectorAll('.mobile-service-context')) {
      if (context.dataset.mobileReady) context.dataset.mobileOpen = String(context.open);
      context.open = true;
    }
    initDesktop().catch((error) => {
      const root = document.querySelector('[data-desktop-shell]');
      if (root) root.dataset.ready = 'failed';
      if (document.documentElement.dataset.siteView === 'desktop') {
        document.documentElement.classList.remove('desktop-view');
        document.documentElement.dataset.siteView = 'classic';
        initClassic();
      }
      console.error('Desktop view could not start', error);
    });
  };
  window.addEventListener('lc:view-change', () => { if (document.readyState !== 'loading') start(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
