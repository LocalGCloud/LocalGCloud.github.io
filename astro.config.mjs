import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeTableRegions from './src/utils/rehype-table-regions.mjs';
import { loadEnv } from 'vite';
import { resolvePosthogConfig } from './src/utils/posthog-config.mjs';

const posthog = resolvePosthogConfig(loadEnv(process.env.NODE_ENV || 'production', process.cwd(), ''));

const rawAgentPages = [
  'https://local.cloud/ai/agents.md',
  'https://local.cloud/ai/agent-template.md',
  'https://local.cloud/ai/resources.md',
  'https://local.cloud/ai/services.md',
  'https://local.cloud/ai/compatibility.md',
  'https://local.cloud/ai/docs.md',
  'https://local.cloud/llms.txt',
  'https://local.cloud/llms-full.txt',
];

export default defineConfig({
  site: 'https://local.cloud/',
  // Avoid CSS request round trips on the initial mobile navigation.
  build: { inlineStylesheets: 'always' },
  security: {
    csp: {
      scriptDirective: {
        resources: ["'self'", "'strict-dynamic'", "'wasm-unsafe-eval'", ...posthog.origins],
      },
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "worker-src 'self'",
        ["connect-src 'self'", ...posthog.origins].join(' '),
        "img-src 'self' data:",
        "font-src 'self'",
      ],
    },
  },
  integrations: [mdx({ gfm: true, rehypePlugins: [rehypeTableRegions] }), sitemap({ customPages: rawAgentPages })],
  vite: {
    define: { 'import.meta.env.PUBLIC_POSTHOG_HOST': JSON.stringify(posthog.apiHost) },
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
