import { cliReleases } from '../../data/trust';
import { productFacts } from '../../data/productFacts';
import { rssFeed } from '../../utils/rss.mjs';

export function GET() {
  const feed = rssFeed({
    title: 'LocalCloud CLI releases',
    description: 'LocalCloud CLI releases, dates, and download links.',
    link: new URL(productFacts.changelogPath, productFacts.siteUrl).href,
    self: new URL('/changelog/rss.xml', productFacts.siteUrl).href,
  }, cliReleases.map((release) => ({
    title: release.title, description: release.summary || release.title,
    link: release.url, publishedAt: release.publishedAt,
  })));
  return new Response(feed, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
