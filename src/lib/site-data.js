import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseServerClient } from './supabaseServer';

const SITE_NAME = 'Ryfoya';
const SITE_URL = 'https://ryfoya.com';
const DEFAULT_DESCRIPTION = 'Ryfoya helps you browse persona-driven sunscreen recommendation pages.';
const PRODUCT_DETAIL_TITLE_SUFFIX = 'Ingredients Analysed';
const DEFAULT_OG_IMAGE = `${SITE_URL}/ryfoya-logo.svg`;
const SKIN_CONTEXT_PERSONA_IDS = [
  '0f8e5367-e5a4-4dc4-9703-d5a639fe1637',
  'e8d647a6-6106-4f1d-9fca-a7b3a28660d3',
  '23331244-e6ea-44cb-a778-fb04348ab63a',
  '0b8d364f-04fb-47de-a11e-0f1ac9496b29'
];
const SKIN_CONTEXT_PERSONA_ORDER = new Map(
  SKIN_CONTEXT_PERSONA_IDS.map((personaId, index) => [personaId, index])
);
const PERSONAS_REVALIDATE = 3600;
const LISTINGS_REVALIDATE = 900;
const PRODUCT_REVALIDATE = 1800;
const DEFAULT_PRODUCTS_PER_PAGE = 24;
const SUPABASE_BATCH_SIZE = 1000;
const SITEMAP_CHUNK_SIZE = 10000;
const SITEMAP_FAMILIES = ['static', 'products', 'skin-context', 'brands', 'formats', 'filters', 'combinations'];

