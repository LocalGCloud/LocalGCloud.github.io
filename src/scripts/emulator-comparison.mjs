import { comparisonMarkState, comparisonStates, docsLabel, plural, presentComparisonNotes, resultsText, selectComparisonRows } from '../utils/emulator-comparisons.mjs';

// Share selectors across row creation to keep the startup bundle compact.
const find = (scope, selector) => scope.querySelector(selector);
const findAll = (scope, selector) => scope.querySelectorAll(selector);

export function initEmulatorComparisons(scope = document) {
  findAll(scope, '[data-emulator-comparison]').forEach(root => {
    if (root.dataset.bound || root.closest('[hidden]')) return;
    root.dataset.bound = 'true';
    const controls = find(root, '[data-comparison-controls]');
    const query = find(root, 'input[type="search"]');
    const status = find(root, '[data-comparison-status]');
    const body = find(root, 'tbody');
    const categories = [...findAll(root, '[data-comparison-category]')];
    for (const category of categories) category.dataset.area = find(category, '.comparison-category-name').textContent;
    const rowTemplate = find(root, '[data-comparison-row]');
    const searchOpened = new Set();
    let data, pending, searchTimer, request = 0;
    const mode = () => find(root, 'input:checked').value;
    const inactive = () => !root.isConnected || root.closest('[hidden]');
    const load = () => data || (pending ||= fetch(root.dataset.inventory, { signal: AbortSignal.timeout(10000) })
      .then(response => { if (!response.ok) throw Error('Inventory unavailable'); return response.json(); })
      .then(rows => data = rows).catch(error => { pending = undefined; throw error; }));
    const toggle = category => find(category, 'button');
    const isOpen = category => toggle(category).ariaExpanded === 'true';
    const clear = category => { while (category.nextElementSibling?.dataset.featureId) category.nextElementSibling.remove(); delete category.dataset.view; };
    const buildRow = row => {
      const tr = rowTemplate.content.firstElementChild.cloneNode(true);
      tr.dataset.featureId = row.id;
      find(tr, 'span').textContent = row.name;
      findAll(tr, '.comparison-state').forEach((node, index) => {
        const value = [row.local, row.default, row.other][index];
        if (!value) return;
        node.dataset.state = comparisonMarkState(value);
        node.lastElementChild.textContent = comparisonStates[value];
      });
      findAll(tr, '[data-comparison-profile]').forEach(node => node.hidden = !row.default || comparisonMarkState(row.default) === comparisonMarkState(row.local));
      const [description, doc, limit] = findAll(tr, 'td:last-child > p');
      description.textContent = row.description;
      doc.hidden = !row.docs;
      if (row.docs) { doc.firstElementChild.href = row.docs; find(doc, 'span').textContent = docsLabel(row.docs); }
      limit.hidden = !row.notes;
      limit.textContent = row.notes ? `Note: ${presentComparisonNotes(row.notes)}` : '';
      return tr;
    };
    const fill = async (category, rows) => {
      const key = `${mode()}|${query.value.trim()}`, version = request;
      if (category.dataset.view === key && category.nextElementSibling?.dataset.featureId) return;
      clear(category);
      let last = category;
      for (let offset = 0; offset < rows.length; offset += 20) {
        if (version !== request || inactive()) return;
        const batch = rows.slice(offset, offset + 20).map(buildRow);
        last.after(...batch);
        last = batch.at(-1);
        // Yield between batches so input and rendering can continue.
        if (offset + 20 < rows.length) await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      }
      category.dataset.view = key;
    };
    // A category lists its matching features once it is open; a search opens every category with a match.
    const paint = (category, rows, term, current, autoOpen) => {
      const visible = term ? rows.length > 0 : current === 'all' || Number(category.dataset.exclusive) > 0;
      category.hidden = !visible;
      find(category, 'small').textContent = term ? plural(rows.length, 'matching feature')
        : `${current === 'advantages' ? `${category.dataset.exclusive} of ` : ''}${plural(Number(category.dataset.total), 'feature')}`;
      if (!visible) clear(category);
      else if (term && autoOpen && !isOpen(category)) { searchOpened.add(category); toggle(category).ariaExpanded = 'true'; }
      else if (!term && searchOpened.has(category)) { searchOpened.delete(category); toggle(category).ariaExpanded = 'false'; clear(category); }
      return visible;
    };
    const render = async (autoOpen = true) => {
      clearTimeout(searchTimer);
      const version = ++request;
      const term = query.value.trim(), current = mode();
      root.ariaBusy = 'true';
      try {
        if (!term) {
          const shown = categories.filter(category => paint(category, null, '', current));
          status.textContent = resultsText(shown.reduce((sum, category) => sum + Number(category.dataset[current === 'all' ? 'total' : 'exclusive']), 0), shown.length, current);
        }
        const rows = selectComparisonRows(await load(), { mode: current, query: term });
        if (version !== request || inactive()) return;
        const byArea = Object.create(null);
        for (const row of rows) (byArea[row.area] ||= []).push(row);
        const shown = categories.filter(category => paint(category, byArea[category.dataset.area] ?? [], term, current, autoOpen));
        await Promise.all(shown.filter(isOpen).map(category => fill(category, byArea[category.dataset.area] ?? [])));
        if (version !== request || inactive()) return;
        status.textContent = term ? (rows.length ? `${plural(rows.length, 'matching feature')} in ${plural(shown.length, 'category', 'categories')}.` : 'No matching features. Try another search.') : resultsText(rows.length, shown.length, current);
        const url = new URL(location.href);
        url.searchParams.delete('page');
        for (const [key, value] of Object.entries({ features: current === 'all' ? '' : current, q: query.value })) {
          value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
        }
        history.replaceState(history.state, '', url);
      } catch {
        if (version === request) status.textContent = 'Could not load the full table. Change a filter to retry.';
      } finally {
        if (version === request) root.ariaBusy = null;
      }
    };
    body.addEventListener('click', event => {
      const category = event.target.closest('[data-comparison-category]');
      if (!category) return;
      const open = !isOpen(category);
      searchOpened.delete(category);
      toggle(category).ariaExpanded = String(open);
      if (!open) clear(category);
      render(false);
    });
    controls.hidden = false;
    controls.addEventListener('input', event => {
      clearTimeout(searchTimer);
      ++request;
      root.ariaBusy = 'true';
      searchTimer = setTimeout(render, event.target === query ? 120 : 0);
    });
    const restore = () => {
      const params = new URL(location.href).searchParams;
      const selected = params.get('features') === 'advantages' ? 'advantages' : 'all';
      (find(root, `input[value="${selected}"]`) || find(root, 'input[type="radio"]')).checked = true;
      query.value = params.get('q') || '';
      render();
    };
    root.addEventListener('lc:comparison-restore', restore);
    restore();
  });
}

function initComparisonWorkspaces() {
  findAll(document, '[data-comparison-workspace]').forEach(workspace => {
    const tabs = [...findAll(workspace, '[data-service-tab]')];
    const panels = findAll(workspace, '[data-comparison-service]');
    const tablist = find(workspace, '[data-comparison-tabs]');
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
      const table = find(panel, '[data-emulator-comparison]');
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
