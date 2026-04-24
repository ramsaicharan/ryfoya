import { redirect } from 'next/navigation';
import LoginAuthPanel from '../../src/components/LoginAuthPanel';
import { loginWithPassword, signInWithGoogle, signUpWithPassword } from '../../src/lib/authActions';
import { getCurrentUser } from '../../src/lib/supabaseAuthServer';

export const metadata = {
  title: 'Login | Ryfoya',
  description: 'Log in or sign up to save your Ryfoya skin profile.'
};

function getSafeNext(value) {
  const next = String(value || '').trim();

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/sunscreens';
  }

  return next;
}

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const next = getSafeNext(resolvedSearchParams?.next);
  const error = String(resolvedSearchParams?.error || '').trim();
  const message = String(resolvedSearchParams?.message || '').trim();
  const mode = String(resolvedSearchParams?.mode || '').trim() === 'signup' ? 'signup' : 'login';

  if (user) {
    redirect(next);
  }

  return (
    <main className="auth-page">
      <section className="auth-hero wrap">
        <div className="auth-hero__copy">
          <span className="auth-hero__eyebrow">Your Skin Profile</span>
          <h1 className="auth-hero__title">Save your skin context for better sunscreen picks.</h1>
          <p className="auth-hero__text">
            Create a Ryfoya account to save your skin type, skin condition, age group, and skin tone.
            We will use this later to surface sunscreens that fit your profile.
          </p>
        </div>

        <LoginAuthPanel
          next={next}
          error={error}
          message={message}
          initialMode={mode}
          loginAction={loginWithPassword}
          signUpAction={signUpWithPassword}
          googleAction={signInWithGoogle}
        />
      </section>
    </main>
  );
}
