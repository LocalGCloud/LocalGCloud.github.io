import { comparisonMarkState, comparisonStates, docsLabel, plural, presentComparisonNotes, resultsText, selectComparisonRows } from '../utils/emulator-comparisons.mjs';

export function initEmulatorComparisons(scope = document) {
  scope.querySelectorAll('[data-emulator-comparison]').forEach(root => {
    if (root.dataset.bound || root.closest('[hidden]')) return;
    root.dataset.bound = 'true';
    const controls = root.querySelector('[data-comparison-controls]');
    const query = root.querySelector('input[type="search"]');
    const status = root.querySelector('[data-comparison-status]');
    const body = root.querySelector('tbody');
    const categories = [...root.querySelectorAll('[data-comparison-category]')];
    const rowTemplate = root.querySelector('[data-comparison-row]');
    const hasCompetitor = !!root.querySelector('input[value="advantages"]');
    const searchOpened = new Set();
    let data, pending, request = 0;
    const mode = () => root.querySelector('input:checked').value;
    const load = () => data || (pending ||= fetch(root.dataset.inventory, { signal: AbortSignal.timeout(10000) })
      .then(response => { if (!response.ok) throw Error('Inventory unavailable'); return response.json(); })
      .then(rows => data = rows).catch(error => { pending = undefined; throw error; }));
    const failure = () => { status.textContent = 'Could not load the full table. Change a filter to retry.'; };
    const toggle = category => category.querySelector('button');
    const isOpen = category => toggle(category).ariaExpanded === 'true';
    const featureRows = category => {
      const rows = [];
      for (let row = category.nextElementSibling; row && !row.hasAttribute('data-comparison-category'); row = row.nextElementSibling) rows.push(row);
      return rows;
    };
    const clear = category => { featureRows(category).forEach(row => row.remove()); delete category.dataset.view; };
    const buildRow = row => {
      const tr = rowTemplate.content.firstElementChild.cloneNode(true);
      tr.dataset.featureId = row.id;
      tr.querySelector('span').textContent = row.name;
      tr.querySelectorAll('.comparison-state').forEach((node, index) => {
        const value = [row.local, row.default, row.other][index];
        if (!value) return;
        node.dataset.state = comparisonMarkState(value);
        node.lastElementChild.textContent = comparisonStates[value];
      });
      tr.querySelectorAll('[data-comparison-profile]').forEach(node => node.hidden = !row.default || comparisonMarkState(row.default) === comparisonMarkState(row.local));
      const [description, doc, limit] = tr.querySelectorAll('td:last-child > p');
      description.textContent = row.description;
      doc.hidden = !row.docs;
      if (row.docs) { doc.firstElementChild.href = row.docs; doc.querySelector('span').textContent = docsLabel(row.docs); }
      limit.hidden = !row.notes;
      limit.textContent = row.notes ? `Note: ${presentComparisonNotes(row.notes)}` : '';
      return tr;
    };
    const view = () => `${mode()}|${query.value.trim()}`;
    const fill = (category, rows) => {
      if (category.dataset.view === view() && featureRows(category).length) return;
      clear(category);
      category.dataset.view = view();
      category.after(...rows.map(buildRow));
    };
    // A category lists its matching features once it is open; a search opens every category with a match.
    const paint = (category, rows, term, current) => {
      const visible = term ? rows.length > 0 : !hasCompetitor || current === 'all' || Number(category.dataset.exclusive) > 0;
      category.hidden = !visible;
      category.querySelector('small').textContent = term ? plural(rows.length, 'matching feature') : plural(Number(category.dataset.total), 'feature');
      if (!visible) clear(category);
      else if (term && !isOpen(category)) { searchOpened.add(category); toggle(category).ariaExpanded = 'true'; }
      else if (!term && searchOpened.has(category)) { searchOpened.delete(category); toggle(category).ariaExpanded = 'false'; clear(category); }
      if (visible && rows && isOpen(category)) fill(category, rows);
      return visible;
    };
    const summary = (term, current, visible, features) => {
      if (term) return features ? `${plural(features, 'matching feature')} in ${plural(visible, 'category', 'categories')}.` : 'No matching features. Try another search.';
      return resultsText(features, visible, current);
    };
    const render = async () => {
      const version = ++request;
      const term = query.value.trim(), current = mode();
      root.ariaBusy = 'true';
      try {
        if (!term) {
          const shown = categories.filter(category => paint(category, null, '', current));
          status.textContent = summary('', current, shown.length, shown.reduce((sum, category) => sum + Number(current === 'all' ? category.dataset.total : category.dataset.exclusive), 0));
        }
        const rows = selectComparisonRows(await load(), { mode: current, query: term });
        if (version !== request || !root.isConnected || root.closest('[hidden]')) return;
        const byArea = new Map();
        for (const row of rows) byArea.set(row.area, [...(byArea.get(row.area) ?? []), row]);
        const shown = categories.filter(category => paint(category, byArea.get(category.dataset.area) ?? [], term, current));
        status.textContent = summary(term, current, shown.length, rows.length);
        const url = new URL(location.href);
        url.searchParams.delete('page');
        for (const [key, value] of Object.entries({ features: current === root.dataset.defaultMode ? '' : current, q: query.value })) {
          value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
        }
        history.replaceState(history.state, '', url);
      } catch {
        if (version === request) failure();
      } finally {
        if (version === request) root.ariaBusy = null;
      }
    };
    body.addEventListener('click', async event => {
      const category = event.target.closest('[data-comparison-category]');
      if (!category) return;
      const open = !isOpen(category);
      searchOpened.delete(category);
      toggle(category).ariaExpanded = String(open);
      if (!open) { clear(category); return; }
      try {
        const rows = selectComparisonRows(await load(), { mode: mode(), query: query.value }).filter(row => row.area === category.dataset.area);
        if (isOpen(category) && root.isConnected) fill(category, rows);
      } catch { failure(); }
    });
    controls.hidden = false;
    controls.addEventListener('input', render);
    const restore = () => {
      const params = new URL(location.href).searchParams;
      const selected = ['all', 'advantages'].includes(params.get('features')) ? params.get('features') : root.dataset.defaultMode;
      (root.querySelector(`input[value="${selected}"]`) || root.querySelector('input[type="radio"]')).checked = true;
      query.value = params.get('q') || '';
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
