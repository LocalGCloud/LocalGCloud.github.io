import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const rawAgentPages = [
  'https://local.cloud/ai/agents.md',
  'https://local.cloud/ai/AGENTS.md',
  'https://local.cloud/ai/resources.md',
  'https://local.cloud/ai/services.md',
  'https://local.cloud/ai/compatibility.md',
  'https://local.cloud/ai/docs.md',
  'https://local.cloud/llms.txt',
  'https://local.cloud/llms-full.txt',
];

export default defineConfig({
  site: 'https://local.cloud/',
  integrations: [mdx(), sitemap({ customPages: rawAgentPages })],
  vite: {
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
