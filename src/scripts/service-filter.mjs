// Shared by the existing catalog and the Desktop homepage catalog.
export function initServiceFilters(scope = document) {
  scope.querySelectorAll('[data-service-catalog]').forEach((catalog) => {
    if(catalog.hasAttribute?.('data-lazy-service-filter')&&!catalog.hasAttribute('data-desktop-fragment'))return;
    const input = catalog.querySelector('[data-filter-input]');
    if (!input || input.dataset.filterBound) return;
    input.dataset.filterBound = 'true';
    const update = () => {
      const query = input.value.toLowerCase().trim();
      let total = 0;
      catalog.querySelectorAll('[data-service-section]').forEach((section) => {
        let visible = 0;
        section.querySelectorAll('[data-service-name]').forEach((card) => {
          const match = !query || card.textContent.toLowerCase().includes(query);
          card.style.setProperty('display', match ? '' : 'none', match ? '' : 'important');
          if (match) visible++;
        });
        section.style.setProperty('display', visible ? '' : 'none', visible ? '' : 'important');
        total += visible;
      });
      const empty = catalog.querySelector('[data-service-empty]');
      if (empty) empty.hidden = total > 0;
    };
    input.addEventListener('input', update);
    if (input.closest?.('[data-desktop-copy]')) {
      const wide = matchMedia('(min-width: 64rem)');
      const reset = () => {
        if (!wide.matches) { input.value = ''; update(); }
      };
      wide.addEventListener('change', reset);
      if(typeof document!=='undefined')document.addEventListener('astro:before-swap',()=>wide.removeEventListener('change',reset),{once:true});
    }
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => initServiceFilters());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initServiceFilters(), { once: true });
  else initServiceFilters();
}
