import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

const REVALIDATION_SCOPES = {
  all: {
    tags: [
      'personas',
      'brands',
      'product-formats',
      'filter-types',
      'products',
      'product-skin-scores',
      'persona-products',
      'persona-pages',
      'overall-sunscreens',
      'product-ingredients',
      'product-evaluations'
    ],
    paths: ['/', '/sunscreens', '/sitemap.xml']
  },
  listings: {
    tags: [
      'personas',
      'brands',
      'product-formats',
      'filter-types',
      'products',
      'product-skin-scores',
      'persona-products',
      'persona-pages',
      'overall-sunscreens'
    ],
    paths: ['/sunscreens', '/sitemap.xml']
  },
  sitemap: {
    tags: ['personas', 'brands', 'product-formats', 'filter-types', 'products', 'product-skin-scores'],
    paths: ['/sitemap.xml']
  },
  products: {
    tags: ['products', 'overall-sunscreens', 'product-ingredients', 'product-evaluations', 'product-skin-scores'],
    paths: ['/sunscreens', '/sitemap.xml']
  },
  personas: {
    tags: ['personas', 'persona-products', 'persona-pages', 'product-skin-scores'],
    paths: ['/sunscreens', '/sitemap.xml']
  },
  lookups: {
    tags: ['brands', 'product-formats', 'filter-types', 'products', 'overall-sunscreens', 'persona-pages'],
    paths: ['/sunscreens', '/sitemap.xml']
  }
};

function getConfiguredSecret() {
  return (
    process.env.REVALIDATE_SECRET ||
    process.env.REVALIDATION_SECRET ||
    process.env.VERCEL_REVALIDATE_SECRET ||
    ''
  ).trim();
}

function isAuthorized(request, bodySecret = '') {
  const configuredSecret = getConfiguredSecret();

  if (!configuredSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerSecret = (request.headers.get('x-revalidate-secret') || '').trim();
  const urlSecret = (new URL(request.url).searchParams.get('secret') || '').trim();
  const normalizedBodySecret = String(bodySecret || '').trim();

  return [bearerToken, headerSecret, urlSecret, normalizedBodySecret].some(
    (candidate) => candidate && candidate === configuredSecret
  );
}

function uniqueValues(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

async function handleRevalidation(request, payload = {}) {
  if (!isAuthorized(request, payload.secret)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedScope = String(payload.scope || url.searchParams.get('scope') || 'all').trim();
  const selectedScope = REVALIDATION_SCOPES[requestedScope] || REVALIDATION_SCOPES.all;
  const requestedTags = uniqueValues(payload.tags);
  const requestedPaths = uniqueValues(payload.paths);
  const tags = uniqueValues([...selectedScope.tags, ...requestedTags]);
  const paths = uniqueValues([...selectedScope.paths, ...requestedPaths]);

  for (const tag of tags) {
    revalidateTag(tag);
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return Response.json({
    ok: true,
    scope: REVALIDATION_SCOPES[requestedScope] ? requestedScope : 'all',
    revalidated: {
      tags,
      paths
    }
  });
}

export async function POST(request) {
  let payload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  return handleRevalidation(request, payload);
}

export async function GET(request) {
  return handleRevalidation(request, {});
}
