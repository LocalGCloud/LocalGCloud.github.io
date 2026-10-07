// BaseLayout, generation and the Worker share one Markdown URL contract.
// Curated /ai/*.md documents remain independent; /ai/index.md mirrors its HTML index.
const PAGE = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/;
const COLLECTION = /\/(?:docs|services|compare|blog|ai)\/$/;
const reserved = (path) => /^\/(?:ingest|_astro|pagefind|icons|illustrations)(?:\/|$)/.test(path)
  || /^\/ai\/.+/.test(path) || path === '/404/';

export function markdownTwinPath(pathname) {
  if (!PAGE.test(pathname) || reserved(pathname)) return null;
  if (pathname === '/') return '/index.md';
  return COLLECTION.test(pathname) ? pathname + 'index.md' : pathname.slice(0, -1) + '.md';
}

export function twinSourcePath(pathname) {
  if (typeof pathname !== 'string' || !pathname.endsWith('.md')) return null;
  const source = pathname === '/index.md' ? '/'
    : pathname.endsWith('/index.md') ? pathname.slice(0, -8)
    : pathname.slice(0, -3) + '/';
  return markdownTwinPath(source) === pathname ? source : null;
}
