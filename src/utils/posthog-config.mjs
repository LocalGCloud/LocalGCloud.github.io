// Resolve one analytics destination for SDK loading, event delivery and CSP.
export function resolvePosthogConfig(env = {}) {
  const target = env.SITE_DEPLOYMENT_TARGET?.trim() || 'cloudflare';
  if (!['cloudflare', 'static'].includes(target)) {
    throw new Error('SITE_DEPLOYMENT_TARGET must be cloudflare or static');
  }
  const raw = env.PUBLIC_POSTHOG_HOST?.trim() ||
    (target === 'cloudflare' ? '/ingest' : 'https://us.i.posthog.com');
  let apiHost;
  if (raw.startsWith('/')) {
    if (!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/*$/.test(raw)) {
      throw new Error('PUBLIC_POSTHOG_HOST must be a proxy path such as /ingest or an HTTPS URL');
    }
    apiHost = raw.replace(/\/+$/, '');
  } else {
    let url;
    try { url = new URL(raw); } catch {
      throw new Error('PUBLIC_POSTHOG_HOST must be a proxy path such as /ingest or an HTTPS URL');
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('PUBLIC_POSTHOG_HOST requires HTTPS without credentials, query or fragment');
    }
    apiHost = url.href.replace(/\/+$/, '');
  }
  const assetHost = apiHost.replace('.i.posthog.com', '-assets.i.posthog.com');
  const origins = apiHost.startsWith('/') ? [] :
    [...new Set([new URL(apiHost).origin, new URL(assetHost).origin])];
  return { apiHost, assetHost, origins };
}
