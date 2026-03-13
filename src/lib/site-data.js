import 'server-only';
import { getSupabaseServerClient } from './supabaseServer';

const SITE_NAME = 'Ryfoya';
const SITE_URL = 'https://ryfoya.com';
const DEFAULT_DESCRIPTION = 'Ryfoya helps you browse persona-driven sunscreen recommendation pages.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/ryfoya-logo.png`;

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

function buildSkinFitText(parts, fallback) {
  const values = parts
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return values.join(' · ') || fallback;
}

export function normalizeRow(row, persona) {
  const relationProduct = row.product ?? row.products ?? null;
  const product = Array.isArray(relationProduct) ? relationProduct[0] : relationProduct;
  const labels = toList(row.labels, ['Dermatologist Approved', 'Broad Spectrum', 'Daily Use']);
  const pros = toList(row.pros, ['Lightweight texture', 'Strong UV protection', 'Good daily wear']);
  const cons = toList(row.cons, ['Can feel rich', 'May need reapplication', 'Limited stock']);
  const score = Number(row.score || 0);

  const priceNow = seededPrice(row.product_id || product?.id || product?.product_name);
  const priceWas = priceNow + 10;
  const savePercent = Math.round(((priceWas - priceNow) / priceWas) * 100);

  return {
    id: row.id,
    productId: row.product_id || product?.id,
    personaId: row.persona_id || persona?.id,
    score,
    productName: product?.product_name || 'Unnamed Product',
    brandName: product?.brand_name || 'Unknown Brand',
    spfRating: product?.spf_rating || 'SPF N/A',
    paRating: product?.pa_rating || 'PA N/A',
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
  const score = Number(product.overall_score || 0);
  const pros = toList(product.overall_pros, ['Strong protection', 'Comfortable wear', 'Reliable daily use']);
  const cons = toList(product.overall_cons, ['Limited data available', 'May not suit every routine', 'Patch test advised']);

  return {
    id: product.id,
    productId: product.id,
    score,
    productName: product.product_name || 'Unnamed Product',
    brandName: product.brand_name || 'Unknown Brand',
    spfRating: product.spf_rating || 'SPF N/A',
    paRating: product.pa_rating || 'PA N/A',
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

export async function fetchAllPersonas() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('target_personas')
    .select(
      'id, page_slug, page_title, page_description, meta_description, created_at, skin_type, skin_condition, age, skin_tone'
    )
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Could not load homepage links: ${error.message}`);
  }

  return data || [];
}

export async function fetchPersonaBySlug(pageSlug) {
  const supabase = getSupabaseServerClient();
  const { data: personaRows, error } = await supabase
    .from('target_personas')
    .select(
      'id, skin_type, skin_condition, age, skin_tone, page_title, page_description, meta_description, page_slug'
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
}

export async function fetchProductsForPersona(personaId) {
  const supabase = getSupabaseServerClient();
  const baseSelect = 'id, product_id, persona_id, score, labels, pros, cons';
  const productFields =
    'id, product_name, brand_name, spf_rating, pa_rating, ph_value, filter_type, product_format';
  const selectWithNamedFk = `${baseSelect}, product:products!product_skin_scores_product_id_fkey(${productFields})`;
  const selectWithDefaultRelation = `${baseSelect}, products(${productFields})`;

  let result = await supabase
    .from('product_skin_scores')
    .select(selectWithNamedFk)
    .eq('persona_id', personaId)
    .order('score', { ascending: false });

  if (result.error) {
    result = await supabase
      .from('product_skin_scores')
      .select(selectWithDefaultRelation)
      .eq('persona_id', personaId)
      .order('score', { ascending: false });
  }

  if (result.error) {
    throw new Error(`Could not load products: ${result.error.message}`);
  }

  return result.data || [];
}

export async function fetchPageData(pageSlug) {
  const persona = await fetchPersonaBySlug(pageSlug);

  if (!persona) {
    return null;
  }

  const rows = await fetchProductsForPersona(persona.id);
  const products = rows.map((row) => normalizeRow(row, persona)).sort((a, b) => b.score - a.score);
  const formulasReviewed = new Set(products.map((item) => item.productId || item.id)).size || 48;

  return {
    persona,
    products,
    formulasReviewed
  };
}

export async function fetchOverallSunscreens() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, product_name, brand_name, spf_rating, pa_rating, filter_type, product_format, eco_reef_safety, overall_score, overall_pros, overall_cons'
    )
    .not('overall_score', 'is', null)
    .order('overall_score', { ascending: false });

  if (error) {
    throw new Error(`Could not load overall sunscreens: ${error.message}`);
  }

  const products = (data || []).map(normalizeOverallProduct);
  const formulasReviewed = products.length || 48;

  return {
    products,
    formulasReviewed
  };
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
  const pathname = persona?.page_slug ? `/${persona.page_slug}` : '/';

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

export { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL };
