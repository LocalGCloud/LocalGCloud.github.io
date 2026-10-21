import { comparisonPageSize, comparisonStates, presentComparisonNotes, selectComparisonRows } from '../utils/emulator-comparisons.mjs';

export function initEmulatorComparisons() {
  document.querySelectorAll('[data-emulator-comparison]').forEach(root => {
    if (root.dataset.bound) return;
    root.dataset.bound = 'true';
    const controls = root.querySelector('[data-comparison-controls]');
    const query = root.querySelector('input[type="search"]');
    const area = root.querySelector('select');
    const status = root.querySelector('[data-comparison-status]');
    const body = root.querySelector('tbody');
    const previous = root.querySelector('[data-comparison-previous]');
    const next = root.querySelector('[data-comparison-next]');
    let data, pending, page = 1, request = 0;
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
        page = Math.max(1, Math.min(page, Math.ceil(rows.length / comparisonPageSize)));
        const start = (page - 1) * comparisonPageSize;
        body.replaceChildren(...rows.slice(start, start + comparisonPageSize).map(row => {
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
          const summary = document.createElement('summary'); summary.textContent = 'Scope and evidence';
          const text = document.createElement('p'); text.textContent = presentComparisonNotes(row.notes);
          const source = document.createElement('a'); source.href = root.dataset.sources;
          source.textContent = row.source + ', line ' + row.line + ' (source JSON)';
          details.append(summary, text, source); notes.append(details);
          tr.append(heading, local, other, notes); return tr;
        }));
        status.textContent = rows.length ? `Showing ${start + 1}–${Math.min(start + comparisonPageSize, rows.length)} of ${rows.length} matching rows.` : 'No matching features. Try All features, another area or a different search.';
        previous.disabled = page === 1; next.disabled = start + comparisonPageSize >= rows.length;
        const url = new URL(location.href);
        for (const [key, value] of Object.entries({ features: mode() === 'advantages' ? '' : mode(), q: query.value, area: area.value, page: page > 1 ? String(page) : '' })) {
          value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
        }
        history.replaceState(history.state, '', url);
      } catch {
        if (version === request) status.textContent = 'The full inventory could not load. Your current rows remain available. Try again or download the source documents below.';
      } finally {
        if (version === request) root.removeAttribute('aria-busy');
      }
    };
    root.querySelectorAll('[data-comparison-controls]').forEach(control => control.hidden = false);
    controls.addEventListener('input', () => { page = 1; render(); });
    previous.addEventListener('click', () => { page--; render(); });
    next.addEventListener('click', () => { page++; render(); });
    const params = new URL(location.href).searchParams;
    const selected = params.get('features');
    if (['all', 'broader'].includes(selected)) root.querySelector(`[value="${selected}"]`).checked = true;
    query.value = params.get('q') || '';
    if ([...area.options].some(option => option.value === params.get('area'))) area.value = params.get('area');
    page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
    if (selected || query.value || area.value || page > 1) render();
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initEmulatorComparisons);
  initEmulatorComparisons();
}
