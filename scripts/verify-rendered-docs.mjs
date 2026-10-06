import { readFile } from 'node:fs/promises';

// The BigQuery feature reference mixes Markdown tables with JSX tables that carry their own
// scroll regions; every one must render with a head and exactly one accessible region.
const sourceUrl = new URL('../src/pages/docs/bigquery-emulator-features.mdx', import.meta.url);
const renderedUrl = new URL('../dist/docs/bigquery-emulator-features/index.html', import.meta.url);
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
const markdownTableCount = countMatches(source, /^\s*\|(?:\s*:?-+:?\s*\|){2,}\s*$/gm);
const sourceTableCount = markdownTableCount + countMatches(source, /<table(?:\s|>)/g);
const renderedTableCount = countMatches(renderedArticle, /<table(?:\s|>)/g);
const renderedHeadCount = countMatches(renderedArticle, /<thead(?:\s|>)/g);
const renderedWrapperCount = countMatches(renderedArticle, /class="[^"]*\bdocs-table-scroll\b[^"]*"/g);
const renderedHeaderCellCount = countMatches(renderedArticle, /<th(?:\s|>)/g);

if (!renderedArticle) {
  errors.push('BigQuery feature reference article could not be located in rendered output');
}
if (markdownTableCount === 0) {
  errors.push('BigQuery feature reference source does not contain any Markdown tables');
}
if (renderedTableCount !== sourceTableCount) {
  errors.push(`BigQuery feature reference rendered ${renderedTableCount} tables; expected ${sourceTableCount}`);
}
if (renderedHeadCount !== renderedTableCount) {
  errors.push(`BigQuery feature reference rendered ${renderedHeadCount} table heads for ${renderedTableCount} tables`);
}
if (renderedWrapperCount !== renderedTableCount) {
  errors.push(`BigQuery feature reference rendered ${renderedWrapperCount} accessible table regions for ${renderedTableCount} tables`);
}
if (renderedHeaderCellCount === 0) {
  errors.push('BigQuery feature reference rendered no table header cells');
}
if (/<p(?:\s[^>]*)?>\s*\|\s*(?:Feature|Category)\s*\|/i.test(renderedArticle)) {
  errors.push('BigQuery feature reference still contains a raw pipe-delimited table paragraph');
}

if (errors.length > 0) {
  console.error('Rendered documentation verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Rendered documentation verification passed for ${renderedTableCount} BigQuery feature reference tables.`);
}
