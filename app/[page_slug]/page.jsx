import { notFound } from 'next/navigation';
import Header from '../../src/components/Header';
import ProductCard from '../../src/components/ProductCard';
import { fetchPageData, fetchPersonaBySlug, getPersonaMetadata } from '../../src/lib/site-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const persona = await fetchPersonaBySlug(params.page_slug);

  if (!persona) {
    return {
      title: 'Page Not Found'
    };
  }

  return getPersonaMetadata(persona);
}

export default async function PersonaPage({ params }) {
  const pageData = await fetchPageData(params.page_slug);

  if (!pageData) {
    notFound();
  }

  const { persona, products, formulasReviewed } = pageData;

  return (
    <>
      <Header persona={persona} formulasReviewed={formulasReviewed} />
      <main className="wrap">
        {products.length > 0 ? (
          <div className="card-grid">
            {products.map((product, index) => (
              <ProductCard key={product.id || `${product.productName}-${index}`} product={product} rank={index + 1} />
            ))}
          </div>
        ) : (
          <p style={{ padding: '40px 0' }}>No products matched this page persona.</p>
        )}
      </main>
    </>
  );
}
