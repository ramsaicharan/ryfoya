import { SITE_URL } from '../src/lib/site-data';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/internal'
      }
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
