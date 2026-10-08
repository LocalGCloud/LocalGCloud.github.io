// Mobile presentation loads only when selected; URL helpers stay shared.
export function initMobile({ initViewLinks, desktopSection, historyTraversal }) {
  initViewLinks(new URL(location.href).searchParams.get('view'));
  let target;
  const fragment = new URL(location.href).hash.slice(1);
  const traversal = historyTraversal ?? (typeof performance !== 'undefined' && ['back_forward', 'reload'].includes(performance.getEntriesByType('navigation')[0]?.type));
  if (fragment) { try { target = document.getElementById(decodeURIComponent(fragment)); } catch {} }
  for (const context of document.querySelectorAll('.mobile-service-context')) {
    context.open = context.dataset.mobileOpen === 'true' || !!target && context.contains(target);
    if (traversal) { try {
      const saved = sessionStorage.getItem('lc-mobile-overview:' + location.pathname);
      if (saved !== null) context.open = saved === 'true';
    } catch {} }
    context.dataset.mobileReady = 'true';
  }
  for (const strip of document.querySelectorAll('.mobile-service-strip')) {
    if (strip.dataset.mobileReady) continue;
    strip.dataset.mobileReady = 'true';
    const selected = strip.querySelector('[aria-current="page"]');
    if (selected && !traversal) strip.scrollLeft = Math.max(0, selected.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2);
    if (traversal) { try {
      const saved = sessionStorage.getItem('lc-mobile-strip:' + new URL(location.href).pathname);
      if (saved !== null && Number.isFinite(Number(saved)) && Number(saved) >= 0) strip.scrollLeft = Number(saved);
    } catch {} }
  }
  const base = document.querySelector('[data-desktop-shell]')?.dataset.base || '/';
  const path = new URL(location.href).pathname;
  for (const link of document.querySelectorAll('[data-mobile-section]')) {
    const section = link.dataset.mobileSection;
    const active = section === 'Home' ? path === base : section === 'Services' ? desktopSection(path, base) === 'Services'
      : section === 'Docs' ? path.startsWith(base + 'docs/') || path.startsWith(base + 'glossary/') : path === base + 'about/';
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

// Native Back may restore document scroll without restoring a nested horizontal scroller.
const saveStrip = event => {
  if (document.documentElement.dataset.siteView !== 'mobile') return;
  const strip = document.querySelector('.mobile-service-strip');
  const path = event?.detail?.path || location.pathname;
  if (strip) { try { sessionStorage.setItem('lc-mobile-strip:' + path, String(strip.scrollLeft)); } catch {} }
  const overview = document.querySelector('.mobile-service-context');
  if (overview) { try { sessionStorage.setItem('lc-mobile-overview:' + path, String(overview.open)); } catch {} }
};
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveStrip);
  document.addEventListener('lc:before-navigation', saveStrip);
}
