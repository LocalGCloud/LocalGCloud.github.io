import { blogPosts } from '../data/blogPosts';
import { productFacts } from '../data/productFacts';
import { rssFeed } from '../utils/rss.mjs';

export function GET() {
  const feed = rssFeed({
    title: 'LocalCloud Blog',
    description: 'Guides for local Google Cloud development, testing, and AI agents.',
    link: new URL('/blog/', productFacts.siteUrl).href,
    self: new URL('/rss.xml', productFacts.siteUrl).href,
  }, blogPosts.map((post) => ({
    title: post.title, description: post.description,
    link: new URL(post.path, productFacts.siteUrl).href,
    publishedAt: post.dateLabel === 'Published' ? post.date : undefined,
  })));
  return new Response(feed, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
