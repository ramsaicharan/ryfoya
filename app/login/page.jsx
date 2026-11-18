import LoginAuthPanel from '../../src/components/LoginAuthPanel';
import { getSupabaseConfig } from '../../src/lib/supabaseConfig';

export const metadata = {
  title: 'Login | Ryfoya',
  description: 'Log in or sign up to save your Ryfoya skin profile.'
};

export default function LoginPage() {
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

        <LoginAuthPanel supabaseConfig={getSupabaseConfig()} />
      </section>
    </main>
  );
}
