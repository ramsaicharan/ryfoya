import Header from '../../src/components/Header';
import ProductCard from '../../src/components/ProductCard';
import { fetchOverallSunscreens, getSunscreensMetadata } from '../../src/lib/site-data';

export const dynamic = 'force-dynamic';

export const metadata = getSunscreensMetadata();

export default async function SunscreensPage() {
  const { products, formulasReviewed } = await fetchOverallSunscreens();
  const pagePersona = {
    page_title: 'Best Sunscreens',
    page_description:
      'Browse the strongest overall sunscreen picks ranked by overall score, with product-level pros and cons.'
  };

  return (
    <>
      <Header persona={pagePersona} formulasReviewed={formulasReviewed} />
      <main className="wrap">
        {products.length > 0 ? (
          <div className="card-grid">
            {products.map((product, index) => (
              <ProductCard key={product.id || `${product.productName}-${index}`} product={product} rank={index + 1} />
            ))}
          </div>
        ) : (
          <p style={{ padding: '40px 0' }}>No overall sunscreen rankings are available yet.</p>
        )}
      </main>
    </>
  );
}
