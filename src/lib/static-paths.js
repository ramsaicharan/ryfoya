import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

// The prebuild step (scripts/generate-sitemaps.mjs) writes every public URL into
// public/sitemaps. Prebuilding reads the same list, so the sitemap and the built
// pages always match.
const SITEMAPS_DIR = path.join(process.cwd(), 'public', 'sitemaps');

let cachedPaths = null;

function readSitemapPaths() {
  if (cachedPaths) {
    return cachedPaths;
  }

  if (!fs.existsSync(SITEMAPS_DIR)) {
    throw new Error('public/sitemaps is missing. Run `npm run sitemap:generate` before building.');
  }

  const paths = new Set();

  for (const family of fs.readdirSync(SITEMAPS_DIR)) {
    const familyDir = path.join(SITEMAPS_DIR, family);

    if (!fs.statSync(familyDir).isDirectory()) {
      continue;
    }

    for (const file of fs.readdirSync(familyDir)) {
      if (!file.endsWith('.xml')) {
        continue;
      }

      const xml = fs.readFileSync(path.join(familyDir, file), 'utf8');

      for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const pathname = new URL(match[1].replace(/&amp;/g, '&')).pathname.replace(/\/+$/, '');
        paths.add(pathname || '/');
      }
    }
  }

  cachedPaths = [...paths];
  return cachedPaths;
}

function segmentsAfter(prefix) {
  return readSitemapPaths()
    .filter((pathname) => pathname.startsWith(prefix))
    .map((pathname) => pathname.slice(prefix.length).split('/').filter(Boolean).map(decodeURIComponent))
    .filter((segments) => segments.length > 0);
}

export function getListingStaticParams() {
  return segmentsAfter('/sunscreens/best/').map((segments) => ({ segments }));
}

export function getProductStaticParams() {
  return segmentsAfter('/sunscreens/')
    .filter((segments) => segments.length === 1 && segments[0] !== 'best')
    .map(([slug]) => ({ slug }));
}
