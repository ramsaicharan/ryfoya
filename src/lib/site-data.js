import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseServerClient } from './supabaseServer';

const SITE_NAME = 'Ryfoya';
const SITE_URL = 'https://ryfoya.com';
const DEFAULT_DESCRIPTION = 'Ryfoya helps you browse persona-driven sunscreen recommendation pages.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/ryfoya-logo.png`;
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

function buildPersonaPath(routeSlug, pageSlug = '') {
  const safeRouteSlug = String(routeSlug || '').trim();
  if (safeRouteSlug) {
    return `/sunscreens/best/${safeRouteSlug}`;
  }

  const safePageSlug = String(pageSlug || '').trim();
  return safePageSlug ? `/${safePageSlug}` : '/sunscreens';
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

const fetchAllPersonasCached = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('target_personas')
      .select('id, page_slug, route_slug, page_title, created_at, skin_type, skin_condition, age, skin_tone')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Could not load personas: ${error.message}`);
    }

    return data || [];
  },
  ['all-personas'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['personas'] }
);

export async function fetchAllPersonas() {
  return fetchAllPersonasCached();
}

const fetchPersonaBySlugCached = unstable_cache(
  async (pageSlug) => {
    const supabase = getSupabaseServerClient();
    const { data: personaRows, error } = await supabase
      .from('target_personas')
      .select(
        'id, skin_type, skin_condition, age, skin_tone, page_title, page_description, meta_description, page_slug, route_slug'
      )
      .eq('page_slug', pageSlug)
      .limit(2);

    if (error) {
      throw new Error(`Could not load page persona: ${error.message}`);
    }

    if (!personaRows || personaRows.length === 0) {
      return null;
    }

    if (personaRows.length > 1) {
      throw new Error(`Multiple target_personas rows found for page_slug "${pageSlug}". Make page_slug unique.`);
    }

    return personaRows[0];
  },
  ['persona-by-slug'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['personas'] }
);

export async function fetchPersonaBySlug(pageSlug) {
  const safeSlug = String(pageSlug || '').trim();

  if (!safeSlug) {
    return null;
  }

  return fetchPersonaBySlugCached(safeSlug);
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

  return fetchPersonaByRouteSlugCached(safeRouteSlug);
}

const fetchProductsForPersonaPageCached = unstable_cache(
  async (personaId, requestedPage = 1, requestedPageSize = DEFAULT_PRODUCTS_PER_PAGE) => {
    const currentPage = normalizePageNumber(requestedPage);
    const pageSize = normalizePageSize(requestedPageSize);
    const supabase = getSupabaseServerClient();
    const baseSelect = 'id, product_id, persona_id, score, labels, pros, cons';
    const productFields =
      'id, slug, product_name, brand_name, product_buy_link, spf_rating, pa_rating, ph_value, filter_type, product_format, image_links';
    const selectWithNamedFk = `${baseSelect}, product:products!product_skin_scores_product_id_fkey(${productFields})`;
    const selectWithDefaultRelation = `${baseSelect}, products(${productFields})`;

    const { count, error: countError } = await supabase
      .from('product_skin_scores')
      .select('id', { count: 'exact', head: true })
      .eq('persona_id', personaId);

    if (countError) {
      throw new Error(`Could not count persona products: ${countError.message}`);
    }

    const pagination = buildPaginationData(count, currentPage, pageSize);
    const from = (pagination.currentPage - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    let result = await supabase
      .from('product_skin_scores')
      .select(selectWithNamedFk)
      .eq('persona_id', personaId)
      .order('score', { ascending: false })
      .range(from, to);

    if (result.error) {
      result = await supabase
        .from('product_skin_scores')
        .select(selectWithDefaultRelation)
        .eq('persona_id', personaId)
        .order('score', { ascending: false })
        .range(from, to);
    }

    if (result.error) {
      throw new Error(`Could not load products: ${result.error.message}`);
    }

    return {
      rows: result.data || [],
      ...pagination
    };
  },
  ['products-for-persona-page'],
  { revalidate: LISTINGS_REVALIDATE, tags: ['persona-products'] }
);

const fetchPageDataByRouteSlugCached = unstable_cache(
  async (routeSlug, requestedPage = 1, requestedPageSize = DEFAULT_PRODUCTS_PER_PAGE) => {
    const persona = await fetchPersonaByRouteSlug(routeSlug);

    if (!persona) {
      return null;
    }

    const result = await fetchProductsForPersonaPageCached(persona.id, requestedPage, requestedPageSize);
    const products = result.rows.map((row) => normalizeRow(row, persona)).sort((a, b) => b.score - a.score);
    const formulasReviewed = result.totalCount || new Set(products.map((item) => item.productId || item.id)).size || 48;

    return {
      persona,
      products,
      formulasReviewed,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      pageSize: result.pageSize
    };
  },
  ['page-data-by-route-slug'],
  { revalidate: LISTINGS_REVALIDATE, tags: ['persona-pages'] }
);

export async function fetchPageDataByRouteSlug(
  routeSlug,
  requestedPage = 1,
  requestedPageSize = DEFAULT_PRODUCTS_PER_PAGE
) {
  const safeRouteSlug = String(routeSlug || '').trim();

  if (!safeRouteSlug) {
    return null;
  }

  return fetchPageDataByRouteSlugCached(
    safeRouteSlug,
    normalizePageNumber(requestedPage),
    normalizePageSize(requestedPageSize)
  );
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
        'id, slug, product_name, brand_name, product_buy_link, spf_rating, pa_rating, filter_type, product_format, eco_reef_safety, overall_score, overall_pros, overall_cons, image_links'
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
        'id, slug, product_name, brand_name, product_buy_link, spf_rating, pa_rating, total_ingredients, sweat_resistance, ph_value, filter_type, product_format, eco_reef_safety, nano_status, vegan, cruelty_free, overall_score, overall_pros, overall_cons, image_links, created_at'
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

async function fetchProductSkinMatches(productId, contextRouteSlug = '') {
  const [rows, personas, contextPersona] = await Promise.all([
    fetchProductSkinScoreRowsCached(productId),
    fetchAllPersonas(),
    contextRouteSlug ? fetchPersonaByRouteSlug(contextRouteSlug).catch(() => null) : null
  ]);

  const contextPersonaId = contextPersona?.id || '';
  const allowedPersonaIds = new Set(
    contextPersonaId ? [contextPersonaId, ...SKIN_CONTEXT_PERSONA_IDS] : SKIN_CONTEXT_PERSONA_IDS
  );
  const personaMap = new Map((personas || []).map((persona) => [persona.id, persona]));

  return rows
    .filter((row) => allowedPersonaIds.has(row.persona_id))
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
        tabLabel: getPersonaTabLabel(persona)
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

      return {
        id: ingredientRow.id,
        ingredientId: ingredient?.id || null,
        name: ingredient?.common_name || ingredientRow.raw_ingredient_name || 'Unnamed ingredient',
        rawName: ingredientRow.raw_ingredient_name || '',
        position: ingredientRow.ingredient_position,
        concentration: ingredientRow.concentration || null,
        isActive: Boolean(ingredientRow.is_active),
        source: formatProductValue(ingredientRow.classification_source, ''),
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

const fetchAllProductRoutesCached = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('products')
      .select('slug, created_at')
      .not('slug', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Could not load product routes: ${error.message}`);
    }

    return data || [];
  },
  ['all-product-routes'],
  { revalidate: PERSONAS_REVALIDATE, tags: ['products'] }
);

