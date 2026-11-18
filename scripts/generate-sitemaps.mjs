import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const SITEMAPS_DIR = path.join(PUBLIC_DIR, 'sitemaps');
const SITEMAP_INDEX_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const SUPABASE_BATCH_SIZE = 1000;
const SITEMAP_CHUNK_SIZE = 10000;
const SITEMAP_FAMILIES = ['static', 'products', 'skin-context', 'brands', 'formats', 'filters', 'combinations'];
const DEFAULT_SITE_URL = 'https://ryfoya.com';

await loadLocalEnv();

const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function normalizeSiteUrl(value) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');

  if (!normalized) {
    return DEFAULT_SITE_URL;
  }

  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}

async function loadLocalEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  let envText = '';

  try {
    envText = await fs.readFile(envPath, 'utf8');
  } catch {
    return;
  }

  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function fetchAllSupabaseRows(table, select, options = {}) {
  const rows = [];
  const orderBy = Array.isArray(options.orderBy) ? options.orderBy : [];

  for (let from = 0; ; from += SUPABASE_BATCH_SIZE) {
    const to = from + SUPABASE_BATCH_SIZE - 1;
    let query = supabase.from(table).select(select);

    for (const order of orderBy) {
      if (order?.column) {
        query = query.order(order.column, { ascending: order.ascending !== false });
      }
    }

    const { data, error } = await query.range(from, to);

    if (error) {
      throw new Error(`Could not load ${table}: ${error.message}`);
    }

    const batch = data || [];
    rows.push(...batch);

    if (batch.length < SUPABASE_BATCH_SIZE) {
      break;
    }
  }

  return rows;
}

function normalizeLookupValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function formatLookupLabel(value, fallback = '') {
  return normalizeLookupValue(value) || fallback;
}

function slugifyLookupValue(value) {
  const normalized = normalizeLookupValue(value).toLowerCase();
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function normalizeLookupRow(row) {
  return {
    id: row.id,
    slug: String(row.slug || '').trim(),
    label: formatLookupLabel(row.label, row.source_value),
    sourceValue: String(row.source_value || '').trim(),
    createdAt: row.created_at || null
  };
}

function buildFallbackLookupRows(values) {
  const seenKeys = new Set();
  const seenSlugs = new Set();
  const rows = [];

  for (const rawValue of values || []) {
    const sourceValue = normalizeLookupValue(rawValue);

    if (!sourceValue) {
      continue;
    }

    const normalizedKey = sourceValue.toLowerCase();
    if (seenKeys.has(normalizedKey)) {
      continue;
    }

    seenKeys.add(normalizedKey);

    const baseSlug = slugifyLookupValue(sourceValue);
    let slug = baseSlug;
    let suffix = 2;

    while (seenSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    seenSlugs.add(slug);
    rows.push({ id: null, slug, label: sourceValue, sourceValue, createdAt: null });
  }

  return rows.sort((left, right) => left.label.localeCompare(right.label));
}

async function fetchLookupFallbackRows() {
  const rows = await fetchAllSupabaseRows(
    'products',
    'id, brand_name, product_format, filter_type, created_at',
    { orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }] }
  );

  return {
    brands: buildFallbackLookupRows(rows.map((row) => row.brand_name)),
    productFormats: buildFallbackLookupRows(rows.map((row) => row.product_format)),
    filterTypes: buildFallbackLookupRows(rows.map((row) => row.filter_type))
  };
}

async function fetchAllBrands() {
  const rows = await fetchAllSupabaseRows(
    'brands',
    'id, slug, label, source_value, created_at',
    { orderBy: [{ column: 'label', ascending: true }, { column: 'id', ascending: true }] }
  );

  if (rows.length > 0) {
    return rows.map(normalizeLookupRow);
  }

  return (await fetchLookupFallbackRows()).brands;
}

async function fetchAllProductFormats() {
  const rows = await fetchAllSupabaseRows(
    'product_formats',
    'id, slug, label, source_value, created_at',
    { orderBy: [{ column: 'label', ascending: true }, { column: 'id', ascending: true }] }
  );

  if (rows.length > 0) {
    return rows.map(normalizeLookupRow);
  }

  return (await fetchLookupFallbackRows()).productFormats;
}

