import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import BrandHeader from '../src/components/BrandHeader';
import Footer from '../src/components/Footer';
import { fetchAllPersonas, getDefaultMetadata } from '../src/lib/site-data';
import { getSupabaseConfig } from '../src/lib/supabaseConfig';
import '../src/styles.css';

export const metadata = getDefaultMetadata();
export const revalidate = 3600;
const GA_MEASUREMENT_ID = 'G-WWN3SR559Q';

export default async function RootLayout({ children }) {
  const pages = await fetchAllPersonas()
    .then((rows) =>
      rows.map((page) => ({
        id: page.id,
        page_slug: page.page_slug,
        route_slug: page.route_slug,
        skin_type: page.skin_type,
        skin_condition: page.skin_condition,
        age: page.age,
        skin_tone: page.skin_tone
      }))
    )
    .catch(() => []);
  const supabaseConfig = getSupabaseConfig();

  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wsa8eyuzhx");
          `}
        </Script>
      </head>
      <body>
        <BrandHeader supabaseConfig={supabaseConfig} />
        {children}
        <Footer pages={pages} />
        <Analytics />
      </body>
    </html>
  );
}
