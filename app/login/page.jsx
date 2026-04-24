import { redirect } from 'next/navigation';
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

        <div className="auth-card">
          {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}
          {message ? <div className="auth-alert auth-alert--success">{message}</div> : null}

          <form action={signInWithGoogle} className="auth-form">
            <input type="hidden" name="next" value={next} />
            <button className="auth-google" type="submit">
              Continue with Google
            </button>
          </form>

          <div className="auth-divider">
            <span>or use email</span>
          </div>

          <div className="auth-grid">
            <form action={loginWithPassword} className="auth-form">
              <input type="hidden" name="next" value={next} />
              <h2 className="auth-form__title">Log in</h2>
              <label className="auth-field">
                <span>Email</span>
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input type="password" name="password" autoComplete="current-password" required />
              </label>
              <button className="auth-submit" type="submit">
                Log in
              </button>
            </form>

            <form action={signUpWithPassword} className="auth-form auth-form--soft">
              <input type="hidden" name="next" value={next} />
              <h2 className="auth-form__title">Sign up</h2>
              <label className="auth-field">
                <span>Email</span>
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input type="password" name="password" autoComplete="new-password" minLength={6} required />
              </label>
              <button className="auth-submit auth-submit--purple" type="submit">
                Create account
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
