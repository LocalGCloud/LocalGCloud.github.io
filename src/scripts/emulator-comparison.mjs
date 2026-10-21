import { comparisonStates, presentComparisonNotes, selectComparisonRows } from '../utils/emulator-comparisons.mjs';

export function initEmulatorComparisons() {
  document.querySelectorAll('[data-emulator-comparison]').forEach(root => {
    if (root.dataset.bound) return;
    root.dataset.bound = 'true';
    const controls = root.querySelector('[data-comparison-controls]');
    const query = root.querySelector('input[type="search"]');
    const area = root.querySelector('select');
    const status = root.querySelector('[data-comparison-status]');
    const body = root.querySelector('tbody');
    let data, pending, request = 0;
    const mode = () => root.querySelector('[name="comparison-mode"]:checked').value;
    const load = () => data ? Promise.resolve(data) : pending ||= fetch(root.dataset.inventory, { signal: AbortSignal.timeout(10000) })
      .then(response => { if (!response.ok) throw Error('Inventory unavailable'); return response.json(); })
      .then(rows => data = rows).catch(error => { pending = undefined; throw error; });
    const render = async () => {
      const version = ++request;
      root.setAttribute('aria-busy', 'true');
      try {
        const rows = selectComparisonRows(await load(), { mode: mode(), query: query.value, area: area.value });
        if (version !== request || !root.isConnected) return;
        body.replaceChildren(...rows.map(row => {
          const tr = document.createElement('tr');
          tr.dataset.featureId = row.id;
          const heading = document.createElement('th'); heading.scope = 'row';
          const name = document.createElement('span'); name.textContent = row.name;
          const category = document.createElement('small'); category.textContent = row.area;
          heading.append(name, category);
          const local = document.createElement('td'); local.dataset.state = row.local;
          local.textContent = comparisonStates[row.local];
          if (row.default) {
            local.textContent = 'Extended: ' + comparisonStates[row.local];
            const compatible = document.createElement('small'); compatible.textContent = 'Compatibility: ' + comparisonStates[row.default]; local.append(compatible);
          }
          const other = document.createElement('td'); other.dataset.state = row.other; other.textContent = comparisonStates[row.other];
          const notes = document.createElement('td');
          const details = document.createElement('details');
          const summary = document.createElement('summary'); summary.textContent = 'Details';
          const text = document.createElement('p'); text.textContent = presentComparisonNotes(row.notes);
          details.append(summary, text); notes.append(details);
          tr.append(heading, local, other, notes); return tr;
        }));
        status.textContent = rows.length ? `Showing ${rows.length} matching rows.` : 'No matching features. Try another filter.';
        const url = new URL(location.href);
        url.searchParams.delete('page');
        for (const [key, value] of Object.entries({ features: mode() === 'advantages' ? '' : mode(), q: query.value, area: area.value })) {
          value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
        }
        history.replaceState(history.state, '', url);
      } catch {
        if (version === request) status.textContent = 'Could not load the full table. Change a filter to retry.';
      } finally {
        if (version === request) root.removeAttribute('aria-busy');
      }
    };
    root.querySelectorAll('[data-comparison-controls]').forEach(control => control.hidden = false);
    controls.addEventListener('input', render);
    const params = new URL(location.href).searchParams;
    const selected = params.get('features');
    if (['all', 'broader'].includes(selected)) root.querySelector(`[value="${selected}"]`).checked = true;
    query.value = params.get('q') || '';
    if ([...area.options].some(option => option.value === params.get('area'))) area.value = params.get('area');
    render();
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initEmulatorComparisons);
  initEmulatorComparisons();
}
