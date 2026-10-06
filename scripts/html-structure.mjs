// A small HTML tag tokenizer for build checks that need element nesting, which regular
// expressions over whole documents cannot see. It tracks open elements, skips comments and
// the raw text of script, style, textarea and title, and closes unclosed elements when an
// ancestor's end tag arrives, which is enough for Astro's well-formed output.
const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const rawTextElements = new Set(['script', 'style', 'textarea', 'title']);

export const classList = (attributes) => {
  const match = attributes.match(/(?:^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  return match ? (match[1] ?? match[2] ?? match[3]).split(/\s+/).filter(Boolean) : [];
};

// Calls visit(name, attributes, ancestors, index) for every start tag, with ancestors as
// [{ name, attributes }] from the outermost open element inward.
export function walkElements(html, visit) {
  const token = /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\/([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  const open = [];
  for (let match; (match = token.exec(html));) {
    const [, closing, opening, attributes = ''] = match;
    if (closing) {
      const name = closing.toLowerCase();
      const at = open.findLastIndex((element) => element.name === name);
      if (at >= 0) open.length = at;
    } else if (opening) {
      const name = opening.toLowerCase();
      visit(name, attributes, open, match.index);
      if (rawTextElements.has(name)) {
        const end = new RegExp(`</${name}\\s*>`, 'gi');
        end.lastIndex = token.lastIndex;
        token.lastIndex = end.exec(html) ? end.lastIndex : html.length;
      } else if (!voidElements.has(name) && !/\/\s*$/.test(attributes)) {
        open.push({ name, attributes });
      }
    }
  }
}

// Every <h1> that carries, or sits inside an element that carries, the given class.
export function headingsWithinClass(html, className) {
  const found = [];
  walkElements(html, (name, attributes, ancestors, index) => {
    if (name !== 'h1') return;
    const holder = [...ancestors, { name, attributes }].find((element) => classList(element.attributes).includes(className));
    if (holder) found.push({ index, holder: `<${holder.name}${holder.attributes}>` });
  });
  return found;
}
