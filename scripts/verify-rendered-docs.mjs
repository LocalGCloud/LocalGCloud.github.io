import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../src/pages/docs/bigquery-feature-comparison.mdx', import.meta.url);
const renderedUrl = new URL('../dist/docs/bigquery-feature-comparison/index.html', import.meta.url);
const errors = [];

const [source, rendered] = await Promise.all([
  readFile(sourceUrl, 'utf8'),
  readFile(renderedUrl, 'utf8'),
]);

const proseStart = rendered.indexOf('<div class="prose-site">');
const proseEnd = rendered.indexOf('<footer class="docs-article__meta"', proseStart);
const renderedArticle = proseStart >= 0 && proseEnd > proseStart
  ? rendered.slice(proseStart, proseEnd)
  : '';
const countMatches = (value, pattern) => [...value.matchAll(pattern)].length;
const sourceTableCount = countMatches(source, /^\s*\|(?:\s*:?-+:?\s*\|){2,}\s*$/gm);
const renderedTableCount = countMatches(renderedArticle, /<table(?:\s|>)/g);
const renderedHeadCount = countMatches(renderedArticle, /<thead(?:\s|>)/g);
const renderedWrapperCount = countMatches(renderedArticle, /class="[^"]*\bdocs-table-scroll\b[^"]*"/g);
const renderedHeaderCellCount = countMatches(renderedArticle, /<th(?:\s|>)/g);

if (!renderedArticle) {
  errors.push('comparison article could not be located in rendered output');
}
if (sourceTableCount === 0) {
  errors.push('comparison source does not contain any Markdown tables');
}
if (renderedTableCount !== sourceTableCount) {
  errors.push(`comparison rendered ${renderedTableCount} tables; expected ${sourceTableCount}`);
}
if (renderedHeadCount !== renderedTableCount) {
  errors.push(`comparison rendered ${renderedHeadCount} table heads for ${renderedTableCount} tables`);
}
if (renderedWrapperCount !== renderedTableCount) {
  errors.push(`comparison rendered ${renderedWrapperCount} accessible table regions for ${renderedTableCount} tables`);
}
if (renderedHeaderCellCount === 0) {
  errors.push('comparison rendered no table header cells');
}
if (/<p(?:\s[^>]*)?>\s*\|\s*(?:Feature|Category)\s*\|/i.test(renderedArticle)) {
  errors.push('comparison still contains a raw pipe-delimited table paragraph');
}

if (errors.length > 0) {
  console.error('Rendered documentation verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Rendered documentation verification passed for ${renderedTableCount} comparison tables.`);
}
