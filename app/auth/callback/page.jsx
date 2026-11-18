import AuthCallback from '../../../src/components/AuthCallback';
import { getSupabaseConfig } from '../../../src/lib/supabaseConfig';

export const metadata = {
  title: 'Signing in | Ryfoya',
  robots: { index: false }
};

export default function AuthCallbackPage() {
  return (
    <main className="auth-page">
      <section className="auth-hero wrap">
        <AuthCallback supabaseConfig={getSupabaseConfig()} />
      </section>
    </main>
  );
}
