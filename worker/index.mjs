import { serveSite } from './static-response.mjs';

const PREFIX = '/ingest';
const API_HOST = 'us.i.posthog.com';
const ASSET_HOST = 'us-assets.i.posthog.com';
const METHODS = ['GET', 'HEAD', 'POST', 'OPTIONS'];
const UPSTREAM_TIMEOUT_MS = 10_000;

// SDK assets live on the asset host; every other path is API traffic.
const upstreamHost = (path) => path.startsWith('/static/') || path.startsWith('/array/') ? ASSET_HOST : API_HOST;

function unavailable() {
  return new Response('Analytics upstream unavailable', {
    status: 502,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

// The injectable transport lets tests verify forwarding without sending real events.
export async function handleRequest(request, env, sendUpstream = fetch) {
  const url = new URL(request.url);
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) {
    return serveSite(request, env);
  }
  if (!METHODS.includes(request.method)) {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: METHODS.join(', '), 'Cache-Control': 'no-store' },
    });
  }

  const path = url.pathname.slice(PREFIX.length) || '/';
  const isStatic = path.startsWith('/static/');
  const host = upstreamHost(path);
  const upstream = new URL(`https://${host}`);
  upstream.pathname = path;
  upstream.search = url.search;

  const headers = new Headers(request.headers);
  for (const name of [
    'cookie', 'authorization', 'proxy-authorization', 'connection', 'keep-alive',
    'transfer-encoding', 'te', 'trailer', 'upgrade', 'forwarded',
    'x-forwarded-for', 'x-real-ip', 'x-forwarded-host', 'x-forwarded-proto',
  ]) headers.delete(name);
  headers.set('Host', host);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) headers.set('X-Forwarded-For', ip);

  try {
    // Copy the request stream, including compressed bodies, without parsing event data.
    const forwarded = new Request(new Request(upstream, request), {
      headers,
      redirect: 'manual',
    });
    const received = await sendUpstream(forwarded, { cache: 'no-store', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    const response = new Response(received.body, received);
    response.headers.delete('Set-Cookie');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    if (!isStatic) response.headers.set('Cache-Control', 'no-store');
    // Publicly cached SDK files may be compressed differently per client.
    else if (!/\baccept-encoding\b|\*/i.test(response.headers.get('Vary') || '')) response.headers.append('Vary', 'Accept-Encoding');

    // Keep redirects on our origin and never forward to an arbitrary destination.
    const location = response.headers.get('Location');
    if (location && response.status >= 300 && response.status < 400) {
      const destination = new URL(location, upstream);
      if (destination.protocol !== 'https:' || destination.port ||
          destination.hostname !== upstreamHost(destination.pathname)) return unavailable();
      response.headers.set('Location', `${PREFIX}${destination.pathname}${destination.search}`);
    }
    return response;
  } catch {
    // Do not retry event submissions or expose event payloads in errors or logs.
    return unavailable();
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
