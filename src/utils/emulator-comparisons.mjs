export const comparisonPreviewSize = 10;
export const comparisonStates = {
  available: 'Available', limited: 'Scoped', unavailable: 'Not available',
  unknown: 'Not assessed', na: 'Not applicable', 'no-effect': 'Accepted, no effect',
};

// Preserve the evidence wording in downloads; use the site's vocabulary in the UI.
export function presentComparisonNotes(text) {
  return text.replace(/\bpartial\b(?! (?:index(?:es)?|updates?|responses?)\b)/gi, 'limited')
    .replace(/\bpartially\b/gi, 'with limits')
    .replace(/source qualification/gi, 'source-name resolution')
    .replace(/qualification/gi, 'verification')
    .replace(/semantic-compatibility:/gi, 'Behavior boundary: ')
    .replace(/\b[0-9a-f]{40}\b/gi, value => value.slice(0, 12));
}

export function selectComparisonRows(rows, { mode = 'advantages', query = '', area = '' } = {}) {
  const term = query.toLowerCase().trim();
  return rows.filter(row => (!area || row.area === area)
    && (!term || [row.name, row.id, row.area, row.notes].join(' ').toLowerCase().includes(term))
    && (mode === 'all' || row.local === 'available'
      && (mode === 'broader' ? row.other === 'limited' : ['unavailable', 'no-effect'].includes(row.other))));
}
