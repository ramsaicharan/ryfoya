import { redirect } from 'next/navigation';
import ProfilePreferencesForm from '../../src/components/ProfilePreferencesForm';
import { saveProfilePreferences } from '../../src/lib/authActions';
import { fetchAllPersonas } from '../../src/lib/site-data';
import { createSupabaseAuthServerClient } from '../../src/lib/supabaseAuthServer';
import { buildPreferenceOptions, getSafeUserProfile, isProfileIncomplete } from '../../src/lib/userProfile';

export const metadata = {
  title: 'Profile | Ryfoya',
  description: 'Save your Ryfoya skin profile preferences.'
};

export default async function ProfilePage({ searchParams }) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const resolvedSearchParams = await searchParams;

  if (!user) {
    redirect('/login?next=/profile');
  }

  const [profile, personas] = await Promise.all([
    getSafeUserProfile(user.id),
    fetchAllPersonas().catch(() => [])
  ]);
  const options = buildPreferenceOptions(personas);
  const complete = !isProfileIncomplete(profile);
  const saved = String(resolvedSearchParams?.saved || '') === '1';
  const error = String(resolvedSearchParams?.error || '').trim();
  const displayName = String(profile?.full_name || user.user_metadata?.full_name || '').trim();

  return (
    <main className="profile-page">
      <section className="profile-shell wrap">
        <div className="profile-heading">
          <span className="profile-heading__eyebrow">Profile</span>
          <h1 className="profile-heading__title">Your skin context</h1>
          <p className="profile-heading__text">
            Save these preferences now. In the next step, Ryfoya will use this profile to show sunscreens
            that better match your unique skin context.
          </p>
        </div>

        <div className="profile-card">
          <div className="profile-card__top">
            <div>
              <h2 className="profile-card__title">Skin preferences</h2>
              <p className="profile-card__meta">{displayName ? `${displayName} · ${user.email}` : user.email}</p>
            </div>
            <span className={`profile-status ${complete ? 'profile-status--complete' : 'profile-status--incomplete'}`}>
              {complete ? 'Complete' : 'Incomplete'}
            </span>
          </div>

          {saved ? <div className="auth-alert auth-alert--success">Your skin profile has been saved.</div> : null}
          {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

          <ProfilePreferencesForm profile={profile} options={options} action={saveProfilePreferences} />
        </div>
      </section>
    </main>
  );
}
