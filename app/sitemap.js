import { fetchAllPersonas, SITE_URL } from '../src/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const personas = await fetchAllPersonas();

  return [
    {
      url: SITE_URL,
      lastModified: new Date()
    },
    {
      url: `${SITE_URL}/sunscreens`,
      lastModified: new Date()
    },
    ...personas.map((persona) => ({
      url: `${SITE_URL}/${persona.page_slug}`,
      lastModified: persona.created_at || new Date()
    }))
  ];
}
