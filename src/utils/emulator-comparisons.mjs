// A documented limit reads as supported: the mark says the feature works and the note says how far.
export const comparisonStates = {
  available: 'Available', limited: 'Available', unavailable: 'Not available',
  unknown: 'Not assessed', na: 'Not applicable', 'no-effect': 'Accepted, no effect',
};
export const comparisonMarkState = state => state === 'limited' ? 'available' : state;

// Only in LocalCloud: it works here, with or without a documented limit, and the compared emulator lacks it.
export const isOnlyInLocalCloud = row => ['available', 'limited'].includes(row.local) && ['unavailable', 'no-effect'].includes(row.other);

// Preserve the evidence wording in downloads; use the site's vocabulary in the UI.
export function presentComparisonNotes(text) {
  return text.replace(/\bpartial\b(?! (?:index(?:es)?|updates?|responses?)\b)/gi, 'limited')
    .replace(/\bpartially\b/gi, 'with limits')
    .replace(/source qualification/gi, 'source-name resolution')
    .replace(/qualification/gi, 'verification')
    .replace(/semantic-compatibility:/gi, 'Behavior boundary: ')
    .replace(/\b[0-9a-f]{40}\b/gi, value => value.slice(0, 12));
}

export function selectComparisonRows(rows, { mode = 'advantages', query = '' } = {}) {
  const term = query.toLowerCase().trim();
  return rows.filter(row => (mode === 'all' || isOnlyInLocalCloud(row))
    && (!term || [row.name, row.id, row.area, row.description, row.notes].join(' ').toLowerCase().includes(term)));
}

// Categories in document order, each with its feature count and how many are only in LocalCloud.
export function groupComparisonRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.area) ?? groups.set(row.area, { area: row.area, rows: [], total: 0, exclusive: 0 }).get(row.area);
    group.rows.push(row);
    group.total++;
    if (isOnlyInLocalCloud(row)) group.exclusive++;
  }
  return [...groups.values()];
}

export const plural = (count, noun, many = `${noun}s`) => `${count.toLocaleString('en-US')} ${count === 1 ? noun : many}`;

// The line under the controls before anyone opens a category.
export const resultsText = (features, categories, mode) =>
  `${plural(features, 'feature')}${mode === 'all' ? '' : ' only in LocalCloud'} in ${plural(categories, 'category', 'categories')}. Select a category to see them.`;

// What a category header says: its features, and how many of them the compared emulator lacks.
export function groupLabel({ total, exclusive }, { mode = 'advantages', hasCompetitor = true } = {}) {
  if (!hasCompetitor) return plural(total, 'feature');
  return mode === 'all' ? `${plural(total, 'feature')} · ${exclusive.toLocaleString('en-US')} only in LocalCloud` : `${exclusive.toLocaleString('en-US')} only in LocalCloud`;
}

// Every link is Google's own page for the feature; the label says which family of documentation opens.
export function docsLabel(url) {
  const host = new URL(url).hostname;
  return host === 'firebase.google.com' ? 'Firebase docs' : host === 'developers.google.com' ? 'Google docs' : 'Google Cloud docs';
}
