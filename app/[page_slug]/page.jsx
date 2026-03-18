import { notFound } from 'next/navigation';
import Header from '../../src/components/Header';
import PersonaChoiceSidebar from '../../src/components/PersonaChoiceSidebar';
import ProductCard from '../../src/components/ProductCard';
import {
  fetchAllPersonas,
  fetchPageData,
  fetchPersonaBySlug,
  getPersonaMetadata
} from '../../src/lib/site-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { page_slug } = await params;
  const persona = await fetchPersonaBySlug(page_slug);

  if (!persona) {
    return {
      title: 'Page Not Found'
    };
  }

  return getPersonaMetadata(persona);
}

export default async function PersonaPage({ params }) {
  const { page_slug } = await params;
  const [pageData, personas] = await Promise.all([fetchPageData(page_slug), fetchAllPersonas()]);

  if (!pageData) {
    notFound();
  }

  const { persona, products, formulasReviewed } = pageData;

  return (
    <>
      <Header persona={persona} formulasReviewed={formulasReviewed} />
      <main className="listing-layout listing-layout--full">
        <PersonaChoiceSidebar pages={personas} currentPersona={persona} />
        <div className="listing-content">
          {products.length > 0 ? (
            <div className="card-grid">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id || `${product.productName}-${index}`}
                  product={{ ...product, contextPageSlug: persona.page_slug }}
                  rank={index + 1}
                />
              ))}
            </div>
          ) : (
            <p style={{ padding: '40px 0' }}>No products matched this page persona.</p>
          )}
        </div>
      </main>
    </>
  );
}