async function fetchAllFilterTypes() {
  const rows = await fetchAllSupabaseRows(
    'filter_types',
    'id, slug, label, source_value, created_at',
    { orderBy: [{ column: 'label', ascending: true }, { column: 'id', ascending: true }] }
  );

  if (rows.length > 0) {
    return rows.map(normalizeLookupRow);
  }

  return (await fetchLookupFallbackRows()).filterTypes;
}

function buildBrandPath(brandSlug) {
  return `/sunscreens/best/brand/${brandSlug}`;
}

function buildFormatPath(productFormatSlug) {
  return `/sunscreens/best/format/${productFormatSlug}`;
}

function buildFilterTypePath(filterTypeSlug) {
  return `/sunscreens/best/filter/${filterTypeSlug}`;
}

function buildListingPath({ skinContextRouteSlug = '', brandSlug = '', productFormatSlug = '', filterTypeSlug = '' }) {
  const skinContext = String(skinContextRouteSlug || '').trim();
  const brand = String(brandSlug || '').trim();
  const productFormat = String(productFormatSlug || '').trim();
  const filterType = String(filterTypeSlug || '').trim();

  if (filterType) {
    let listingPath = buildFilterTypePath(filterType);
    if (brand) {
      listingPath += `/brand/${brand}`;
    }
    if (productFormat) {
      listingPath += `/format/${productFormat}`;
    }
    if (skinContext) {
      listingPath += `/${skinContext}`;
    }
    return listingPath;
  }

  if (brand) {
    let listingPath = buildBrandPath(brand);
    if (productFormat) {
      listingPath += `/format/${productFormat}`;
    }
    if (skinContext) {
      listingPath += `/${skinContext}`;
    }
    return listingPath;
  }

  if (productFormat) {
    let listingPath = buildFormatPath(productFormat);
    if (skinContext) {
      listingPath += `/${skinContext}`;
    }
    return listingPath;
  }

  if (skinContext) {
    return `/sunscreens/best/${skinContext}`;
  }

  return '/sunscreens';
}

function buildCanonicalCombinationPaths({ skinContextRouteSlug = '', brandSlug = '', productFormatSlug = '', filterTypeSlug = '' }) {
  const skinContext = String(skinContextRouteSlug || '').trim();
  const brand = String(brandSlug || '').trim();
  const productFormat = String(productFormatSlug || '').trim();
  const filterType = String(filterTypeSlug || '').trim();
  const paths = [];
  const seen = new Set();

  function addPath(criteria) {
    const listingPath = buildListingPath({ skinContextRouteSlug: skinContext, ...criteria });

    if (listingPath && !seen.has(listingPath)) {
      seen.add(listingPath);
      paths.push(listingPath);
    }
  }

  if (skinContext) {
    if (brand) {
      addPath({ brandSlug: brand });
    }
    if (productFormat) {
      addPath({ productFormatSlug: productFormat });
    }
    if (filterType) {
      addPath({ filterTypeSlug: filterType });
    }
  }

  if (brand && productFormat) {
    addPath({ brandSlug: brand, productFormatSlug: productFormat });
  }
  if (filterType && brand) {
    addPath({ filterTypeSlug: filterType, brandSlug: brand });
  }
  if (filterType && productFormat) {
    addPath({ filterTypeSlug: filterType, productFormatSlug: productFormat });
  }
  if (filterType && brand && productFormat) {
    addPath({ filterTypeSlug: filterType, brandSlug: brand, productFormatSlug: productFormat });
  }

  return paths;
}

function buildStaticSitemapEntries() {
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now },
    { url: `${SITE_URL}/about`, lastModified: now },
    { url: `${SITE_URL}/how-it-works`, lastModified: now },
    { url: `${SITE_URL}/legal`, lastModified: now },
    { url: `${SITE_URL}/privacy`, lastModified: now },
    { url: `${SITE_URL}/sunscreens`, lastModified: now }
  ];
}

function createEmptySitemapFamilies() {
  return {
    static: [],
    products: [],
    'skin-context': [],
    brands: [],
    formats: [],
    filters: [],
    combinations: []
  };
}

