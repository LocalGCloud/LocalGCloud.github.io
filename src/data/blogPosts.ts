import { blogDemoPages } from './agenticContent';
import { authoredBlogMetadata, getBlogMetadata } from './blogPresentation';

// Shared by the blog index and RSS so titles, summaries and dates stay together.
export const blogPosts = blogDemoPages.map((page) => ({
  slug: page.slug, path: page.path, title: page.h1, description: page.description,
  ...getBlogMetadata(page),
}));
const openSource = authoredBlogMetadata['localcloud-for-open-source'];
const mcp = authoredBlogMetadata['localcloud-mcp-agent-cloud'];
blogPosts.push({
  slug: 'localcloud-mcp-agent-cloud', path: '/blog/localcloud-mcp-agent-cloud/',
  title: 'A local cloud environment for coding agents',
  description: 'Connect LocalCloud MCP to your coding agent, then test Cloud Storage, Pub/Sub, and BigQuery locally with standard Google Cloud SDKs.',
  topic: mcp.topic, minutes: mcp.minutes, date: mcp.publishedAt, dateLabel: 'Published',
});
blogPosts.push({
  slug: 'localcloud-for-open-source', path: '/blog/localcloud-for-open-source/',
  title: 'Bring No-Cost Cloud Integration Testing Into Your Repository: Low Setup, Easy Contributions',
  description: 'Run Google Cloud tests locally with zero cloud-resource costs and an easier contribution workflow. Free for open-source development and CI under the Free for open-source projects policy.',
  topic: openSource.topic, minutes: openSource.minutes, date: openSource.publishedAt, dateLabel: 'Published',
});
