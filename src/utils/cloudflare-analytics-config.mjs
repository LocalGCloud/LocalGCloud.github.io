// This is the public Web Analytics site identifier, not an API credential.
const localCloudToken = '7e7e813311ff44d5817eae3f1070a129';

export function resolveCloudflareAnalyticsConfig(env = {}) {
  const target = env.SITE_DEPLOYMENT_TARGET?.trim() || 'cloudflare';
  if (!['cloudflare', 'static'].includes(target)) {
    throw new Error('SITE_DEPLOYMENT_TARGET must be cloudflare or static');
  }
  const token = (env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN ??
    (target === 'cloudflare' ? localCloudToken : '')).trim();
  if (token && !/^[a-f0-9]{32}$/i.test(token)) {
    throw new Error('PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN must be a 32-character hexadecimal site token or empty');
  }
  // local.cloud's token belongs to the Cloudflare zone, and Cloudflare accepts zone tokens only
  // on the proxied hostname's /cdn-cgi/rum; the external collector answers them with 404.
  // A separately registered token on static hosting uses the external collector.
  const external = target === 'static';
  const endpoint = external ? 'https://cloudflareinsights.com/cdn-cgi/rum' : '/cdn-cgi/rum';
  return {
    token,
    endpoint,
    scriptOrigins: token ? ['https://static.cloudflareinsights.com'] : [],
    connectOrigins: token && external ? ['https://cloudflareinsights.com'] : [],
  };
}
