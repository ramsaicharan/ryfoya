import { notFound, permanentRedirect } from 'next/navigation';
import { fetchAllPersonas, fetchPersonaBySlug, getPersonaMetadata } from '../../src/lib/site-data';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const personas = await fetchAllPersonas().catch(() => []);

  return personas
    .map((persona) => String(persona.page_slug || '').trim())
    .filter(Boolean)
    .map((page_slug) => ({ page_slug }));
}

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

export default async function PersonaPage({ params, searchParams }) {
  const { page_slug } = await params;
  const persona = await fetchPersonaBySlug(page_slug);

  if (!persona?.route_slug) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const redirectUrl = new URL(`/sunscreens/best/${persona.route_slug}`, 'https://ryfoya.com');
  const pageValue = String(resolvedSearchParams?.page || '').trim();

  if (pageValue) {
    redirectUrl.searchParams.set('page', pageValue);
  }

  permanentRedirect(`${redirectUrl.pathname}${redirectUrl.search}`);
}
