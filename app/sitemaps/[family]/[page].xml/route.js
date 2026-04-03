import { notFound } from 'next/navigation';
import { fetchSitemapShard } from '../../../../src/lib/site-data';

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

function buildUrlSetXml(entries) {
  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${escapeXml(formatIsoDate(entry.lastModified))}</lastmod>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export async function GET(_request, { params }) {
  const resolvedParams = await params;
  const shard = await fetchSitemapShard(resolvedParams?.family, resolvedParams?.page);

  if (!shard) {
    notFound();
  }

  const xml = buildUrlSetXml(shard.entries);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