async function fetchAllSupabaseRows(supabase, table, select, options = {}) {
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

function buildPersonaPath(routeSlug, pageSlug = '') {
  const safeRouteSlug = String(routeSlug || '').trim();
  if (safeRouteSlug) {
    return `/sunscreens/best/${safeRouteSlug}`;
  }

  const safePageSlug = String(pageSlug || '').trim();
  return safePageSlug ? `/${safePageSlug}` : '/sunscreens';
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

function buildListingPath({
  skinContextRouteSlug = '',
  brandSlug = '',
  productFormatSlug = '',
  filterTypeSlug = '',
  persona = null
}) {
  const skinContext = String(skinContextRouteSlug || '').trim();
  const brand = String(brandSlug || '').trim();
  const productFormat = String(productFormatSlug || '').trim();
  const filterType = String(filterTypeSlug || '').trim();

  if (filterType) {
    let path = buildFilterTypePath(filterType);
    if (brand) {
      path += `/brand/${brand}`;
    }
    if (productFormat) {
      path += `/format/${productFormat}`;
    }
    if (skinContext) {
      path += `/${skinContext}`;
    }
    return path;
  }

  if (brand) {
    let path = buildBrandPath(brand);
    if (productFormat) {
      path += `/format/${productFormat}`;
    }
    if (skinContext) {
      path += `/${skinContext}`;
    }
    return path;
  }

  if (productFormat) {
    let path = buildFormatPath(productFormat);
    if (skinContext) {
      path += `/${skinContext}`;
    }
    return path;
  }

  if (skinContext) {
    return `/sunscreens/best/${skinContext}`;
  }

  return '/sunscreens';
}

function formatLookupLabel(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeLookupValue(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyLookupValue(value) {
  const normalized = normalizeLookupValue(value).toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'item';
}

function buildFallbackLookupMeta(label) {
  const safeLabel = normalizeLookupValue(label);

  return {
    metaTitle: `Best ${safeLabel} Sunscreens | Ryfoya`,
    metaDescription: `Browse the best ${safeLabel} sunscreens ranked on Ryfoya with transparent scoring, formula analysis, and skin-context comparisons.`
  };
}

function buildFallbackLookupRows(values) {
  const normalizedValues = Array.isArray(values) ? values : [];
  const seenKeys = new Set();
  const seenSlugs = new Set();
  const rows = [];

  for (const rawValue of normalizedValues) {
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

    rows.push({
      id: null,
      slug,
      label: sourceValue,
      sourceValue,
      ...buildFallbackLookupMeta(sourceValue),
      createdAt: null
    });
  }

  return rows.sort((left, right) => left.label.localeCompare(right.label));
}

function buildTitleContext(persona) {
  const age = String(persona?.age || '').trim();
  const skinCondition = String(persona?.skin_condition || '').trim();
  const skinType = String(persona?.skin_type || '').trim();
  const skinContextParts = [skinCondition, skinType].filter(Boolean);
  const tail = skinContextParts.length > 0 ? `${skinContextParts.join(' ')} Skin`.trim() : '';

  if (age && tail) {
    return `for ${age} with ${tail}`;
  }

  if (age) {
    return `for ${age}`;
  }

  if (tail) {
    return `for ${tail}`;
  }

  return '';
}

function hashString(value) {
  return [...String(value || '')].reduce(
    (hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0,
    0
  );
}

function cleanDescriptionText(value, { lowercase = true } = {}) {
  const normalized = normalizeLookupValue(value);
  return lowercase ? normalized.toLowerCase() : normalized;
}

function buildListingDescriptionSeed({ persona = null, brand = null, productFormat = null, filterType = null }) {
  return buildListingPath({
    skinContextRouteSlug: persona?.route_slug || '',
    brandSlug: brand?.slug || '',
    productFormatSlug: productFormat?.slug || '',
    filterTypeSlug: filterType?.slug || '',
    persona
  });
}

function buildSunscreenProductPhrase({
  brand = null,
  productFormat = null,
  filterType = null,
  includeBrand = true,
  pluralFormat = true
}) {
  const filterLabel = cleanDescriptionText(filterType?.label);
  const brandLabel = includeBrand ? cleanDescriptionText(brand?.label, { lowercase: false }) : '';
  const productFormatLabel = cleanDescriptionText(productFormat?.label);
  const noun = productFormatLabel
    ? `sunscreen ${productFormatLabel}${pluralFormat ? 's' : ''}`
    : pluralFormat
      ? 'sunscreens'
      : 'sunscreen';

  return [filterLabel, brandLabel, noun]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildStandardAudienceClause(persona) {
  const age = cleanDescriptionText(persona?.age);
  const skinCondition = cleanDescriptionText(persona?.skin_condition);
  const skinType = cleanDescriptionText(persona?.skin_type);
  const clauses = [];

  if (age) {
    clauses.push(`for ${age}`);
  }

  if (skinCondition || skinType) {
    clauses.push(`with ${[skinCondition, skinType].filter(Boolean).join(' ')} skin`);
  }

  return clauses.length ? ` ${clauses.join(' ')}` : '';
}

function buildBenefitAudienceClause(persona) {
  const age = cleanDescriptionText(persona?.age);
  const skinCondition = cleanDescriptionText(persona?.skin_condition);
  const skinType = cleanDescriptionText(persona?.skin_type);

  if (age && skinType && skinCondition) {
    return ` for ${age} with ${skinType} skin and ${skinCondition} concerns`;
  }

  if (age && skinType) {
    return ` for ${age} with ${skinType} skin`;
  }

  if (age && skinCondition) {
    return ` for ${age} with ${skinCondition} concerns`;
  }

  if (age) {
    return ` for ${age}`;
  }

  if (skinType && skinCondition) {
    return ` for ${skinType} skin with ${skinCondition} concerns`;
  }

  if (skinType) {
    return ` for ${skinType} skin`;
  }

  if (skinCondition) {
    return ` for ${skinCondition} concerns`;
  }

  return '';
}

function buildQuestionAudienceClause(persona) {
  const age = cleanDescriptionText(persona?.age);
  const skinCondition = cleanDescriptionText(persona?.skin_condition);
  const skinType = cleanDescriptionText(persona?.skin_type);
  const skinContext = [skinCondition, skinType].filter(Boolean).join(' ');
  const clauses = [];

  if (skinContext) {
    clauses.push(`for ${skinContext} skin`);
  }

  if (age) {
    clauses.push(`in your ${age}`);
  }

  return clauses.length ? ` ${clauses.join(' ')}` : '';
}

function buildBrandTopPicksSentence(brand) {
  const brandLabel = cleanDescriptionText(brand?.label, { lowercase: false });
  return brandLabel ? `Browse ${brandLabel}'s top picks.` : 'Browse top picks.';
}

function buildListingTitle({ persona = null, brand = null, productFormat = null, filterType = null }) {
  const prefixParts = [filterType?.label, brand?.label].map((value) => String(value || '').trim()).filter(Boolean);
  const sunscreenNoun = productFormat?.label
    ? `Sunscreen ${String(productFormat.label).trim()}s`
    : 'Sunscreens';
  const contextSuffix = buildTitleContext(persona);

  return ['Best', ...prefixParts, sunscreenNoun, contextSuffix]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildListingDescription({ persona = null, brand = null, productFormat = null, filterType = null }) {
  const seed = buildListingDescriptionSeed({ persona, brand, productFormat, filterType });
  const hash = hashString(seed);
  const hasBrand = Boolean(cleanDescriptionText(brand?.label, { lowercase: false }));
  const standardProductPhrase =
    buildSunscreenProductPhrase({ brand, productFormat, filterType }) || 'sunscreens';
  const benefitProductPhrase =
    buildSunscreenProductPhrase({ productFormat, filterType, includeBrand: false }) || 'sunscreens';
  const questionProductPhrase =
    buildSunscreenProductPhrase({ productFormat, filterType, includeBrand: false, pluralFormat: false }) ||
    'sunscreen';
  const closers = [
    'Compare SPF, ingredients, finish & user reviews.',
    'Shortlisted by formula, texture & dermatologist ratings.',
    'Vetted for real results, real skin & honest reviews.',
    'Compare formulas, finishes & verified user feedback.',
    'Handpicked by skin compatibility, SPF & ingredient safety.'
  ];
  const closer = closers[(hash >>> 3) % closers.length];
  const standardDescription = () =>
    `Discover the best ${standardProductPhrase}${buildStandardAudienceClause(persona)}. ${closer}`;
  const benefitDescription = () =>
    `Top-rated ${benefitProductPhrase}${buildBenefitAudienceClause(persona)}. ${closer}`;
  const questionDescription = () =>
    `Looking for the best ${questionProductPhrase}${buildQuestionAudienceClause(persona)}? ${buildBrandTopPicksSentence(brand)} ${closer}`;
  const description = hasBrand
    ? hash % 2 === 0
      ? standardDescription()
      : questionDescription()
    : benefitDescription();

  return description
    .replace(/\s+/g, ' ')
    .trim();
}

function seededPrice(seed) {
  const value = String(seed || 'fallback-seed');
  const hash = [...value].reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  return 20 + (hash % 31);
}

function toList(value, fallback) {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  return fallback;
}

function normalizeImageLinks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function formatProductValue(value, fallback) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function removeProtectionRatingsFromProductName(value) {
  return normalizeLookupValue(value)
    .replace(/\((?:\s*(?:spf\s*\d{1,3}\+?|pa\s*\+{1,4})\s*(?:[,&/+-]\s*)?)+\)/gi, ' ')
    .replace(/\bspf\s*\d{1,3}\+?(?=\W|$)/gi, ' ')
    .replace(/\bpa\s*\+{1,4}(?=\W|$)/gi, ' ')
    .replace(/\s*(?:[|,/+-]\s*)+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatProductDisplayName(value) {
  const normalized = normalizeLookupValue(value);
  return removeProtectionRatingsFromProductName(normalized) || normalized;
}

function normalizeAnalysis(analysis) {
  if (!analysis) {
    return null;
  }

  if (typeof analysis === 'string') {
    try {
      return JSON.parse(analysis);
    } catch {
      return null;
    }
  }

  if (typeof analysis === 'object') {
    return analysis;
  }

  return null;
}

function normalizeJsonObject(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return null;
}

function getAnalysisValue(analysis, keys) {
  if (!analysis || typeof analysis !== 'object') {
    return '';
  }

  for (const key of keys) {
    const value = analysis[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  for (const value of Object.values(analysis)) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const item = value.find((entry) => typeof entry === 'string' && entry.trim());
      if (item) {
        return item.trim();
      }
    }
  }

  return '';
}

function getFlagSummary(flags) {
  if (!Array.isArray(flags) || flags.length === 0) {
    return '';
  }

  return flags
    .map((flag) => {
      const concern = String(flag?.concern_type || '').trim();
      const severity = String(flag?.severity || '').trim();
      const description = String(flag?.description || '').trim();
      const prefix = [severity, concern].filter(Boolean).join(' ');
      return [prefix, description].filter(Boolean).join(': ');
    })
    .filter(Boolean)
    .join(' ');
}

function buildIngredientSummary(analysis, isActive) {
  if (!analysis) {
    return '';
  }

  if (isActive) {
    const spectrums = Array.isArray(analysis.protection_spectrums)
      ? analysis.protection_spectrums.join('/')
      : '';
    const activeParts = [
      analysis.filter_type,
      spectrums,
      analysis.sub_category,
      analysis.category
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    if (activeParts.length > 0) {
      return activeParts.join(' · ');
    }
  }

  const inactiveParts = [analysis.sub_category, analysis.category]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return inactiveParts.join(' · ');
}

function buildIngredientDetails(analysis) {
  if (!analysis) {
    return '';
  }

  return [
    getAnalysisValue(analysis, ['function_description']),
    getAnalysisValue(analysis, ['skin_concern_relevance']),
    getAnalysisValue(analysis, ['notes']),
    getFlagSummary(analysis.flags)
  ]
    .filter(Boolean)
    .join(' ');
}

function normalizeFlags(flags) {
  if (!Array.isArray(flags)) {
    return [];
  }

  return flags
    .map((flag) => ({
      severity: String(flag?.severity || '').trim(),
      concernType: String(flag?.concern_type || '').trim(),
      description: String(flag?.description || '').trim(),
      sourceUrl: String(flag?.source_url || '').trim()
    }))
    .filter((flag) => flag.description || flag.concernType || flag.severity || flag.sourceUrl);
}

function normalizeScore(value) {
  return Number(value || 0);
}

function buildSkinFitText(parts, fallback) {
  const values = parts
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return values.join(' · ') || fallback;
}

function buildPersonaContext(persona) {
  return buildSkinFitText(
    [persona?.skin_type, persona?.skin_condition, persona?.age, persona?.skin_tone],
    'General Skin Context'
  );
}

function getPersonaTabLabel(persona) {
  return buildPersonaContext(persona);
}

function normalizePageNumber(value) {
  const page = Number.parseInt(String(value || '1'), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizePageSize(value) {
  const pageSize = Number.parseInt(String(value || DEFAULT_PRODUCTS_PER_PAGE), 10);
  return Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PRODUCTS_PER_PAGE;
}

function buildPaginationData(totalCount, currentPage, pageSize) {
  const safePageSize = normalizePageSize(pageSize);
  const safeTotalCount = Math.max(0, Number(totalCount) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotalCount / safePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  return {
    totalCount: safeTotalCount,
    totalPages,
    currentPage: safeCurrentPage,
    pageSize: safePageSize
  };
}

export function normalizeRow(row, persona) {
  const relationProduct = row.product ?? row.products ?? null;
  const product = Array.isArray(relationProduct) ? relationProduct[0] : relationProduct;
  const labels = toList(row.labels, ['Dermatologist Approved', 'Broad Spectrum', 'Daily Use']);
  const pros = toList(row.pros, ['Lightweight texture', 'Strong UV protection', 'Good daily wear']);
  const cons = toList(row.cons, ['Can feel rich', 'May need reapplication', 'Limited stock']);
  const score = normalizeScore(row.score);

  const priceNow = seededPrice(row.product_id || product?.id || product?.product_name);
  const priceWas = priceNow + 10;
  const savePercent = Math.round(((priceWas - priceNow) / priceWas) * 100);

  return {
    id: row.id,
    productId: row.product_id || product?.id,
    productSlug: product?.slug || '',
    personaId: row.persona_id || persona?.id,
    score,
    productName: product?.product_name || 'Unnamed Product',
    brandName: product?.brand_name || 'Unknown Brand',
    productBuyLink: String(product?.product_buy_link || '').trim(),
    brandId: product?.brand_id || null,
    productFormatId: product?.product_format_id || null,
    filterTypeId: product?.filter_type_id || null,
    spfRating: product?.spf_rating || 'SPF N/A',
    paRating: product?.pa_rating || 'PA N/A',
    imageLinks: normalizeImageLinks(product?.image_links),
    filterType: formatProductValue(product?.filter_type, 'Filter Type N/A'),
    productFormat: formatProductValue(product?.product_format, 'Format N/A'),
    labels,
    pros,
    cons,
    skinFitText: buildSkinFitText(labels, 'Daily Wear'),
    priceNow,
    priceWas,
    savePercent
  };
}

export function normalizeOverallProduct(product) {
  const score = normalizeScore(product.overall_score);
  const pros = toList(product.overall_pros, ['Strong protection', 'Comfortable wear', 'Reliable daily use']);
  const cons = toList(product.overall_cons, ['Limited data available', 'May not suit every routine', 'Patch test advised']);

  return {
    id: product.id,
    productId: product.id,
    productSlug: product.slug || '',
    score,
    productName: product.product_name || 'Unnamed Product',
    brandName: product.brand_name || 'Unknown Brand',
    productBuyLink: String(product.product_buy_link || '').trim(),
    brandId: product.brand_id || null,
    productFormatId: product.product_format_id || null,
    filterTypeId: product.filter_type_id || null,
    spfRating: product.spf_rating || 'SPF N/A',
    paRating: product.pa_rating || 'PA N/A',
    imageLinks: normalizeImageLinks(product.image_links),
    filterType: formatProductValue(product.filter_type, 'Filter Type N/A'),
    productFormat: formatProductValue(product.product_format, 'Format N/A'),
    pros,
    cons,
    skinFitText: buildSkinFitText(
      [product.filter_type, product.product_format, product.eco_reef_safety],
      'Overall Sunscreen Ranking'
    )
  };
}

function normalizeScorePercent(value) {
  const rawScore = normalizeScore(value);
  return Math.max(0, Math.min(100, rawScore <= 10 ? rawScore * 10 : rawScore));
}

const FAQ_NEGATIVE_LABEL_PATTERN = /\b(?:irritat(?:ing|ed|ion)|sensitiz(?:ing|ed)|drying|heavy|pilling|stinging|burning|white\s*cast|pore[-\s]?clogging|breakout(?:-prone)?)\b/i;
const FAQ_CONDITIONAL_NEGATIVE_LABEL_PATTERN = /\b(?:greasy|sticky|comedogenic)\b/i;
const FAQ_NON_ADJECTIVE_LABEL_PATTERN = /\b(?:vitamin(?:\s+[a-z0-9+]+)?|spf\s*\d*\+*|pa\+*|uva|uvb|zinc|titanium|niacinamide|ceramide|hyaluronic(?:\s+acid)?)\b/i;

function normalizeFaqLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[–—_]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^(?:non|oil|alcohol|fragrance)\s+/, (prefix) => `${prefix.trim()}-`);
}

function getFaqHighlights(labels) {
  return (Array.isArray(labels) ? labels : [])
    .flatMap((label) => String(label || '').split(/\s*[·•]\s*/))
    .map((label) => ({ label: String(label || '').trim(), normalized: normalizeFaqLabel(label) }))
    .filter(({ label, normalized }) => {
      const isNegatedDescriptor = /^non[-\s]/.test(normalized);
      return (
        label &&
        !FAQ_NEGATIVE_LABEL_PATTERN.test(normalized) &&
        !(FAQ_CONDITIONAL_NEGATIVE_LABEL_PATTERN.test(normalized) && !isNegatedDescriptor) &&
        !FAQ_NON_ADJECTIVE_LABEL_PATTERN.test(normalized)
      );
    })
    .map(({ label }) => label);
}

function formatNaturalLanguageList(values) {
  const items = values.map((value) => String(value || '').trim()).filter(Boolean);

  if (items.length <= 1) {
    return items[0] || '';
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function getListingSkinContext(pageTitle) {
  const match = String(pageTitle || '').match(/\bfor\s+(.+)$/i);
  return match?.[1]?.trim().toLowerCase() || '';
}

export function buildBrandListingFaq({ brand, persona, products }) {
  const brandName = String(brand?.label || '').trim();
  const skinContext = getListingSkinContext(
    buildListingTitle({ persona, brand, productFormat: null, filterType: null })
  );
  const rankedProducts = (products || [])
    .map((product) => ({ ...product, scorePercent: normalizeScorePercent(product.score) }))
    .sort((left, right) => right.scorePercent - left.scorePercent || left.productName.localeCompare(right.productName));

  if (!brandName || !skinContext || rankedProducts.length === 0) {
    return null;
  }

  const highestScoringProduct = rankedProducts[0];
  const topProductName = String(highestScoringProduct.productName || '').trim();
  const highlights = formatNaturalLanguageList(getFaqHighlights(highestScoringProduct.labels));
  const qualifyingProducts = rankedProducts.filter((product) => product.scorePercent > 75);
  const question = `Which ${brandName} sunscreen is best for ${skinContext}?`;

  if (qualifyingProducts.length === 0) {
    return {
      question,
      answer: highlights
        ? `No ${brandName} sunscreen is best for ${skinContext}, but the highest-scoring option, the ${topProductName}, is ${highlights}, so it might be suitable for ${skinContext}.`
        : `No ${brandName} sunscreen is best for ${skinContext}, but the highest-scoring option, the ${topProductName}, might be suitable for ${skinContext}.`
    };
  }

  const qualifyingProductNames = formatNaturalLanguageList(
    qualifyingProducts.map((product) => product.productName)
  );
  const verb = qualifyingProducts.length === 1 ? 'is' : 'are';

  return {
    question,
    answer: highlights
      ? `${brandName}'s ${qualifyingProductNames} ${verb} best for ${skinContext}. The ${brandName} ${topProductName} is ${highlights}, making it suitable for ${skinContext}.`
      : `${brandName}'s ${qualifyingProductNames} ${verb} best for ${skinContext}. The ${brandName} ${topProductName} might be suitable for ${skinContext}.`
  };
}

const fetchAllPersonasCached = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    return fetchAllSupabaseRows(
      supabase,
      'target_personas',
      'id, page_slug, route_slug, page_title, created_at, skin_type, skin_condition, age, skin_tone',
      { orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }] }
    );
  },
  ['all-personas'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['personas'] }
);

export async function fetchAllPersonas() {
  return fetchAllPersonasCached();
}

function normalizeLookupRow(row) {
  return {
    id: row.id,
    slug: String(row.slug || '').trim(),
    label: formatLookupLabel(row.label, row.source_value),
    sourceValue: String(row.source_value || '').trim(),
    metaTitle: String(row.meta_title || '').trim(),
    metaDescription: String(row.meta_description || '').trim(),
    createdAt: row.created_at || null
  };
}

const fetchProductLookupFallbackRowsCached = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const rows = await fetchAllSupabaseRows(
      supabase,
      'products',
      'id, brand_name, product_format, filter_type, created_at',
      { orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }] }
    );

    return {
      brands: buildFallbackLookupRows(rows.map((row) => row.brand_name)),
      productFormats: buildFallbackLookupRows(rows.map((row) => row.product_format)),
      filterTypes: buildFallbackLookupRows(rows.map((row) => row.filter_type))
    };
  },
  ['product-lookup-fallback-rows'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['products', 'brands', 'product-formats', 'filter-types'] }
);

const fetchAllBrandsCached = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const rows = await fetchAllSupabaseRows(
      supabase,
      'brands',
      'id, slug, label, source_value, meta_title, meta_description, created_at',
      { orderBy: [{ column: 'label', ascending: true }, { column: 'id', ascending: true }] }
    );

    return rows.map(normalizeLookupRow);
  },
  ['all-brands'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['brands'] }
);

export async function fetchAllBrands() {
  const rows = await fetchAllBrandsCached();

  if (rows.length > 0) {
    return rows;
  }

  return (await fetchProductLookupFallbackRowsCached()).brands;
}

const fetchAllProductFormatsCached = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const rows = await fetchAllSupabaseRows(
      supabase,
      'product_formats',
      'id, slug, label, source_value, meta_title, meta_description, created_at',
      { orderBy: [{ column: 'label', ascending: true }, { column: 'id', ascending: true }] }
    );

    return rows.map(normalizeLookupRow);
  },
  ['all-product-formats'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['product-formats'] }
);

export async function fetchAllProductFormats() {
  const rows = await fetchAllProductFormatsCached();

  if (rows.length > 0) {
    return rows;
  }

  return (await fetchProductLookupFallbackRowsCached()).productFormats;
}

const fetchAllFilterTypesCached = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const rows = await fetchAllSupabaseRows(
      supabase,
      'filter_types',
      'id, slug, label, source_value, meta_title, meta_description, created_at',
      { orderBy: [{ column: 'label', ascending: true }, { column: 'id', ascending: true }] }
    );

    return rows.map(normalizeLookupRow);
  },
  ['all-filter-types'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['filter-types'] }
);

