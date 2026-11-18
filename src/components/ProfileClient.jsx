'use client';

import { useEffect, useMemo, useState } from 'react';
import ProfilePreferencesForm from './ProfilePreferencesForm';
import { createSupabaseBrowserClient } from '../lib/supabaseBrowser';
import { getUserProfile, saveProfilePreferences } from '../lib/authClient';
import { isProfileIncomplete } from '../lib/userProfile';

export default function ProfileClient({ supabaseConfig, options }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(supabaseConfig), [supabaseConfig]);
  const [state, setState] = useState({ loading: true, user: null, profile: null });
  const [notice, setNotice] = useState({ saved: false, error: '' });

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user || null;

      if (!user) {
        window.location.replace('/login?next=/profile');
        return;
      }

      const profile = await getUserProfile(supabase, user.id);

      if (isMounted) {
        setState({ loading: false, user, profile });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleSave(formData) {
    const { error } = await saveProfilePreferences(supabase, state.user, formData);

    if (error) {
      setNotice({ saved: false, error });
      return;
    }

    const profile = await getUserProfile(supabase, state.user.id);
    setState((current) => ({ ...current, profile }));
    setNotice({ saved: true, error: '' });
  }

  if (state.loading) {
    return <p className="profile-card__meta">Loading your profile…</p>;
  }

  const { user, profile } = state;
  const complete = !isProfileIncomplete(profile);
  const displayName = String(profile?.full_name || user.user_metadata?.full_name || '').trim();

  return (
    <>
      <div className="profile-card__top">
        <div>
          <h2 className="profile-card__title">Skin preferences</h2>
          <p className="profile-card__meta">{displayName ? `${displayName} · ${user.email}` : user.email}</p>
        </div>
        <span className={`profile-status ${complete ? 'profile-status--complete' : 'profile-status--incomplete'}`}>
          {complete ? 'Complete' : 'Incomplete'}
        </span>
      </div>

      {notice.saved ? <div className="auth-alert auth-alert--success">Your skin profile has been saved.</div> : null}
      {notice.error ? <div className="auth-alert auth-alert--error">{notice.error}</div> : null}

      <ProfilePreferencesForm profile={profile} options={options} action={handleSave} />
    </>
  );
}
