import { comparisonStates, presentComparisonNotes, selectComparisonRows } from '../utils/emulator-comparisons.mjs';

export function initEmulatorComparisons(scope = document) {
  scope.querySelectorAll('[data-emulator-comparison]').forEach(root => {
    if (root.dataset.bound || root.closest('[hidden]')) return;
    root.dataset.bound = 'true';
    const controls = root.querySelector('[data-comparison-controls]');
    const query = root.querySelector('input[type="search"]');
    const area = root.querySelector('select');
    const status = root.querySelector('[data-comparison-status]');
    const body = root.querySelector('tbody');
    const template = root.querySelector('[data-comparison-row]');
    let data, pending, request = 0;
    const mode = () => root.querySelector('input:checked').value;
    const load = () => data || (pending ||= fetch(root.dataset.inventory, { signal: AbortSignal.timeout(10000) })
      .then(response => { if (!response.ok) throw Error('Inventory unavailable'); return response.json(); })
      .then(rows => data = rows).catch(error => { pending = undefined; throw error; }));
    const render = async () => {
      const version = ++request;
      root.ariaBusy = 'true';
      try {
        const rows = selectComparisonRows(await load(), { mode: mode(), query: query.value, area: area.value });
        if (version !== request || !root.isConnected || root.closest('[hidden]')) return;
        body.replaceChildren(...rows.map(row => {
          const tr = template.content.firstElementChild.cloneNode(true);
          tr.dataset.featureId = row.id;
          tr.querySelector('span').textContent = row.name;
          tr.querySelector('small').textContent = row.area;
          tr.querySelectorAll('.comparison-state').forEach((node, index) => {
            const value = [row.local, row.default, row.other][index];
            if (!value) return;
            node.dataset.state = value;
            node.lastElementChild.textContent = comparisonStates[value];
          });
          tr.querySelectorAll('[data-comparison-profile]').forEach(node => node.hidden = !row.default || row.default === row.local);
          const [description, limit] = tr.querySelectorAll('td:last-child > p');
          description.textContent = row.description;
          limit.hidden = !row.notes;
          limit.textContent = row.notes ? `Note: ${presentComparisonNotes(row.notes)}` : '';
          return tr;
        }));
        status.textContent = rows.length ? `Showing ${rows.length} matching rows.` : 'No matching features. Try another filter.';
        const url = new URL(location.href);
        url.searchParams.delete('page');
        for (const [key, value] of Object.entries({ features: mode() === root.dataset.defaultMode ? '' : mode(), q: query.value, area: area.value })) {
          value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
        }
        history.replaceState(history.state, '', url);
      } catch {
        if (version === request) status.textContent = 'Could not load the full table. Change a filter to retry.';
      } finally {
        if (version === request) root.ariaBusy = null;
      }
    };
    controls.hidden = false;
    controls.addEventListener('input', render);
    const restore = () => {
      const params = new URL(location.href).searchParams;
      const selected = ['all', 'broader'].includes(params.get('features')) ? params.get('features') : 'advantages';
      (root.querySelector(`input[value="${selected}"]`) || root.querySelector('input[type="radio"]')).checked = true;
      query.value = params.get('q') || '';
      area.value = [...area.options].some(option => option.value === params.get('area')) ? params.get('area') : '';
      render();
    };
    root.addEventListener('lc:comparison-restore', restore);
    restore();
  });
}

function initComparisonWorkspaces() {
  document.querySelectorAll('[data-comparison-workspace]').forEach(workspace => {
    const tabs = [...workspace.querySelectorAll('[data-service-tab]')];
    const panels = workspace.querySelectorAll('[data-comparison-service]');
    const tablist = workspace.querySelector('[data-comparison-tabs]');
    tablist.hidden = false;
    const activate = (tab, push) => {
      if (push) {
        const url = new URL(location.href);
        url.searchParams.set('service', tab.dataset.serviceTab);
        url.searchParams.delete('area');
        history.pushState(history.state, '', url);
      }
      tabs.forEach((item, index) => {
        const selected = item === tab;
        item.ariaSelected = String(selected);
        item.tabIndex = selected ? 0 : -1;
        panels[index].hidden = !selected;
      });
      tablist.ariaOrientation = matchMedia('(min-width:64rem)').matches ? 'vertical' : 'horizontal';
      const panel = panels[tabs.indexOf(tab)];
      const table = panel.querySelector('[data-emulator-comparison]');
      if (table.dataset.bound) table.dispatchEvent(new Event('lc:comparison-restore'));
      else initEmulatorComparisons(panel);
    };
    tablist.onclick = event => {
      const tab = event.target.closest('[data-service-tab]');
      if (tab && tab.ariaSelected !== 'true') activate(tab, true);
    };
    tablist.onkeydown = event => {
      const index = tabs.indexOf(event.target);
      if (index < 0) return;
      const offset = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : offset ? (index + offset + tabs.length) % tabs.length : -1;
      if (next < 0) return;
      event.preventDefault();
      tabs[next].focus();
      if (tabs[next].ariaSelected !== 'true') activate(tabs[next], true);
    };
    activate(tabs.find(tab => tab.dataset.serviceTab === new URL(location.href).searchParams.get('service')) || tabs[0]);
  });
}

if (typeof document !== 'undefined') {
  const init = () => { initComparisonWorkspaces(); initEmulatorComparisons(); };
  document.addEventListener('astro:page-load', init);
  window.addEventListener('popstate', initComparisonWorkspaces);
  matchMedia('(min-width:64rem)').addEventListener('change', initComparisonWorkspaces);
  init();
}