export async function fetchAllFilterTypes() {
  const rows = await fetchAllFilterTypesCached();

  if (rows.length > 0) {
    return rows;
  }

  return (await fetchProductLookupFallbackRowsCached()).filterTypes;
}

const fetchPersonaByRouteSlugCached = unstable_cache(
  async (routeSlug) => {
    const supabase = getSupabaseServerClient();
    const { data: personaRows, error } = await supabase
      .from('target_personas')
      .select(
        'id, skin_type, skin_condition, age, skin_tone, page_title, page_description, meta_description, page_slug, route_slug'
      )
      .eq('route_slug', routeSlug)
      .limit(2);

    if (error) {
      throw new Error(`Could not load route persona: ${error.message}`);
    }

    if (!personaRows || personaRows.length === 0) {
      return null;
    }

    if (personaRows.length > 1) {
      throw new Error(`Multiple target_personas rows found for route_slug "${routeSlug}". Make route_slug unique.`);
    }

    return personaRows[0];
  },
  ['persona-by-route-slug'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['personas'] }
);

export async function fetchPersonaByRouteSlug(routeSlug) {
  const safeRouteSlug = String(routeSlug || '').trim();

  if (!safeRouteSlug) {
    return null;
  }

  const exactMatch = await fetchPersonaByRouteSlugCached(safeRouteSlug);

  if (exactMatch) {
    return exactMatch;
  }

  const alternateSlug = safeRouteSlug.endsWith('-skin')
    ? safeRouteSlug.slice(0, -5)
    : `${safeRouteSlug}-skin`;

  if (!alternateSlug || alternateSlug === safeRouteSlug) {
    return null;
  }

  return fetchPersonaByRouteSlugCached(alternateSlug);
}

