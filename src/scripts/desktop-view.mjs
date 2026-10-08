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
  if (path === base) return 'Home';
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

export async function initMobile(historyTraversal) {
  const root = document.querySelector('[data-desktop-shell]');
  const { initMobile: initialize } = await loadViewModule(root.dataset.mobileScript);
  if (document.documentElement.dataset.siteView === 'mobile') initialize({ initViewLinks, desktopSection, historyTraversal });
}

// Both presentations use the same pinned content cache and history owner.
function contentPageURL(href) {
  const base = document.querySelector('[data-desktop-shell]').dataset.base || '/';
  const page = pageWindowURL(href, location.href, base);
  if (!page) return null;
  const url = new URL(page);
  if (new URL(location.href).searchParams.get('view') === 'mobile') url.searchParams.set('view', 'mobile');
  return url.href;
}

export function getNavigation() {
  const root = document.querySelector('[data-desktop-shell]');
  if (!root.navigationReady) root.navigationReady = loadViewModule(root.dataset.navigationScript).then(module => module.installDesktopNavigation({
    root, views: ['desktop', 'mobile'], before() {},
    validate: contentPageURL,
    synchronized: url => {
      initViewLinks(new URL(url).searchParams.get('view'));
      const skip = document.querySelector('.skip-link');
      if (skip) skip.href = new URL('#main-content', url).href;
      document.dispatchEvent(new CustomEvent('lc:page-synchronized', { detail: url }));
    },
    mounted: async (page, url, traversal) => {
      root.dataset.pageLabel = page.label;
      root.currentPage = page;
      document.dispatchEvent(new CustomEvent('lc:page-mounted', { detail: { page, url } }));
      root.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
      if (document.documentElement.dataset.siteView === 'mobile') await initMobile(traversal);
    },
  })).catch(error => { console.warn('Content navigation unavailable', error); return null; });
  return root.navigationReady;
}

export async function initDesktop() {
  const root = document.querySelector('[data-desktop-shell]');
  const { initDesktop: initialize } = await loadViewModule(root.dataset.controllerScript);
  if (document.documentElement.dataset.siteView === 'desktop') {
    await initialize({ pageWindowURL, desktopPageURL, readPageHistory, desktopSection, initClassic, getNavigation });
    if (root.currentPage && document.documentElement.dataset.siteView === 'desktop') document.dispatchEvent(new CustomEvent('lc:page-mounted', { detail: { page: root.currentPage, url: location.href } }));
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', switchView);
  let clickVersion = 0;
  window.addEventListener('lc:view-change', () => {
    ++clickVersion;
    document.querySelector('[data-desktop-content]')?.removeAttribute('aria-busy');
  });
  const goMobile = href => {
    const root = document.querySelector('[data-desktop-shell]');
    const url = contentPageURL(href);
    if (!url) return false;
    const version = ++clickVersion;
    root.querySelector('[data-desktop-content]').setAttribute('aria-busy', 'true');
    getNavigation().then(navigate => {
      if (version !== clickVersion || document.documentElement.dataset.siteView !== 'mobile') return;
      if (navigate) return navigate(url);
      location.assign(url);
    });
    return true;
  };
  document.addEventListener('click', event => {
    if (document.documentElement.dataset.siteView !== 'mobile' || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    if (!link || link.hasAttribute('data-view-choice') || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    if (goMobile(link.href)) event.preventDefault();
  }, { capture: true });
  document.addEventListener('lc:navigate', event => {
    if (document.documentElement.dataset.siteView === 'mobile' && goMobile(event.detail?.href)) event.preventDefault();
  });
  window.addEventListener('hashchange', () => initViewLinks(new URL(location.href).searchParams.get('view')));
  const start = () => {
    if (document.documentElement.dataset.siteView === 'classic') return initClassic();
    if (document.documentElement.dataset.siteView === 'mobile') {
      const main = document.querySelector('[data-desktop-main]');
      if (main) main.hidden = false;
      document.querySelectorAll('script[type="speculationrules"]').forEach(script => script.remove());
      return initMobile().then(() => {
        if ('requestIdleCallback' in window) window.requestIdleCallback(getNavigation, { timeout: 1200 });
        else setTimeout(getNavigation, 0);
      }).catch(error => {
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
