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

const INSTALL_SCRIPT = '/install.sh';
const CAPTURE_URL = `https://${API_HOST}/i/v0/e/`;
const SITE_HOSTS = ['local.cloud', 'www.local.cloud'];

// The page that linked the script, as a local.cloud path without query or fragment.
// curl and wget send no Referer, and other sites' paths are not recorded.
function referrerPath(request) {
  try {
    const referrer = new URL(request.headers.get('Referer'));
    const sameSite = SITE_HOSTS.includes(referrer.hostname) || referrer.hostname === new URL(request.url).hostname;
    return sameSite ? referrer.pathname.slice(0, 200) : null;
  } catch {
    return null;
  }
}

function userAgentFamily(request) {
  const agent = request.headers.get('User-Agent') || '';
  if (/^curl\//i.test(agent)) return 'curl';
  if (/^wget2?\//i.test(agent)) return 'wget';
  return 'other';
}

// One anonymous event per install-script download: a random distinct ID, no person profile,
// no GeoIP lookup and no client IP (the request is new, so no client header reaches PostHog).
function installScriptEvent(request, apiKey) {
  return {
    api_key: apiKey,
    event: 'install_script_fetched',
    distinct_id: crypto.randomUUID(),
    properties: {
      $process_person_profile: false,
      $geoip_disable: true,
      referrer_path: referrerPath(request),
      ua_family: userAgentFamily(request),
      country: request.cf?.country ?? null,
    },
  };
}

// Counts successful GETs of /install.sh after the response is ready. The event is sent through
// ctx.waitUntil, so it never delays or changes the response, and every failure is ignored.
function trackInstallScript(request, response, env, ctx, sendUpstream) {
  try {
    if (request.method !== 'GET' || response.status !== 200 || !env?.POSTHOG_PROJECT_KEY || typeof ctx?.waitUntil !== 'function') return;
    if (new URL(request.url).pathname !== INSTALL_SCRIPT) return;
    const capture = new Request(CAPTURE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installScriptEvent(request, env.POSTHOG_PROJECT_KEY)),
    });
    ctx.waitUntil(Promise.resolve()
      .then(() => sendUpstream(capture, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }))
      .then((received) => received?.body?.cancel())
      .catch(() => {}));
  } catch {
    // Analytics never affects the download.
  }
}

// The injectable transport lets tests verify forwarding without sending real events.
export async function handleRequest(request, env, sendUpstream = fetch, ctx = undefined) {
  const url = new URL(request.url);
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) {
    const response = await serveSite(request, env);
    trackInstallScript(request, response, env, ctx, sendUpstream);
    return response;
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
  fetch(request, env, ctx) {
    return handleRequest(request, env, fetch, ctx);
  },
};
