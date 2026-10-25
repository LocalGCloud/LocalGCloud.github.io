const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]);

export function rssFeed({ title, description, link, self }, items) {
  const entries = items.map((item) => {
    const timestamp = item.publishedAt ? Date.parse(item.publishedAt) : 0;
    if (!Number.isFinite(timestamp)) throw new Error(`Invalid RSS publication date: ${item.publishedAt}`);
    return { ...item, timestamp };
  }).sort((a, b) => b.timestamp - a.timestamp);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${escapeXml(title)}</title><description>${escapeXml(description)}</description>
<link>${escapeXml(link)}</link><language>en</language>
<atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />
${entries.map((item) => `<item><title>${escapeXml(item.title)}</title>
<link>${escapeXml(item.link)}</link><guid isPermaLink="true">${escapeXml(item.link)}</guid>
<description>${escapeXml(item.description)}</description>
${item.publishedAt ? `<pubDate>${new Date(item.timestamp).toUTCString()}</pubDate>` : ''}</item>`).join('\n')}
</channel></rss>\n`;
}