function findLookupBySlug(rows, slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) {
    return null;
  }

  return rows.find((row) => row.slug === safeSlug) || null;
}

export async function fetchBrandBySlug(brandSlug) {
  const brands = await fetchAllBrands();
  return findLookupBySlug(brands, brandSlug);
}

export async function fetchBrandForProduct({ brandId = '', brandName = '' } = {}) {
  const brands = await fetchAllBrands();
  const safeBrandId = String(brandId || '').trim();

  if (safeBrandId) {
    const idMatch = brands.find((brand) => brand.id === safeBrandId);
    if (idMatch) {
      return idMatch;
    }
  }

  const normalizedBrandName = normalizeLookupValue(brandName);
  return (
    brands.find(
      (brand) => normalizeLookupValue(brand.sourceValue || brand.label || '') === normalizedBrandName
    ) || null
  );
}

export async function fetchProductFormatBySlug(productFormatSlug) {
  const productFormats = await fetchAllProductFormats();
  return findLookupBySlug(productFormats, productFormatSlug);
}

export async function fetchFilterTypeBySlug(filterTypeSlug) {
  const filterTypes = await fetchAllFilterTypes();
  return findLookupBySlug(filterTypes, filterTypeSlug);
}

export async function fetchListingFiltersData() {
  const [personas, brands, productFormats, filterTypes] = await Promise.all([
    fetchAllPersonas(),
    fetchAllBrands(),
    fetchAllProductFormats(),
    fetchAllFilterTypes()
  ]);

  return {
    personas,
    brands,
    productFormats,
    filterTypes
  };
}

async function fetchFilteredProductIds({
  brandId = '',
  brandValue = '',
  productFormatId = '',
  productFormatValue = '',
  filterTypeId = '',
  filterTypeValue = '',
  requireOverallScore = false
}) {
  const supabase = getSupabaseServerClient();
  const productIds = [];

  for (let from = 0; ; from += SUPABASE_BATCH_SIZE) {
    const to = from + SUPABASE_BATCH_SIZE - 1;
    let query = supabase.from('products').select('id').range(from, to);

    if (brandId) {
      query = query.eq('brand_id', brandId);
    } else if (brandValue) {
      query = query.eq('brand_name', brandValue);
    }

    if (productFormatId) {
      query = query.eq('product_format_id', productFormatId);
    } else if (productFormatValue) {
      query = query.eq('product_format', productFormatValue);
    }

    if (filterTypeId) {
      query = query.eq('filter_type_id', filterTypeId);
    } else if (filterTypeValue) {
      query = query.eq('filter_type', filterTypeValue);
    }

    if (requireOverallScore) {
      query = query.not('overall_score', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Could not load filtered product ids: ${error.message}`);
    }

    const batch = data || [];
    productIds.push(...batch.map((row) => row.id).filter(Boolean));

    if (batch.length < SUPABASE_BATCH_SIZE) {
      return productIds;
    }
  }
}

function isSingleDimensionListing({ persona, brand, productFormat, filterType }) {
  const activeCount = [persona, brand, productFormat, filterType].filter(Boolean).length;
  return activeCount === 1;
}

function buildListingHeader({ persona = null, brand = null, productFormat = null, filterType = null }) {
  return {
    page_title: buildListingTitle({ persona, brand, productFormat, filterType }),
    page_description: buildListingDescription({ persona, brand, productFormat, filterType })
  };
}

const fetchListingPageDataCached = unstable_cache(
  async (criteria, requestedPage = 1, requestedPageSize = DEFAULT_PRODUCTS_PER_PAGE) => {
    const currentPage = normalizePageNumber(requestedPage);
    const pageSize = normalizePageSize(requestedPageSize);
    const safeCriteria = criteria || {};

    const [persona, brand, productFormat, filterType] = await Promise.all([
      safeCriteria.skinContextRouteSlug ? fetchPersonaByRouteSlug(safeCriteria.skinContextRouteSlug) : Promise.resolve(null),
      safeCriteria.brandSlug ? fetchBrandBySlug(safeCriteria.brandSlug) : Promise.resolve(null),
      safeCriteria.productFormatSlug ? fetchProductFormatBySlug(safeCriteria.productFormatSlug) : Promise.resolve(null),
      safeCriteria.filterTypeSlug ? fetchFilterTypeBySlug(safeCriteria.filterTypeSlug) : Promise.resolve(null)
    ]);

    if (
      (safeCriteria.skinContextRouteSlug && !persona) ||
      (safeCriteria.brandSlug && !brand) ||
      (safeCriteria.productFormatSlug && !productFormat) ||
      (safeCriteria.filterTypeSlug && !filterType)
    ) {
      return null;
    }

    const brandId = brand?.id || '';
    const productFormatId = productFormat?.id || '';
    const filterTypeId = filterType?.id || '';
    const brandValue = normalizeLookupValue(brand?.sourceValue || brand?.label || '');
    const productFormatValue = normalizeLookupValue(productFormat?.sourceValue || productFormat?.label || '');
    const filterTypeValue = normalizeLookupValue(filterType?.sourceValue || filterType?.label || '');

    if (persona) {
      const filteredProductIds =
        brandId || brandValue || productFormatId || productFormatValue || filterTypeId || filterTypeValue
          ? await fetchFilteredProductIds({
              brandId,
              brandValue,
              productFormatId,
              productFormatValue,
              filterTypeId,
              filterTypeValue,
              requireOverallScore: false
            })
          : null;

      if (Array.isArray(filteredProductIds) && filteredProductIds.length === 0) {
        const header = buildListingHeader({ persona, brand, productFormat, filterType });
        return {
          persona: { ...persona, ...header },
          products: [],
          formulasReviewed: 0,
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
          pageSize
        };
      }

      const supabase = getSupabaseServerClient();
      let countQuery = supabase
        .from('product_skin_scores')
        .select('id', { count: 'exact', head: true })
        .eq('persona_id', persona.id);

      if (Array.isArray(filteredProductIds)) {
        countQuery = countQuery.in('product_id', filteredProductIds);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Could not count filtered persona products: ${countError.message}`);
      }

      const pagination = buildPaginationData(count, currentPage, pageSize);
      const from = (pagination.currentPage - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      const baseSelect = 'id, product_id, persona_id, score, labels, pros, cons';
      const productFields =
        'id, slug, product_name, brand_name, product_buy_link, brand_id, product_format_id, filter_type_id, spf_rating, pa_rating, ph_value, filter_type, product_format, image_links';
      const selectWithNamedFk = `${baseSelect}, product:products!product_skin_scores_product_id_fkey(${productFields})`;
      const selectWithDefaultRelation = `${baseSelect}, products(${productFields})`;

      let result = supabase
        .from('product_skin_scores')
        .select(selectWithNamedFk)
        .eq('persona_id', persona.id)
        .order('score', { ascending: false })
        .range(from, to);

      if (Array.isArray(filteredProductIds)) {
        result = result.in('product_id', filteredProductIds);
      }

      let queryResult = await result;

      if (queryResult.error) {
        let fallback = supabase
          .from('product_skin_scores')
          .select(selectWithDefaultRelation)
          .eq('persona_id', persona.id)
          .order('score', { ascending: false })
          .range(from, to);

        if (Array.isArray(filteredProductIds)) {
          fallback = fallback.in('product_id', filteredProductIds);
        }

        queryResult = await fallback;
      }

      if (queryResult.error) {
        throw new Error(`Could not load filtered persona products: ${queryResult.error.message}`);
      }

      const header = buildListingHeader({ persona, brand, productFormat, filterType });
      const products = (queryResult.data || [])
        .map((row) => normalizeRow(row, persona))
        .sort((left, right) => right.score - left.score);

      return {
        persona: { ...persona, ...header },
        products,
        formulasReviewed: pagination.totalCount,
        totalCount: pagination.totalCount,
        totalPages: pagination.totalPages,
        currentPage: pagination.currentPage,
        pageSize: pagination.pageSize
      };
    }

    const supabase = getSupabaseServerClient();
    let countQuery = supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('overall_score', 'is', null);

    if (brandId) {
      countQuery = countQuery.eq('brand_id', brandId);
    } else if (brandValue) {
      countQuery = countQuery.eq('brand_name', brandValue);
    }
    if (productFormatId) {
      countQuery = countQuery.eq('product_format_id', productFormatId);
    } else if (productFormatValue) {
      countQuery = countQuery.eq('product_format', productFormatValue);
    }
    if (filterTypeId) {
      countQuery = countQuery.eq('filter_type_id', filterTypeId);
    } else if (filterTypeValue) {
      countQuery = countQuery.eq('filter_type', filterTypeValue);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Could not count listing products: ${countError.message}`);
    }

    const pagination = buildPaginationData(count, currentPage, pageSize);
    const from = (pagination.currentPage - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    let query = supabase
      .from('products')
      .select(
        'id, slug, product_name, brand_name, product_buy_link, brand_id, product_format_id, filter_type_id, spf_rating, pa_rating, filter_type, product_format, eco_reef_safety, overall_score, overall_pros, overall_cons, image_links'
      )
      .not('overall_score', 'is', null)
      .order('overall_score', { ascending: false })
      .range(from, to);

    if (brandId) {
      query = query.eq('brand_id', brandId);
    } else if (brandValue) {
      query = query.eq('brand_name', brandValue);
    }
    if (productFormatId) {
      query = query.eq('product_format_id', productFormatId);
    } else if (productFormatValue) {
      query = query.eq('product_format', productFormatValue);
    }
    if (filterTypeId) {
      query = query.eq('filter_type_id', filterTypeId);
    } else if (filterTypeValue) {
      query = query.eq('filter_type', filterTypeValue);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Could not load listing products: ${error.message}`);
    }

    const header = buildListingHeader({ persona: null, brand, productFormat, filterType });
    const pageMeta = isSingleDimensionListing({ persona: null, brand, productFormat, filterType })
      ? {
          meta_title: brand?.metaTitle || productFormat?.metaTitle || filterType?.metaTitle || '',
          meta_description:
            brand?.metaDescription || productFormat?.metaDescription || filterType?.metaDescription || ''
        }
      : { meta_title: '', meta_description: '' };

    return {
      persona: { ...header, ...pageMeta },
      products: (data || []).map(normalizeOverallProduct),
      formulasReviewed: pagination.totalCount,
      totalCount: pagination.totalCount,
      totalPages: pagination.totalPages,
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
      entities: { brand, productFormat, filterType }
    };
  },
  ['listing-page-data'],
  { revalidate: LISTINGS_REVALIDATE, tags: ['persona-pages', 'overall-sunscreens', 'brands', 'product-formats', 'filter-types'] }
);

