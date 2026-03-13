import BrandHeader from '../src/components/BrandHeader';
import Footer from '../src/components/Footer';
import { fetchAllPersonas, getDefaultMetadata } from '../src/lib/site-data';
import '../src/styles.css';

export const metadata = getDefaultMetadata();

export default async function RootLayout({ children }) {
  const pages = await fetchAllPersonas().catch(() => []);

  return (
    <html lang="en">
      <body>
        <BrandHeader />
        {children}
        <Footer pages={pages} />
      </body>
    </html>
  );
}
