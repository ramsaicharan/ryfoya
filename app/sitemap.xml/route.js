import { fetchSitemapIndexEntries } from '../../src/lib/site-data';

export const dynamic = 'force-dynamic';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatIsoDate(value) {
  return new Date(value || Date.now()).toISOString();
}

function buildSitemapIndexXml(entries) {
  const body = entries
    .map(
      (entry) => `  <sitemap>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${escapeXml(formatIsoDate(entry.lastModified))}</lastmod>
  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

export async function GET() {
  const entries = await fetchSitemapIndexEntries().catch(() => []);
  const xml = buildSitemapIndexXml(entries);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