async function fetchAllMatchingPersonaScoreRows({ personaId, productIds, select }) {
  const supabase = getSupabaseServerClient();
  const rows = [];

  for (let from = 0; ; from += SUPABASE_BATCH_SIZE) {
    const to = from + SUPABASE_BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from('product_skin_scores')
      .select(select)
      .eq('persona_id', personaId)
      .in('product_id', productIds)
      .order('score', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Could not load FAQ products: ${error.message}`);
    }

    const batch = data || [];
    rows.push(...batch);

    if (batch.length < SUPABASE_BATCH_SIZE) {
      return rows;
    }
  }
}

const fetchBrandListingFaqCached = unstable_cache(
  async (criteria) => {
    const safeCriteria = criteria || {};
    const [persona, brand, productFormat, filterType] = await Promise.all([
      fetchPersonaByRouteSlug(safeCriteria.skinContextRouteSlug),
      fetchBrandBySlug(safeCriteria.brandSlug),
      safeCriteria.productFormatSlug ? fetchProductFormatBySlug(safeCriteria.productFormatSlug) : Promise.resolve(null),
      safeCriteria.filterTypeSlug ? fetchFilterTypeBySlug(safeCriteria.filterTypeSlug) : Promise.resolve(null)
    ]);

    if (!persona || !brand) {
      return null;
    }

    const productIds = await fetchFilteredProductIds({
      brandId: brand.id || '',
      brandValue: normalizeLookupValue(brand.sourceValue || brand.label || ''),
      productFormatId: productFormat?.id || '',
      productFormatValue: normalizeLookupValue(productFormat?.sourceValue || productFormat?.label || ''),
      filterTypeId: filterType?.id || '',
      filterTypeValue: normalizeLookupValue(filterType?.sourceValue || filterType?.label || ''),
      requireOverallScore: false
    });

    if (productIds.length === 0) {
      return null;
    }

    const baseSelect = 'id, product_id, persona_id, score, labels, pros, cons';
    const productFields =
      'id, slug, product_name, brand_name, product_buy_link, brand_id, product_format_id, filter_type_id, spf_rating, pa_rating, ph_value, filter_type, product_format, image_links';
    const selectWithNamedFk = `${baseSelect}, product:products!product_skin_scores_product_id_fkey(${productFields})`;
    const selectWithDefaultRelation = `${baseSelect}, products(${productFields})`;

    let rows;
    try {
      rows = await fetchAllMatchingPersonaScoreRows({
        personaId: persona.id,
        productIds,
        select: selectWithNamedFk
      });
    } catch {
      rows = await fetchAllMatchingPersonaScoreRows({
        personaId: persona.id,
        productIds,
        select: selectWithDefaultRelation
      });
    }

    const products = rows
      .map((row) => ({ ...normalizeRow(row, persona), labels: toList(row.labels, []) }))
      .sort((left, right) => right.score - left.score);

    return buildBrandListingFaq({ brand, persona, products });
  },
  ['brand-listing-faq'],
  {
    revalidate: LISTINGS_REVALIDATE,
    tags: ['persona-pages', 'brands', 'product-formats', 'filter-types', 'products', 'product-skin-scores']
  }
);

export async function fetchListingPageData(criteria, requestedPage = 1, requestedPageSize = DEFAULT_PRODUCTS_PER_PAGE) {
  const safeCriteria = {
    skinContextRouteSlug: String(criteria?.skinContextRouteSlug || '').trim(),
    brandSlug: String(criteria?.brandSlug || '').trim(),
    productFormatSlug: String(criteria?.productFormatSlug || '').trim(),
    filterTypeSlug: String(criteria?.filterTypeSlug || '').trim()
  };

  const [pageData, faq] = await Promise.all([
    fetchListingPageDataCached(
      safeCriteria,
      normalizePageNumber(requestedPage),
      normalizePageSize(requestedPageSize)
    ),
    safeCriteria.brandSlug && safeCriteria.skinContextRouteSlug
      ? fetchBrandListingFaqCached(safeCriteria)
      : Promise.resolve(null)
  ]);

  return pageData ? { ...pageData, faq } : null;
}

const fetchOverallSunscreensCached = unstable_cache(
  async (requestedPage = 1, requestedPageSize = DEFAULT_PRODUCTS_PER_PAGE) => {
    const currentPage = normalizePageNumber(requestedPage);
    const pageSize = normalizePageSize(requestedPageSize);
    const supabase = getSupabaseServerClient();
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('overall_score', 'is', null);

    if (countError) {
      throw new Error(`Could not count overall sunscreens: ${countError.message}`);
    }

    const pagination = buildPaginationData(count, currentPage, pageSize);
    const from = (pagination.currentPage - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    const { data, error } = await supabase
      .from('products')
      .select(
        'id, slug, product_name, brand_name, product_buy_link, brand_id, product_format_id, filter_type_id, spf_rating, pa_rating, filter_type, product_format, eco_reef_safety, overall_score, overall_pros, overall_cons, image_links'
      )
      .not('overall_score', 'is', null)
      .order('overall_score', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Could not load overall sunscreens: ${error.message}`);
    }

    const products = (data || []).map(normalizeOverallProduct);
    const formulasReviewed = pagination.totalCount || products.length || 48;

    return {
      products,
      formulasReviewed,
      totalCount: pagination.totalCount,
      totalPages: pagination.totalPages,
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
    };
  },
  ['overall-sunscreens'],
  { revalidate: LISTINGS_REVALIDATE, tags: ['overall-sunscreens'] }
);

export async function fetchOverallSunscreens(requestedPage = 1, requestedPageSize = DEFAULT_PRODUCTS_PER_PAGE) {
  return fetchOverallSunscreensCached(
    normalizePageNumber(requestedPage),
    normalizePageSize(requestedPageSize)
  );
}

function normalizeProductDetail(product) {
  const priceNow = seededPrice(product.id || product.product_name);
  const priceWas = priceNow + 10;

  return {
    id: product.id,
    productId: product.id,
    productSlug: product.slug || '',
    productName: product.product_name || 'Unnamed Product',
    brandName: product.brand_name || 'Unknown Brand',
    productBuyLink: String(product.product_buy_link || '').trim(),
    brandId: product.brand_id || null,
    productFormatId: product.product_format_id || null,
    filterTypeId: product.filter_type_id || null,
    spfRating: product.spf_rating || 'SPF N/A',
    paRating: product.pa_rating || 'PA N/A',
    imageLinks: normalizeImageLinks(product.image_links),
    totalIngredients: product.total_ingredients || null,
    sweatResistance: formatProductValue(product.sweat_resistance, 'Not specified'),
    phValue: product.ph_value || 'Not specified',
    filterType: formatProductValue(product.filter_type, 'Not specified'),
    productFormat: formatProductValue(product.product_format, 'Not specified'),
    ecoReefSafety: formatProductValue(product.eco_reef_safety, 'Not specified'),
    nanoStatus: formatProductValue(product.nano_status, 'Not specified'),
    vegan: formatProductValue(product.vegan, 'Not specified'),
    crueltyFree: formatProductValue(product.cruelty_free, 'Not specified'),
    overallScore: normalizeScore(product.overall_score),
    overallPros: toList(product.overall_pros, ['Strong UV protection', 'Balanced daily wear', 'Broad consumer fit']),
    overallCons: toList(product.overall_cons, ['Patch test advised', 'Reapplication required', 'Individual tolerance may vary']),
    priceNow,
    priceWas,
    savePercent: Math.round(((priceWas - priceNow) / priceWas) * 100)
  };
}

