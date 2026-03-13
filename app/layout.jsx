import Script from 'next/script';
import BrandHeader from '../src/components/BrandHeader';
import Footer from '../src/components/Footer';
import { fetchAllPersonas, getDefaultMetadata } from '../src/lib/site-data';
import '../src/styles.css';

export const metadata = getDefaultMetadata();
const GA_MEASUREMENT_ID = 'G-WWN3SR559Q';

export default async function RootLayout({ children }) {
  const pages = await fetchAllPersonas().catch(() => []);

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
      </head>
      <body>
        <BrandHeader />
        {children}
        <Footer pages={pages} />
      </body>
    </html>
  );
}