async function buildSitemapEntriesByFamily() {
  const families = createEmptySitemapFamilies();
  families.static = buildStaticSitemapEntries();

  const [personas, brands, productFormats, filterTypes, products, skinScores] = await Promise.all([
    fetchAllSupabaseRows(
      'target_personas',
      'id, page_slug, route_slug, page_title, created_at, skin_type, skin_condition, age, skin_tone',
      { orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }] }
    ),
    fetchAllBrands(),
    fetchAllProductFormats(),
    fetchAllFilterTypes(),
    fetchAllSupabaseRows(
      'products',
      'id, slug, created_at, brand_id, brand_name, product_format_id, product_format, filter_type_id, filter_type, overall_score',
      { orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }] }
    ),
    fetchAllSupabaseRows(
      'product_skin_scores',
      'id, persona_id, product_id',
      { orderBy: [{ column: 'id', ascending: true }] }
    )
  ]);

  const entriesByFamily = createEmptySitemapFamilies();
  entriesByFamily.static = families.static;
  const seen = new Set();
  const personaIdsWithProducts = new Set();
  const personaMap = new Map(personas.map((row) => [row.id, row]));
  const productMap = new Map(products.map((row) => [row.id, row]));
  const brandMap = new Map(brands.filter((row) => row.id).map((row) => [row.id, row]));
  const productFormatMap = new Map(productFormats.filter((row) => row.id).map((row) => [row.id, row]));
  const filterTypeMap = new Map(filterTypes.filter((row) => row.id).map((row) => [row.id, row]));
  const brandSlugByValue = new Map(
    brands.map((row) => [normalizeLookupValue(row.sourceValue || row.label), row.slug]).filter(([value, slug]) => value && slug)
  );
  const productFormatSlugByValue = new Map(
    productFormats.map((row) => [normalizeLookupValue(row.sourceValue || row.label), row.slug]).filter(([value, slug]) => value && slug)
  );
  const filterTypeSlugByValue = new Map(
    filterTypes.map((row) => [normalizeLookupValue(row.sourceValue || row.label), row.slug]).filter(([value, slug]) => value && slug)
  );

  function addEntry(family, listingPath, lastModified) {
    if (!SITEMAP_FAMILIES.includes(family) || !listingPath) {
      return;
    }

    const url = `${SITE_URL}${listingPath}`;
    if (seen.has(url)) {
      return;
    }

    seen.add(url);
    entriesByFamily[family].push({ url, lastModified: lastModified || new Date() });
  }

  function getBrandSlug(product) {
    if (product.brand_id && brandMap.has(product.brand_id)) {
      return brandMap.get(product.brand_id).slug;
    }

    return brandSlugByValue.get(normalizeLookupValue(product.brand_name)) || '';
  }

  function getProductFormatSlug(product) {
    if (product.product_format_id && productFormatMap.has(product.product_format_id)) {
      return productFormatMap.get(product.product_format_id).slug;
    }

    return productFormatSlugByValue.get(normalizeLookupValue(product.product_format)) || '';
  }

  function getFilterTypeSlug(product) {
    if (product.filter_type_id && filterTypeMap.has(product.filter_type_id)) {
      return filterTypeMap.get(product.filter_type_id).slug;
    }

    return filterTypeSlugByValue.get(normalizeLookupValue(product.filter_type)) || '';
  }

  for (const product of products) {
    if (product.slug) {
      addEntry('products', `/sunscreens/${product.slug}`, product.created_at);
    }
  }

  for (const product of products.filter((row) => row.overall_score !== null)) {
    const brandSlug = getBrandSlug(product);
    const productFormatSlug = getProductFormatSlug(product);
    const filterTypeSlug = getFilterTypeSlug(product);

    if (brandSlug) {
      addEntry('brands', buildListingPath({ brandSlug }), product.created_at);
    }
    if (productFormatSlug) {
      addEntry('formats', buildListingPath({ productFormatSlug }), product.created_at);
    }
    if (filterTypeSlug) {
      addEntry('filters', buildListingPath({ filterTypeSlug }), product.created_at);
    }

    for (const listingPath of buildCanonicalCombinationPaths({ brandSlug, productFormatSlug, filterTypeSlug })) {
      addEntry('combinations', listingPath, product.created_at);
    }
  }

  for (const row of skinScores) {
    const persona = personaMap.get(row.persona_id);
    const product = productMap.get(row.product_id);

    if (!persona?.route_slug || !product) {
      continue;
    }

    const brandSlug = getBrandSlug(product);
    const productFormatSlug = getProductFormatSlug(product);
    const filterTypeSlug = getFilterTypeSlug(product);

    personaIdsWithProducts.add(persona.id);
    addEntry('skin-context', buildListingPath({ skinContextRouteSlug: persona.route_slug }), persona.created_at);

    for (const listingPath of buildCanonicalCombinationPaths({
      skinContextRouteSlug: persona.route_slug,
      brandSlug,
      productFormatSlug,
      filterTypeSlug
    })) {
      addEntry('combinations', listingPath, persona.created_at);
    }
  }

  for (const persona of personas) {
    if (persona.route_slug && personaIdsWithProducts.has(persona.id)) {
      addEntry('skin-context', buildListingPath({ skinContextRouteSlug: persona.route_slug }), persona.created_at);
    }
  }

  return entriesByFamily;
}

function chunkEntries(entries, chunkSize = SITEMAP_CHUNK_SIZE) {
  const chunks = [];

  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push(entries.slice(index, index + chunkSize));
  }

  return chunks;
}

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
      (entry) => `  <sitemap>\n    <loc>${escapeXml(entry.url)}</loc>\n    <lastmod>${escapeXml(formatIsoDate(entry.lastModified))}</lastmod>\n  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

function buildUrlSetXml(entries) {
  const body = entries
    .map(
      (entry) => `  <url>\n    <loc>${escapeXml(entry.url)}</loc>\n    <lastmod>${escapeXml(formatIsoDate(entry.lastModified))}</lastmod>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function removeGeneratedSitemaps() {
  await fs.rm(SITEMAPS_DIR, { recursive: true, force: true });
  await fs.mkdir(SITEMAPS_DIR, { recursive: true });
}

async function writeTextFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

function buildShards(entriesByFamily) {
  return SITEMAP_FAMILIES.flatMap((family) => {
    const entries = Array.isArray(entriesByFamily[family]) ? entriesByFamily[family] : [];
    const chunks = chunkEntries(entries);

    return chunks.map((entriesForShard, index) => ({
      family,
      page: index + 1,
      entries: entriesForShard
    }));
  });
}

// Old persona URLs (/<page_slug>) moved to /sunscreens/best/<route_slug>. The site is
// served as static files, so Cloudflare does these redirects from public/_redirects.
const REDIRECTS_PATH = path.join(PUBLIC_DIR, '_redirects');
const RESERVED_TOP_LEVEL = new Set(['sunscreens', 'about', 'how-it-works', 'legal', 'privacy', 'login', 'profile', 'auth', 'sitemaps', '_next']);

async function writePersonaRedirects() {
  const personas = await fetchAllSupabaseRows('target_personas', 'id, page_slug, route_slug', {
    orderBy: [{ column: 'id', ascending: true }]
  });
  const lines = new Set();

  for (const persona of personas) {
    const pageSlug = String(persona.page_slug || '').trim();
    const routeSlug = String(persona.route_slug || '').trim();

    if (!pageSlug || !routeSlug || pageSlug.includes('/') || RESERVED_TOP_LEVEL.has(pageSlug)) {
      continue;
    }

    lines.add(`/${pageSlug} /sunscreens/best/${routeSlug} 301`);
  }

  await writeTextFile(REDIRECTS_PATH, `${[...lines].join('\n')}\n`);
  console.log(`Wrote ${lines.size} persona redirect(s) to public/_redirects.`);
}

async function main() {
  await writePersonaRedirects();
  const entriesByFamily = await buildSitemapEntriesByFamily();
  const shards = buildShards(entriesByFamily);

  await removeGeneratedSitemaps();

  for (const shard of shards) {
    await writeTextFile(
      path.join(SITEMAPS_DIR, shard.family, `${shard.page}.xml`),
      buildUrlSetXml(shard.entries)
    );
  }

  const sitemapIndexEntries = shards.map((shard) => ({
    url: `${SITE_URL}/sitemaps/${shard.family}/${shard.page}.xml`,
    lastModified:
      shard.entries.reduce((latest, entry) => {
        const entryTime = new Date(entry.lastModified || 0).getTime();
        return entryTime > latest ? entryTime : latest;
      }, 0) || Date.now()
  }));

  await writeTextFile(SITEMAP_INDEX_PATH, buildSitemapIndexXml(sitemapIndexEntries));

  const counts = Object.fromEntries(
    SITEMAP_FAMILIES.map((family) => [family, Array.isArray(entriesByFamily[family]) ? entriesByFamily[family].length : 0])
  );

  console.log(`Generated ${shards.length} sitemap shard(s) for ${SITE_URL}.`);
  console.log(JSON.stringify(counts, null, 2));
}

await main();
