import ProfileClient from '../../src/components/ProfileClient';
import { fetchAllPersonas } from '../../src/lib/site-data';
import { getSupabaseConfig } from '../../src/lib/supabaseConfig';
import { buildPreferenceOptions } from '../../src/lib/userProfile';

export const metadata = {
  title: 'Profile | Ryfoya',
  description: 'Save your Ryfoya skin profile preferences.',
  robots: { index: false }
};

export default async function ProfilePage() {
  const personas = await fetchAllPersonas().catch(() => []);
  const options = buildPreferenceOptions(personas);

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
          <ProfileClient supabaseConfig={getSupabaseConfig()} options={options} />
        </div>
      </section>
    </main>
  );
}
