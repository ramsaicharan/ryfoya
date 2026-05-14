import Header from '../../src/components/Header';
import JsonLd from '../../src/components/JsonLd';
import Pagination from '../../src/components/Pagination';
import PersonaChoiceSidebar from '../../src/components/PersonaChoiceSidebar';
import ProductCard from '../../src/components/ProductCard';
import {
  fetchListingFiltersData,
  fetchOverallSunscreens,
  getListingJsonLd,
  getSunscreensMetadata
} from '../../src/lib/site-data';

export const revalidate = 900;

export const metadata = getSunscreensMetadata();

function parsePageParam(value) {
  const page = Number.parseInt(String(value || '1'), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export default async function SunscreensPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageParam(resolvedSearchParams?.page);
  const [{ products, formulasReviewed, totalPages, currentPage: resolvedPage }, filterData] = await Promise.all([
    fetchOverallSunscreens(currentPage),
    fetchListingFiltersData()
  ]);
  const pagePersona = {
    page_title: 'Best Sunscreens',
    page_description:
      'Browse the strongest overall sunscreen picks ranked by overall score, with product-level pros and cons.'
  };
  const listingJsonLd = getListingJsonLd({
    title: pagePersona.page_title,
    description: pagePersona.page_description,
    pathname: '/sunscreens',
    products,
    startPosition: (resolvedPage - 1) * 24 + 1,
    scoreLabel: 'Overall Score'
  });

  return (
    <>
      <JsonLd data={listingJsonLd} />
      <Header persona={pagePersona} formulasReviewed={formulasReviewed} />
      <main className="listing-layout listing-layout--full">
        <PersonaChoiceSidebar
          filterData={filterData}
          currentFilters={{
            skinContextRouteSlug: '',
            brandSlug: '',
            productFormatSlug: '',
            filterTypeSlug: ''
          }}
        />
        <div className="listing-content">
          {products.length > 0 ? (
            <>
              <div className="card-grid">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id || `${product.productName}-${index}`}
                    product={product}
                    rank={(resolvedPage - 1) * 24 + index + 1}
                  />
                ))}
              </div>
              <Pagination basePath="/sunscreens" currentPage={resolvedPage} totalPages={totalPages} />
            </>
          ) : (
            <p style={{ padding: '40px 0' }}>No overall sunscreen rankings are available yet.</p>
          )}
        </div>
      </main>
    </>
  );
}
