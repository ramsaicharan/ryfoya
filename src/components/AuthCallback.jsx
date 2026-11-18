'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabaseBrowser';
import { getSafeNext } from '../lib/authClient';

// Google sign-in and email confirmation links land here with ?code=. The browser
// swaps the code for a session, then continues to ?next=.
export default function AuthCallback({ supabaseConfig }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const next = getSafeNext(params.get('next'));
    const failed = '/login?error=' + encodeURIComponent('Could not complete sign in.');

    if (!code) {
      window.location.replace(failed);
      return;
    }

    const supabase = createSupabaseBrowserClient(supabaseConfig);
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      window.location.replace(error ? failed : next);
    });
  }, [supabaseConfig]);

  return <p className="auth-hero__text">Signing you in…</p>;
}
