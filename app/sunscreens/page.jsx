import Header from '../../src/components/Header';
import PersonaChoiceSidebar from '../../src/components/PersonaChoiceSidebar';
import ProductCard from '../../src/components/ProductCard';
import {
  fetchAllPersonas,
  fetchOverallSunscreens,
  getSunscreensMetadata
} from '../../src/lib/site-data';

export const dynamic = 'force-dynamic';

export const metadata = getSunscreensMetadata();

export default async function SunscreensPage() {
  const [{ products, formulasReviewed }, personas] = await Promise.all([
    fetchOverallSunscreens(),
    fetchAllPersonas()
  ]);
  const pagePersona = {
    page_title: 'Best Sunscreens',
    page_description:
      'Browse the strongest overall sunscreen picks ranked by overall score, with product-level pros and cons.'
  };

  return (
    <>
      <Header persona={pagePersona} formulasReviewed={formulasReviewed} />
      <main className="listing-layout listing-layout--full">
        <PersonaChoiceSidebar pages={personas} currentPersona={null} />
        <div className="listing-content">
          {products.length > 0 ? (
            <div className="card-grid">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id || `${product.productName}-${index}`}
                  product={product}
                  rank={index + 1}
                />
              ))}
            </div>
          ) : (
            <p style={{ padding: '40px 0' }}>No overall sunscreen rankings are available yet.</p>
          )}
        </div>
      </main>
    </>
  );
}