export async function fetchAllProductRoutes() {
  return fetchAllProductRoutesCached();
}

export function getDefaultMetadata() {
  return {
    metadataBase: new URL(SITE_URL),
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: '/'
    },
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

export function getPersonaMetadata(persona) {
  const title = persona?.page_title || SITE_NAME;
  const description = persona?.meta_description || persona?.page_description || DEFAULT_DESCRIPTION;
  const pathname = buildPersonaPath(persona?.route_slug, persona?.page_slug);

  return {
    title,
    description,
    alternates: {
      canonical: pathname
    },
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

export function getSunscreensMetadata() {
  const title = 'Best Sunscreens';
  const description =
    'Browse the highest-ranked sunscreens based on overall score, overall pros, and overall cons.';

  return {
    title,
    description,
    alternates: {
      canonical: '/sunscreens'
    },
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
  const productSlug = product?.productSlug || product?.slug || '';
  const overallPros = Array.isArray(product?.overallPros)
    ? product.overallPros
    : Array.isArray(product?.overall_pros)
      ? product.overall_pros
      : [];
  const fullName =
  brandName && productName
    ? `${brandName} ${productName}`
    : productName
      ? `${productName}`
      : '';
  const title = fullName ? `${fullName} | Ryfoya` : 'Sunscreen Details | Ryfoya';
  const description =
    overallPros[0] ||
    'Detailed sunscreen breakdown covering formula facts, skin-context matches, and ingredient data.';
  const pathname = productSlug ? `/sunscreens/${productSlug}` : '/sunscreens';

  return {
    title,
    description,
    alternates: {
      canonical: pathname
    },
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

export { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL };
