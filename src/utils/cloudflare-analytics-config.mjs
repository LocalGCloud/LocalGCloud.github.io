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
  // Cloudflare zone tokens collect on the proxied hostname. A separately
  // registered token supports the external endpoint on static hosting.
  const endpoint = target === 'cloudflare' ? '/cdn-cgi/rum' : 'https://cloudflareinsights.com/cdn-cgi/rum';
  return {
    token,
    endpoint,
    scriptOrigins: token ? ['https://static.cloudflareinsights.com'] : [],
    connectOrigins: token && target === 'static' ? ['https://cloudflareinsights.com'] : [],
  };
}
