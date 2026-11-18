import Header from '../../src/components/Header';
import JsonLd from '../../src/components/JsonLd';
import ListingPager from '../../src/components/ListingPager';
import PersonaChoiceSidebar from '../../src/components/PersonaChoiceSidebar';
import ProductCard from '../../src/components/ProductCard';
import {
  fetchListingFiltersData,
  fetchOverallSunscreens,
  getListingJsonLd,
  getSunscreensDescription,
  getSunscreensMetadata
} from '../../src/lib/site-data';

export const metadata = getSunscreensMetadata();
const ALL_PRODUCTS = 1000;

export default async function SunscreensPage() {
  const [{ products, formulasReviewed }, filterData] = await Promise.all([
    fetchOverallSunscreens(1, ALL_PRODUCTS),
    fetchListingFiltersData()
  ]);
  const pagePersona = {
    page_title: 'Best Sunscreens',
    page_description: getSunscreensDescription()
  };
  const listingJsonLd = getListingJsonLd({
    title: pagePersona.page_title,
    description: pagePersona.page_description,
    pathname: '/sunscreens',
    products,
    startPosition: 1,
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
              <ListingPager pageSize={24}>
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id || `${product.productName}-${index}`}
                    product={product}
                    rank={index + 1}
                  />
                ))}
              </ListingPager>
            </>
          ) : (
            <p style={{ padding: '40px 0' }}>No overall sunscreen rankings are available yet.</p>
          )}
        </div>
      </main>
    </>
  );
}
