import { notFound } from 'next/navigation';
import Header from '../../../../src/components/Header';
import Pagination from '../../../../src/components/Pagination';
import PersonaChoiceSidebar from '../../../../src/components/PersonaChoiceSidebar';
import ProductCard from '../../../../src/components/ProductCard';
import {
  fetchBrandBySlug,
  fetchFilterTypeBySlug,
  fetchListingFiltersData,
  fetchListingPageData,
  fetchPersonaByRouteSlug,
  fetchProductFormatBySlug,
  getListingMetadata
} from '../../../../src/lib/site-data';

export const dynamic = 'force-dynamic';

function parsePageParam(value) {
  const page = Number.parseInt(String(value || '1'), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseListingSegments(segments) {
  const safeSegments = Array.isArray(segments)
    ? segments.map((segment) => String(segment || '').trim()).filter(Boolean)
    : [];

  if (safeSegments.length === 0) {
    return null;
  }

  const [first, second, third, fourth, fifth, sixth, seventh] = safeSegments;

  if (first === 'brand') {
    if (safeSegments.length === 2) {
      return { brandSlug: second };
    }

    if (safeSegments.length === 3) {
      return { brandSlug: second, skinContextRouteSlug: third };
    }

    if (safeSegments.length === 4 && third === 'format') {
      return { brandSlug: second, productFormatSlug: fourth };
    }

    if (safeSegments.length === 5 && third === 'format') {
      return { brandSlug: second, productFormatSlug: fourth, skinContextRouteSlug: fifth };
    }

    return null;
  }

  if (first === 'format') {
    if (safeSegments.length === 2) {
      return { productFormatSlug: second };
    }

    if (safeSegments.length === 3) {
      return { productFormatSlug: second, skinContextRouteSlug: third };
    }

    if (safeSegments.length === 5 && fourth === 'brand') {
      return { productFormatSlug: second, skinContextRouteSlug: third, brandSlug: fifth };
    }

    return null;
  }

  if (first === 'filter') {
    if (safeSegments.length === 2) {
      return { filterTypeSlug: second };
    }

    if (safeSegments.length === 4 && third === 'brand') {
      return { filterTypeSlug: second, brandSlug: fourth };
    }

    if (safeSegments.length === 5 && third === 'brand') {
      return { filterTypeSlug: second, brandSlug: fourth, skinContextRouteSlug: fifth };
    }

    if (safeSegments.length === 6 && third === 'brand' && fifth === 'format') {
      return { filterTypeSlug: second, brandSlug: fourth, productFormatSlug: sixth };
    }

    if (safeSegments.length === 7 && third === 'brand' && fifth === 'format') {
      return { filterTypeSlug: second, brandSlug: fourth, productFormatSlug: sixth, skinContextRouteSlug: seventh };
    }

    if (safeSegments.length === 3) {
      return { filterTypeSlug: second, skinContextRouteSlug: third };
    }

    if (safeSegments.length === 5 && fourth === 'brand') {
      return { filterTypeSlug: second, skinContextRouteSlug: third, brandSlug: fifth };
    }

    return null;
  }

  if (safeSegments.length === 1) {
    return { skinContextRouteSlug: first };
  }

  if (safeSegments.length === 3 && second === 'brand') {
    return { skinContextRouteSlug: first, brandSlug: third };
  }

  return null;
}

async function resolveListingEntities(criteria) {
  const safeCriteria = criteria || {};
  const [persona, brand, productFormat, filterType] = await Promise.all([
    safeCriteria.skinContextRouteSlug ? fetchPersonaByRouteSlug(safeCriteria.skinContextRouteSlug) : Promise.resolve(null),
    safeCriteria.brandSlug ? fetchBrandBySlug(safeCriteria.brandSlug) : Promise.resolve(null),
    safeCriteria.productFormatSlug ? fetchProductFormatBySlug(safeCriteria.productFormatSlug) : Promise.resolve(null),
    safeCriteria.filterTypeSlug ? fetchFilterTypeBySlug(safeCriteria.filterTypeSlug) : Promise.resolve(null)
  ]);

  return { persona, brand, productFormat, filterType };
}

export async function generateMetadata({ params }) {
  const { segments } = await params;
  const criteria = parseListingSegments(segments);

  if (!criteria) {
    return { title: 'Page Not Found' };
  }

  const { persona, brand, productFormat, filterType } = await resolveListingEntities(criteria);

  if (
    (criteria.skinContextRouteSlug && !persona) ||
    (criteria.brandSlug && !brand) ||
    (criteria.productFormatSlug && !productFormat) ||
    (criteria.filterTypeSlug && !filterType)
  ) {
    return { title: 'Page Not Found' };
  }

  return getListingMetadata({ persona, brand, productFormat, filterType });
}

export default async function ListingRoutePage({ params, searchParams }) {
  const { segments } = await params;
  const criteria = parseListingSegments(segments);

  if (!criteria) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageParam(resolvedSearchParams?.page);
  const [pageData, filtersData] = await Promise.all([
    fetchListingPageData(criteria, currentPage),
    fetchListingFiltersData()
  ]);

  if (!pageData) {
    notFound();
  }

  const { persona, products, formulasReviewed, totalPages, currentPage: resolvedPage } = pageData;

  return (
    <>
      <Header persona={persona} formulasReviewed={formulasReviewed} />
      <main className="listing-layout listing-layout--full">
        <PersonaChoiceSidebar
          filterData={filtersData}
          currentFilters={{
            skinContextRouteSlug: criteria.skinContextRouteSlug || '',
            brandSlug: criteria.brandSlug || '',
            productFormatSlug: criteria.productFormatSlug || '',
            filterTypeSlug: criteria.filterTypeSlug || ''
          }}
        />
        <div className="listing-content">
          {products.length > 0 ? (
            <>
              <div className="card-grid">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id || `${product.productName}-${index}`}
                    product={{
                      ...product,
                      contextRouteSlug: criteria.skinContextRouteSlug || ''
                    }}
                    rank={(resolvedPage - 1) * 24 + index + 1}
                  />
                ))}
              </div>
              <Pagination
                basePath={`/${['sunscreens', 'best', ...segments].join('/')}`}
                currentPage={resolvedPage}
                totalPages={totalPages}
              />
            </>
          ) : (
            <p style={{ padding: '40px 0' }}>No products matched this page.</p>
          )}
        </div>
      </main>
    </>
  );
}
