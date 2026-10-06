const CANONICAL_HOST = 'local.cloud';
const HTML = /^text\/html\b/i;
const BROTLI_SIDECAR = '.html.br';
const ERROR_PAGE = '/404';

function encodingQualities(value) {
  const qualities = new Map();
  for (const entry of (value || '').split(',')) {
    const [name, ...parameters] = entry.trim().toLowerCase().split(';');
    const quality = parameters.map((part) => part.trim()).find((part) => part.startsWith('q='));
    const raw = quality?.slice(2) ?? '1';
    const q = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw) ? Number(raw) : 0;
    qualities.set(name, q);
  }
  return qualities;
}

// Cloudflare may normalize Accept-Encoding before the Worker; cf.clientAcceptEncoding keeps the original.
function acceptedEncodings(request) {
  const qualities = encodingQualities(request.cf?.clientAcceptEncoding ?? request.headers.get('Accept-Encoding'));
  const quality = (name) => qualities.get(name) ?? qualities.get('*') ?? 0;
  return { br: quality('br'), gzip: quality('gzip') };
}

function appendVary(headers, name) {
  const values = (headers.get('Vary') || '').split(',').map((value) => value.trim().toLowerCase());
  if (!values.includes(name.toLowerCase()) && !values.includes('*')) headers.append('Vary', name);
}

function weakenEtag(headers) {
  const etag = headers.get('ETag');
  if (etag && !etag.startsWith('W/')) headers.set('ETag', `W/${etag}`);
}

// Edge HTML rewrites (beacon injection, obfuscation) would break the hash-based CSP.
function preventEdgeRewrites(headers) {
  const cacheControl = headers.get('Cache-Control');
  if (!cacheControl) headers.set('Cache-Control', 'no-transform');
  else if (!/\bno-transform\b/i.test(cacheControl)) headers.set('Cache-Control', `${cacheControl}, no-transform`);
}

function sidecarPath(url, status) {
  if (status === 404) return `${ERROR_PAGE}${BROTLI_SIDECAR}`;
  return url.pathname.endsWith('/') ? `${url.pathname}index${BROTLI_SIDECAR}` : null;
}

async function fetchSidecar(request, env, path) {
  if (!env?.ASSETS || !path) return null;
  // A clean request: the HTML response already answered conditional and range headers.
  const sidecar = await env.ASSETS.fetch(new Request(new URL(path, request.url), { method: request.method }));
  return sidecar.status === 200 ? sidecar : null;
}

// Serve HTML with build-time Brotli when accepted, gzip as the streaming fallback, then identity.
export async function compressHtml(request, response, env) {
  if (!['GET', 'HEAD'].includes(request.method) || ![200, 404].includes(response.status) ||
      !HTML.test(response.headers.get('Content-Type') || '') ||
      response.headers.has('Content-Encoding') || response.headers.has('Content-Range')) return response;

  const headers = new Headers(response.headers);
  appendVary(headers, 'Accept-Encoding');
  preventEdgeRewrites(headers);
  const init = { status: response.status, statusText: response.statusText, headers };
  const accepted = acceptedEncodings(request);

  if (accepted.br > 0 && accepted.br >= accepted.gzip) {
    const sidecar = await fetchSidecar(request, env, sidecarPath(new URL(request.url), response.status));
    if (sidecar) {
      await response.body?.cancel();
      headers.set('Content-Encoding', 'br');
      weakenEtag(headers);
      const length = sidecar.headers.get('Content-Length');
      if (length) headers.set('Content-Length', length);
      else headers.delete('Content-Length');
      // The sidecar is already encoded; Workers must not encode it again.
      return new Response(request.method === 'HEAD' ? null : sidecar.body, { ...init, encodeBody: 'manual' });
    }
  }
  if (accepted.gzip <= 0) return new Response(response.body, init);

  headers.set('Content-Encoding', 'gzip');
  headers.delete('Content-Length');
  weakenEtag(headers);
  const body = response.body ? response.body.pipeThrough(new CompressionStream('gzip')) : null;
  return new Response(body, { ...init, encodeBody: 'manual' }); // Already encoded; do not encode twice.
}

function withHeaders(response, changes, status = response.status) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(changes)) headers.set(name, value);
  return new Response(status === 301 || status === 304 ? null : response.body, { status, statusText: status === response.status ? response.statusText : '', headers });
}

async function errorPage(request, env) {
  const page = await env.ASSETS.fetch(new Request(new URL(ERROR_PAGE, request.url), { method: request.method === 'HEAD' ? 'HEAD' : 'GET' }));
  return withHeaders(page, {}, 404);
}

// Static site responses: permanent redirects, real 404s, host-scoped indexing and compressed HTML.
export async function serveSite(request, env) {
  const url = new URL(request.url);
  let response;
  if (url.pathname.endsWith(BROTLI_SIDECAR)) {
    response = await errorPage(request, env);
  } else {
    response = await env.ASSETS.fetch(request);
    if (url.pathname === ERROR_PAGE && response.status === 200) response = withHeaders(response, {}, 404);
  }
  // Only local.cloud is indexable; workers.dev and preview hosts serve the same pages.
  if (url.hostname !== CANONICAL_HOST) response = withHeaders(response, { 'X-Robots-Tag': 'noindex' });

  // Trailing-slash redirects from the asset layer are temporary (307); the URL change is permanent.
  if (response.status === 307 && response.headers.has('Location')) {
    return withHeaders(response, {
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
    }, 301);
  }
  if (response.status === 304 && (url.pathname.endsWith('/') || url.pathname === ERROR_PAGE)) {
    const headers = new Headers(response.headers);
    appendVary(headers, 'Accept-Encoding');
    weakenEtag(headers);
    return new Response(null, { status: 304, headers });
  }
  return compressHtml(request, response, env);
}