const fetchProductBySlugCached = unstable_cache(
  async (productSlug) => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, slug, product_name, brand_name, product_buy_link, brand_id, product_format_id, filter_type_id, spf_rating, pa_rating, total_ingredients, sweat_resistance, ph_value, filter_type, product_format, eco_reef_safety, nano_status, vegan, cruelty_free, overall_score, overall_pros, overall_cons, image_links, created_at'
      )
      .eq('slug', productSlug)
      .limit(1);

    if (error) {
      throw new Error(`Could not load product detail: ${error.message}`);
    }

    return data?.[0] || null;
  },
  ['product-by-slug'],
  { revalidate: PRODUCT_REVALIDATE, tags: ['products'] }
);

export async function fetchProductBySlug(productSlug) {
  const safeSlug = String(productSlug || '').trim();

  if (!safeSlug) {
    return null;
  }

  return fetchProductBySlugCached(safeSlug);
}

const fetchProductSkinScoreRowsCached = unstable_cache(
  async (productId) => {
    const supabase = getSupabaseServerClient();
    const { data: rows, error } = await supabase
      .from('product_skin_scores')
      .select('id, product_id, persona_id, score, labels, pros, cons')
      .eq('product_id', productId)
      .order('score', { ascending: false });

    if (error) {
      throw new Error(`Could not load product skin matches: ${error.message}`);
    }

    return rows || [];
  },
  ['product-skin-score-rows'],
  { revalidate: PRODUCT_REVALIDATE, tags: ['product-skin-scores'] }
);

// contextRouteSlug '*' returns every skin context (each flagged isDefault or not),
// so a prebuilt product page can show whichever ?context= a visitor arrives with.
async function fetchProductSkinMatches(productId, contextRouteSlug = '') {
  const includeAllContexts = contextRouteSlug === '*';
  const [rows, personas, contextPersona] = await Promise.all([
    fetchProductSkinScoreRowsCached(productId),
    fetchAllPersonas(),
    contextRouteSlug && !includeAllContexts ? fetchPersonaByRouteSlug(contextRouteSlug).catch(() => null) : null
  ]);

  const contextPersonaId = contextPersona?.id || '';
  const defaultPersonaIds = new Set(SKIN_CONTEXT_PERSONA_IDS);
  const allowedPersonaIds = new Set(
    contextPersonaId ? [contextPersonaId, ...SKIN_CONTEXT_PERSONA_IDS] : SKIN_CONTEXT_PERSONA_IDS
  );
  const personaMap = new Map((personas || []).map((persona) => [persona.id, persona]));

  return rows
    .filter((row) => includeAllContexts || allowedPersonaIds.has(row.persona_id))
    .map((row) => {
      const persona = personaMap.get(row.persona_id) || null;
      const score = normalizeScore(row.score);

      return {
        id: row.id,
        personaId: row.persona_id,
        score,
        matchPercent: Math.max(0, Math.min(100, Math.round(score <= 10 ? score * 10 : score))),
        labels: toList(row.labels, ['Daily Wear', 'Broad Spectrum', 'General Use']),
        pros: toList(row.pros, ['Comfortable wear', 'Daily-use friendly', 'Balanced texture']),
        cons: toList(row.cons, ['Patch test advised', 'May vary by routine', 'Reapplication still required']),
        pageSlug: persona?.page_slug || null,
        routeSlug: persona?.route_slug || null,
        pageHref: buildPersonaPath(persona?.route_slug, persona?.page_slug),
        pageTitle: persona?.page_title || 'Skin Context Match',
        contextLabel: buildPersonaContext(persona),
        tabLabel: getPersonaTabLabel(persona),
        isDefault: defaultPersonaIds.has(row.persona_id)
      };
    })
    .sort((left, right) => {
      if (contextPersonaId) {
        const leftIsContext = left.personaId === contextPersonaId ? 1 : 0;
        const rightIsContext = right.personaId === contextPersonaId ? 1 : 0;

        if (leftIsContext !== rightIsContext) {
          return rightIsContext - leftIsContext;
        }
      }

      const leftOrder = SKIN_CONTEXT_PERSONA_ORDER.get(left.personaId) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = SKIN_CONTEXT_PERSONA_ORDER.get(right.personaId) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}

const fetchProductIngredientsCached = unstable_cache(
  async (productId) => {
    const supabase = getSupabaseServerClient();
    const { data: ingredientRows, error } = await supabase
      .from('product_ingredients')
      .select(
        'id, ingredient_id, raw_ingredient_name, ingredient_position, concentration, is_active, classification_source'
      )
      .eq('product_id', productId)
      .order('ingredient_position', { ascending: true });

    if (error) {
      throw new Error(`Could not load product ingredients: ${error.message}`);
    }

    const ingredientIds = [...new Set((ingredientRows || []).map((row) => row.ingredient_id).filter(Boolean))];
    let ingredientMap = new Map();

    if (ingredientIds.length > 0) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, common_name, active_analysis, inactive_analysis')
        .in('id', ingredientIds);

      if (ingredientsError) {
        throw new Error(`Could not load ingredients metadata: ${ingredientsError.message}`);
      }

      ingredientMap = new Map((ingredients || []).map((ingredient) => [ingredient.id, ingredient]));
    }

    return (ingredientRows || []).map((ingredientRow) => {
      const ingredient = ingredientMap.get(ingredientRow.ingredient_id) || null;
      const analysis = normalizeAnalysis(
        ingredientRow.is_active ? ingredient?.active_analysis : ingredient?.inactive_analysis
      );
      const flags = normalizeFlags(analysis?.flags);
      const shortDescription = buildIngredientSummary(analysis, Boolean(ingredientRow.is_active));
      const detailDescription = buildIngredientDetails(analysis);
      const filterType = String(analysis?.filter_type || '').trim();
      // const protection_spectrums = String(analysis?.protection_spectrums || '').trim();
      const protection_spectrums = Array.isArray(analysis?.protection_spectrums)
        ? analysis.protection_spectrums.join(' / ')   // or ' · '
        : '';
      const category = String(analysis?.category || '').trim();
      const sub_category = String(analysis?.sub_category || '').trim();

      return {
        id: ingredientRow.id,
        ingredientId: ingredient?.id || null,
        name: ingredient?.common_name || ingredientRow.raw_ingredient_name || 'Unnamed ingredient',
        rawName: ingredientRow.raw_ingredient_name || '',
        position: ingredientRow.ingredient_position,
        concentration: ingredientRow.concentration || null,
        isActive: Boolean(ingredientRow.is_active),
        source: formatProductValue(ingredientRow.classification_source, ''),
        filterType,
        protection_spectrums,
        category,
        sub_category,
        shortDescription,
        detailDescription,
        flags,
        isFlagged: flags.length > 0,
        firstFlagDescription: flags[0]?.description || ''
      };
    });
  },
  ['product-ingredients'],
  { revalidate: PRODUCT_REVALIDATE, tags: ['product-ingredients'] }
);

async function fetchProductIngredients(productId) {
  return fetchProductIngredientsCached(productId);
}

const fetchProductEvaluationsCached = unstable_cache(
  async (productId) => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('product_evaluations')
      .select('agent_name, evaluation_data')
      .eq('product_id', productId)
      .in('agent_name', ['light_shield', 'skin_safety', 'pore_and_oil', 'function_experience']);

    if (error) {
      throw new Error(`Could not load product evaluations: ${error.message}`);
    }

    return (data || []).reduce((accumulator, row) => {
      accumulator[row.agent_name] = normalizeJsonObject(row.evaluation_data) || {};
      return accumulator;
    }, {});
  },
  ['product-evaluations'],
  { revalidate: PRODUCT_REVALIDATE, tags: ['product-evaluations'] }
);

