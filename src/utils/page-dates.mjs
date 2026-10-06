// Last-modified dates for built pages, shared by the sitemap lastmod (astro.config.mjs),
// docs TechArticle dateModified (DocsLayout) and blog article:modified_time (BlogLayout).
//
// Source order: a docs page's frontmatter `updated` > a blog post's updatedAt/publishedAt
// (src/data/blogMetadata.json) > the last git commit that touched the page source or the
// data module and template its content comes from. CI checks out the full history
// (fetch-depth: 0) so git dates are real; without git, file modification times stand in.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const root = process.cwd();
const pagesDirectory = join(root, 'src', 'pages');

// Template-driven pages: the page file is a thin shell around shared data and templates.
const agenticPage = ['src/data/agenticContent.ts', 'src/components/AgenticContentPage.astro'];
const agenticIndex = ['src/data/agenticContent.ts', 'src/components/AgenticIndexPage.astro'];
const contentSources = {
  'src/pages/index.astro': ['src/components/HomepageVariationFieldManual.astro', 'src/data/homepageFaq.ts'],
  'src/pages/services/[slug].astro': ['src/data/serviceGuides.ts', 'src/data/serviceEditorial.ts', 'src/data/agenticContent.ts'],
  'src/pages/services/index.astro': ['src/data/serviceEditorial.ts'],
  'src/pages/agents/[slug].astro': agenticPage,
  'src/pages/blog/[slug].astro': agenticPage,
  'src/pages/compare/[slug].astro': agenticPage,
  'src/pages/glossary/[slug].astro': agenticPage,
  'src/pages/workflows/[slug].astro': agenticPage,
  'src/pages/agents/index.astro': agenticIndex,
  'src/pages/compare/index.astro': [...agenticIndex, 'src/data/alternatives.ts'],
  'src/pages/glossary/index.astro': agenticIndex,
  'src/pages/workflows/index.astro': agenticIndex,
  'src/pages/ai/index.astro': ['src/data/agenticFacts.ts', 'src/data/agenticMarkdown.ts'],
  'src/pages/compatibility.astro': ['src/data/serviceEditorial.ts'],
  'src/pages/changelog.astro': ['src/data/releases.json'],
  'src/pages/license.astro': ['src/data/legal/public-preview-license.txt'],
  'src/pages/pricing.astro': ['src/components/PricingWorkbench.astro'],
};

const toPosix = (path) => path.split(sep).join('/');
const pageExtensions = /\.(?:astro|mdx|md)$/;

// Route patterns for every page file (endpoints such as agents.md.ts are not pages).
// Static routes win over dynamic ones, as in Astro's routing priority.
let routeTable;
const routes = () => {
  if (routeTable) return routeTable;
  const files = readdirSync(pagesDirectory, { recursive: true })
    .map(toPosix)
    .filter((file) => pageExtensions.test(file) && !file.split('/').some((part) => part.startsWith('_')));
  routeTable = files
    .map((file) => {
      const segments = file.replace(pageExtensions, '').split('/');
      if (segments.at(-1) === 'index') segments.pop();
      const dynamicSegments = segments.filter((segment) => /^\[.+\]$/.test(segment)).length;
      const pattern = segments
        .map((segment) => (/^\[\.\.\..+\]$/.test(segment) ? '.+' : /^\[.+\]$/.test(segment) ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('/');
      return { source: `src/pages/${file}`, dynamicSegments, test: new RegExp(`^/${pattern}${pattern ? '/' : ''}$`) };
    })
    .sort((left, right) => left.dynamicSegments - right.dynamicSegments);
  return routeTable;
};

/** The page source file that renders a URL path such as /docs/console/. */
export const pageSourceFor = (pathname) => routes().find((route) => route.test.test(pathname))?.source;

const datePattern = /^\d{4}-\d{2}-\d{2}/;
const frontmatterUpdated = (source) => {
  if (!/\.mdx?$/.test(source)) return undefined;
  const frontmatter = readFileSync(join(root, source), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const updated = frontmatter.match(/^updated:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  return updated;
};

let blogPosts;
const blogPostDate = (pathname) => {
  const slug = pathname.match(/^\/blog\/([^/]+)\/$/)?.[1];
  if (!slug) return undefined;
  blogPosts ??= JSON.parse(readFileSync(join(root, 'src/data/blogMetadata.json'), 'utf8'));
  const post = blogPosts[slug];
  return post ? post.updatedAt ?? post.publishedAt : undefined;
};

const gitDates = new Map();
const lastChanged = (files) => {
  const key = files.join('\n');
  if (!gitDates.has(key)) {
    let date;
    try {
      date = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      date = '';
    }
    if (!datePattern.test(date)) {
      // No git history for these files (a tarball build or a new file): use the newest mtime.
      const newest = Math.max(...files.filter((file) => existsSync(join(root, file))).map((file) => statSync(join(root, file)).mtimeMs));
      date = Number.isFinite(newest) ? new Date(newest).toISOString().slice(0, 10) : undefined;
    }
    gitDates.set(key, date);
  }
  return gitDates.get(key);
};

/**
 * The YYYY-MM-DD date a page last changed, or undefined when no page source renders the path.
 * @param {string} pathname a site path with its trailing slash, such as /docs/console/
 */
export const lastModifiedForRoute = (pathname) => {
  const source = pageSourceFor(pathname);
  if (!source) return undefined;
  return frontmatterUpdated(source) ?? blogPostDate(pathname) ?? lastChanged([source, ...(contentSources[source] ?? [])]);
};

/** The same date for an absolute page URL, as the sitemap lists it. */
export const lastModifiedForUrl = (url) => lastModifiedForRoute(new URL(url).pathname);

