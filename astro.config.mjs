import { defineConfig } from 'astro/config';
import { execFileSync } from 'node:child_process';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeTableRegions from './src/utils/rehype-table-regions.mjs';
import { neutralPaperTheme } from './src/utils/code-theme.mjs';
import { loadEnv } from 'vite';
import { resolvePosthogConfig } from './src/utils/posthog-config.mjs';
import { resolveCloudflareAnalyticsConfig } from './src/utils/cloudflare-analytics-config.mjs';
import { lastModifiedForUrl } from './src/utils/page-dates.mjs';

import { renderMarkdownTwin } from './src/utils/render-markdown-twin.mjs';
import { twinSourcePath } from './src/utils/markdown-twins.mjs';
import agentation from './scripts/agentation-integration.mjs';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const posthog = resolvePosthogConfig(env);
const cloudflareAnalytics = resolveCloudflareAnalyticsConfig(env);
const siteRelease = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

function markdownTwinDevPlugin() {
  return {
    name: 'markdown-twin-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const address = server.httpServer?.address();
        if (!address || typeof address === 'string') return next();
        const origin = `http://127.0.0.1:${address.port}`;
        const url = new URL(req.url, origin);
        const route = twinSourcePath(url.pathname);
        if (!route || !['GET', 'HEAD'].includes(req.method)) return next();
        try {
          // Always render current source in dev; dist may belong to an older build.
          const response = await fetch(new URL(route, origin));
          if (response.ok) {
            const markdown = renderMarkdownTwin(await response.text(), { route, twin: url.pathname, file: route });
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.end(req.method === 'HEAD' ? undefined : markdown);
          }
        } catch (error) {
          server.config.logger.warn(`Markdown twin ${url.pathname}: ${error.message}`);
        }
        next();
      });
    },
  };
}

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
        ["connect-src 'self'", ...posthog.origins, ...cloudflareAnalytics.connectOrigins, 'http://localhost:5380'].join(' '),
        "img-src 'self' data:",
        "font-src 'self'",
      ],
    },
  },
  integrations: [
    agentation,
    mdx(),
    sitemap({
      filter: (page) => !unlistedPages.has(page),
      // lastmod: frontmatter updated, blog dates, or the commit history of the page source.
      serialize: (item) => ({ ...item, lastmod: lastModifiedForUrl(item.url) }),
    }),
  ],
  vite: {
    // Keep processed scripts at real URLs so PostHog can retrieve their standard maps.
    // Styles still follow inlineStylesheets: 'always' above.
    build: {
      assetsInlineLimit: 0,
      sourcemap: true,
    },
    environments: {
      client: {
        build: {
          // A source-only change can leave minified JS identical but change its map.
          // Override Astro's client defaults so each release retains a distinct pair.
          rolldownOptions: {
            output: {
              entryFileNames: `_astro/[name].[hash].${siteRelease.slice(0, 12)}.js`,
              chunkFileNames: `_astro/[name].[hash].${siteRelease.slice(0, 12)}.js`,
            },
          },
        },
      },
    },
    define: {
      'import.meta.env.PUBLIC_POSTHOG_HOST': JSON.stringify(posthog.apiHost),
      'import.meta.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN': JSON.stringify(cloudflareAnalytics.token),
      'import.meta.env.PUBLIC_CLOUDFLARE_ANALYTICS_ENDPOINT': JSON.stringify(cloudflareAnalytics.endpoint),
      'import.meta.env.PUBLIC_SITE_RELEASE': JSON.stringify(siteRelease),
    },
    plugins: [tailwindcss(), markdownTwinDevPlugin()],
  },
  markdown: {
    processor: unified({ gfm: true, rehypePlugins: [rehypeTableRegions] }),
    shikiConfig: {
      theme: neutralPaperTheme,
    },
  },
});
