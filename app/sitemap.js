import { fetchAllPersonas, fetchAllProductRoutes, SITE_URL } from '../src/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const personas = await fetchAllPersonas();
  const productRoutes = await fetchAllProductRoutes().catch(() => []);

  return [
    {
      url: SITE_URL,
      lastModified: new Date()
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date()
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: new Date()
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified: new Date()
    },
    {
      url: `${SITE_URL}/sunscreens`,
      lastModified: new Date()
    },
    ...personas
      .filter((persona) => persona.route_slug)
      .map((persona) => ({
      url: `${SITE_URL}/sunscreens/best/${persona.route_slug}`,
      lastModified: persona.created_at || new Date()
    })),
    ...productRoutes.map((product) => ({
      url: `${SITE_URL}/sunscreens/${product.slug}`,
      lastModified: product.created_at || new Date()
    }))
  ];
}