async function fetchProductEvaluations(productId) {
  return fetchProductEvaluationsCached(productId);
}

export async function fetchProductDetailPageData(productSlug, contextRouteSlug = '') {
  const productRow = await fetchProductBySlug(productSlug);

  if (!productRow) {
    return null;
  }

  const resolvedProductId = productRow.id;

  const [skinMatchesResult, ingredientsResult, evaluationsResult] = await Promise.allSettled([
    fetchProductSkinMatches(resolvedProductId, contextRouteSlug),
    fetchProductIngredients(resolvedProductId),
    fetchProductEvaluations(resolvedProductId)
  ]);

  const skinMatches = skinMatchesResult.status === 'fulfilled' ? skinMatchesResult.value : [];
  const ingredients = ingredientsResult.status === 'fulfilled' ? ingredientsResult.value : [];
  const evaluations = evaluationsResult.status === 'fulfilled' ? evaluationsResult.value : {};
  const activeIngredients = ingredients.filter((ingredient) => ingredient.isActive);
  const inactiveIngredients = ingredients.filter((ingredient) => !ingredient.isActive);

  return {
    product: normalizeProductDetail(productRow),
    skinMatches,
    evaluations,
    activeIngredients,
    inactiveIngredients,
    ingredientCount: ingredients.length
  };
}

function buildAlternates(pathname) {
  const canonical = String(pathname || '/').trim() || '/';

  return {
    canonical,
    languages: {
      'en-IN': canonical,
      'x-default': canonical
    }
  };
}

function toAbsoluteUrl(pathname) {
  const safePath = String(pathname || '/').trim() || '/';
  return safePath.startsWith('http') ? safePath : `${SITE_URL}${safePath}`;
}

function formatSchemaScore(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return `${numericValue.toFixed(0)}/100`;
}

function buildStructuredProductEntry(product, { position = 1, scoreLabel = 'Overall Score' } = {}) {
  const pathname = product?.productSlug ? `/sunscreens/${product.productSlug}` : '/sunscreens';
  const fullName =
    [String(product?.brandName || '').trim(), String(product?.productName || '').trim()]
      .filter(Boolean)
      .join(' ')
      .trim() || String(product?.productName || '').trim() || 'Sunscreen';
  const description =
    String(product?.pros?.[0] || '').trim() ||
    String(product?.skinFitText || '').trim() ||
    'Detailed sunscreen recommendation with formula analysis and scoring.';
  const additionalProperty = [
    product?.score || product?.score === 0
      ? {
          '@type': 'PropertyValue',
          name: scoreLabel,
          value: formatSchemaScore(product.score)
        }
      : null,
    String(product?.filterType || '').trim() && product.filterType !== 'Filter Type N/A'
      ? {
          '@type': 'PropertyValue',
          name: 'Filter Type',
          value: product.filterType
        }
      : null,
    String(product?.productFormat || '').trim() && product.productFormat !== 'Format N/A'
      ? {
          '@type': 'PropertyValue',
          name: 'Product Format',
          value: product.productFormat
        }
      : null,
    String(product?.spfRating || '').trim() && product.spfRating !== 'SPF N/A'
      ? {
          '@type': 'PropertyValue',
          name: 'SPF',
          value: product.spfRating
        }
      : null,
    String(product?.paRating || '').trim() && product.paRating !== 'PA N/A'
      ? {
          '@type': 'PropertyValue',
          name: 'PA Rating',
          value: product.paRating
        }
      : null
  ].filter(Boolean);

  return {
    '@type': 'ListItem',
    position,
    item: {
      '@type': 'Product',
      name: fullName,
      description,
      brand: {
        '@type': 'Brand',
        name: String(product?.brandName || '').trim() || 'Unknown Brand'
      },
      ...(Array.isArray(product?.imageLinks) && product.imageLinks.length > 0
        ? { image: product.imageLinks[0] }
        : {}),
      url: toAbsoluteUrl(pathname),
      ...(additionalProperty.length > 0 ? { additionalProperty } : {})
    }
  };
}

export function getListingJsonLd({
  title,
  description,
  pathname,
  products,
  startPosition = 1,
  scoreLabel = 'Overall Score'
}) {
  const safeProducts = Array.isArray(products) ? products : [];

  if (safeProducts.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: String(title || '').trim() || SITE_NAME,
    description: String(description || '').trim() || DEFAULT_DESCRIPTION,
    url: toAbsoluteUrl(pathname),
    numberOfItems: safeProducts.length,
    itemListElement: safeProducts.map((product, index) =>
      buildStructuredProductEntry(product, {
        position: startPosition + index,
        scoreLabel
      })
    )
  };
}

export function getDefaultMetadata() {
  return {
    metadataBase: new URL(SITE_URL),
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    alternates: buildAlternates('/'),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      url: SITE_URL,
      images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE]
    },
    icons: {
      icon: '/ryfoya-favicon.png'
    }
  };
}

export function getListingMetadata({ persona = null, brand = null, productFormat = null, filterType = null }) {
  const title = buildListingTitle({ persona, brand, productFormat, filterType }) || SITE_NAME;
  const description = buildListingDescription({ persona, brand, productFormat, filterType }) || DEFAULT_DESCRIPTION;
  const pathname = buildListingPath({
    skinContextRouteSlug: persona?.route_slug || '',
    brandSlug: brand?.slug || '',
    productFormatSlug: productFormat?.slug || '',
    filterTypeSlug: filterType?.slug || '',
    persona
  });

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: buildAlternates(pathname),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}${pathname}`,
      images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [DEFAULT_OG_IMAGE]
    }
  };
}

export function getSunscreensDescription() {
  return buildListingDescription({});
}

export function getSunscreensMetadata() {
  const title = 'Best Sunscreens';
  const description = getSunscreensDescription();

  return {
    title,
    description,
    alternates: buildAlternates('/sunscreens'),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: `${SITE_URL}/sunscreens`,
      images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    }
  };
}

export function getProductMetadata(product) {
  const brandName = product?.brandName || product?.brand_name || '';
  const productName = product?.productName || product?.product_name || '';
  const displayProductName = formatProductDisplayName(productName);
  const productSlug = product?.productSlug || product?.slug || '';
  const fullName =
    brandName && displayProductName
      ? `${brandName} ${displayProductName}`
      : displayProductName
        ? `${displayProductName}`
        : '';
  const title = fullName
    ? `${fullName} ${PRODUCT_DETAIL_TITLE_SUFFIX}`
    : `Sunscreen Details ${PRODUCT_DETAIL_TITLE_SUFFIX}`;
  const description = fullName
    ? `${fullName} ingredients, explained simply so you can understand the formula before choosing it for your skin.`
    : 'Sunscreen ingredients, explained simply so you can understand the formula before choosing it for your skin.';
  const pathname = productSlug ? `/sunscreens/${productSlug}` : '/sunscreens';

  return {
    title,
    description,
    alternates: buildAlternates(pathname),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: `${SITE_URL}${pathname}`,
      images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    }
  };
}

export {
  buildAlternates,
  buildListingPath,
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SITEMAP_CHUNK_SIZE,
  SITEMAP_FAMILIES
};
