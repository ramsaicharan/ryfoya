import { notFound } from 'next/navigation';
import Header from '../../../../src/components/Header';
import Pagination from '../../../../src/components/Pagination';
import PersonaChoiceSidebar from '../../../../src/components/PersonaChoiceSidebar';
import ProductCard from '../../../../src/components/ProductCard';
import {
  fetchAllPersonas,
  fetchPageDataByRouteSlug,
  fetchPersonaByRouteSlug,
  getPersonaMetadata
} from '../../../../src/lib/site-data';

export const dynamic = 'force-dynamic';

function parsePageParam(value) {
  const page = Number.parseInt(String(value || '1'), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function generateMetadata({ params }) {
  const { route_slug } = await params;
  const persona = await fetchPersonaByRouteSlug(route_slug);

  if (!persona) {
    return {
      title: 'Page Not Found'
    };
  }

  return getPersonaMetadata(persona);
}

export default async function PersonaRoutePage({ params, searchParams }) {
  const { route_slug } = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageParam(resolvedSearchParams?.page);
  const [pageData, personas] = await Promise.all([
    fetchPageDataByRouteSlug(route_slug, currentPage),
    fetchAllPersonas()
  ]);

  if (!pageData) {
    notFound();
  }

  const { persona, products, formulasReviewed, totalPages, currentPage: resolvedPage } = pageData;
  const filterPages = personas.map((page) => ({
    id: page.id,
    page_slug: page.page_slug,
    route_slug: page.route_slug,
    skin_type: page.skin_type,
    skin_condition: page.skin_condition,
    age: page.age,
    skin_tone: page.skin_tone
  }));

  return (
    <>
      <Header persona={persona} formulasReviewed={formulasReviewed} />
      <main className="listing-layout listing-layout--full">
        <PersonaChoiceSidebar pages={filterPages} currentPersona={persona} />
        <div className="listing-content">
          {products.length > 0 ? (
            <>
              <div className="card-grid">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id || `${product.productName}-${index}`}
                    product={{ ...product, contextRouteSlug: persona.route_slug }}
                    rank={(resolvedPage - 1) * 24 + index + 1}
                  />
                ))}
              </div>
              <Pagination
                basePath={`/sunscreens/best/${persona.route_slug}`}
                currentPage={resolvedPage}
                totalPages={totalPages}
              />
            </>
          ) : (
            <p style={{ padding: '40px 0' }}>No products matched this page persona.</p>
          )}
        </div>
      </main>
    </>
  );
}
