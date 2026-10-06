import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeTableRegions from './src/utils/rehype-table-regions.mjs';
import { loadEnv } from 'vite';
import { resolvePosthogConfig } from './src/utils/posthog-config.mjs';
import { resolveCloudflareAnalyticsConfig } from './src/utils/cloudflare-analytics-config.mjs';
import { lastModifiedForUrl } from './src/utils/page-dates.mjs';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const posthog = resolvePosthogConfig(env);
const cloudflareAnalytics = resolveCloudflareAnalyticsConfig(env);

// Noindex pages stay out of the sitemap. The raw Markdown and text routes are not listed
// either: llms.txt links them, and they would compete with their HTML pages.
const unlistedPages = new Set(['https://local.cloud/immersive-demo/', 'https://local.cloud/brand/icons/']);

export default defineConfig({
  site: 'https://local.cloud/',
  compressHTML: true,
  // Avoid CSS request round trips on the initial mobile navigation.
  build: { inlineStylesheets: 'always' },
  security: {
    csp: {
      scriptDirective: {
        resources: ["'self'", "'strict-dynamic'", "'wasm-unsafe-eval'", ...posthog.origins, ...cloudflareAnalytics.scriptOrigins],
      },
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "worker-src 'self'",
        ["connect-src 'self'", ...posthog.origins, ...cloudflareAnalytics.connectOrigins].join(' '),
        "img-src 'self' data:",
        "font-src 'self'",
      ],
    },
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !unlistedPages.has(page),
      // lastmod: frontmatter updated, blog dates, or the commit history of the page source.
      serialize: (item) => ({ ...item, lastmod: lastModifiedForUrl(item.url) }),
    }),
  ],
  vite: {
    define: {
      'import.meta.env.PUBLIC_POSTHOG_HOST': JSON.stringify(posthog.apiHost),
      'import.meta.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN': JSON.stringify(cloudflareAnalytics.token),
      'import.meta.env.PUBLIC_CLOUDFLARE_ANALYTICS_ENDPOINT': JSON.stringify(cloudflareAnalytics.endpoint),
    },
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({ gfm: true, rehypePlugins: [rehypeTableRegions] }),
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
