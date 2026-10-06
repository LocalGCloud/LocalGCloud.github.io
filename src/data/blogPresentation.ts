import type { AgenticContentPage } from './agenticContent';
import { agentPromptLibrary } from './agenticFacts';

import authoredBlogPosts from './blogMetadata.json';

// Dates and read times for individually authored articles. The JSON is shared with the
// sitemap lastmod helper (src/utils/page-dates.mjs); add updatedAt when a post materially changes.
export const authoredBlogMetadata: Record<
  keyof typeof authoredBlogPosts,
  { publishedAt: string; updatedAt?: string; minutes: number; topic: string }
> = authoredBlogPosts;

const blogTopics: Record<string, string> = {
  'claude-code-local-gcp-sandbox': 'AI agents',
  'bigquery-locally-agent-written-pipelines': 'BigQuery',
};

export function getBlogMetadata(page: AgenticContentPage) {
  const authored = authoredBlogMetadata[page.slug as keyof typeof authoredBlogMetadata];
  const text = [
    page.h1, page.deck, ...page.quickFacts,
    ...page.sections.flatMap((section) => [section.title, section.body, ...(section.items ?? [])]),
    ...page.promptIds.map((id) => agentPromptLibrary.find((prompt) => prompt.id === id)?.prompt ?? ''),
    ...(page.snippets ?? []).map((snippet) => snippet.code),
    ...(page.table?.rows.flat() ?? []),
    ...page.limitations,
    ...page.internalLinks.flatMap((link) => [link.label, link.note]),
    ...(page.sources ?? []).flatMap((source) => [source.label, source.note]),
  ].join(' ').trim();
  return {
    topic: authored?.topic ?? blogTopics[page.slug] ?? page.eyebrow,
    minutes: authored?.minutes ?? Math.max(1, Math.ceil(text.split(/\s+/).length / 200)),
    date: authored?.publishedAt ?? page.reviewedAt,
    dateLabel: authored ? 'Published' : 'Reviewed',
  };
}

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
}
