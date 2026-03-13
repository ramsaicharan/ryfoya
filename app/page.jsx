import HomePage from '../src/components/HomePage';
import { fetchAllPersonas } from '../src/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const pages = await fetchAllPersonas();
  return <HomePage pages={pages} />;
}
