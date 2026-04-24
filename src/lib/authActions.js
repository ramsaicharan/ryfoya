'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseAuthServerClient } from './supabaseAuthServer';
import { getPublicSiteUrl } from './supabaseConfig';
import { PREFERENCE_FIELDS } from './userProfile';

function getFormValue(formData, key) {
  return String(formData.get(key) || '').trim();
}

function getSafeNext(value, fallback = '/sunscreens') {
  const next = String(value || '').trim();

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }

  return next;
}

function buildLoginRedirect(params) {
  const query = new URLSearchParams();

  if (params.error) {
    query.set('error', params.error);
  }

  if (params.message) {
    query.set('message', params.message);
  }

  if (params.next) {
    query.set('next', params.next);
  }

  return `/login${query.toString() ? `?${query.toString()}` : ''}`;
}

async function getRequestOrigin() {
  const headersList = await headers();
  const origin = headersList.get('origin') || getPublicSiteUrl();

  if (/^https?:\/\//i.test(origin)) {
    return origin.replace(/\/+$/, '');
  }

  return `https://${origin.replace(/\/+$/, '')}`;
}

export async function loginWithPassword(formData) {
  const email = getFormValue(formData, 'email');
  const password = getFormValue(formData, 'password');
  const next = getSafeNext(getFormValue(formData, 'next'));

  if (!email || !password) {
    redirect(buildLoginRedirect({ error: 'Enter your email and password.', next }));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(buildLoginRedirect({ error: error.message, next }));
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUpWithPassword(formData) {
  const email = getFormValue(formData, 'email');
  const password = getFormValue(formData, 'password');
  const next = getSafeNext(getFormValue(formData, 'next'));

  if (!email || !password) {
    redirect(buildLoginRedirect({ error: 'Enter your email and password.', next }));
  }

  if (password.length < 6) {
    redirect(buildLoginRedirect({ error: 'Password must be at least 6 characters.', next }));
  }

  const origin = await getRequestOrigin();
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error) {
    redirect(buildLoginRedirect({ error: error.message, next }));
  }

  revalidatePath('/', 'layout');

  if (data?.session) {
    redirect(next);
  }

  redirect(
    buildLoginRedirect({
      message: 'Check your email to confirm your account, then log in.',
      next
    })
  );
}

export async function signInWithGoogle(formData) {
  const next = getSafeNext(getFormValue(formData, 'next'));
  const origin = await getRequestOrigin();
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error || !data?.url) {
    redirect(buildLoginRedirect({ error: error?.message || 'Could not start Google sign in.', next }));
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function saveProfilePreferences(formData) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const preferenceValues = PREFERENCE_FIELDS.reduce((values, field) => {
    const choice = getFormValue(formData, `${field}_choice`);
    const other = getFormValue(formData, `${field}_other`);

    return {
      ...values,
      [field]: choice === '__other__' ? other : choice
    };
  }, {});

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      email: user.email || '',
      ...preferenceValues,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  revalidatePath('/profile');
  redirect('/profile?saved=1');
}
