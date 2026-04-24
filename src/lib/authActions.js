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

  if (params.mode) {
    query.set('mode', params.mode);
  }

  return `/login${query.toString() ? `?${query.toString()}` : ''}`;
}

async function getRequestOrigin() {
  const headersList = await headers();
  const forwardedHost = headersList.get('x-forwarded-host') || headersList.get('host');
  const forwardedProto =
    headersList.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https');

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
  }

  const origin = headersList.get('origin');

  if (origin) {
    return origin.replace(/\/+$/, '');
  }

  return getPublicSiteUrl();
}

export async function loginWithPassword(formData) {
  const email = getFormValue(formData, 'email');
  const password = getFormValue(formData, 'password');
  const next = getSafeNext(getFormValue(formData, 'next'));

  if (!email || !password) {
    redirect(buildLoginRedirect({ error: 'Enter your email and password.', next, mode: 'login' }));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(buildLoginRedirect({ error: error.message, next, mode: 'login' }));
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUpWithPassword(formData) {
  const fullName = getFormValue(formData, 'full_name');
  const email = getFormValue(formData, 'email');
  const password = getFormValue(formData, 'password');
  const confirmPassword = getFormValue(formData, 'confirm_password');
  const next = getSafeNext(getFormValue(formData, 'next'));

  if (!fullName || !email || !password || !confirmPassword) {
    redirect(buildLoginRedirect({ error: 'Enter your name, email, and password.', next, mode: 'signup' }));
  }

  if (password.length < 6) {
    redirect(buildLoginRedirect({ error: 'Password must be at least 6 characters.', next, mode: 'signup' }));
  }

  if (password !== confirmPassword) {
    redirect(buildLoginRedirect({ error: 'Passwords do not match.', next, mode: 'signup' }));
  }

  const origin = await getRequestOrigin();
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error) {
    redirect(buildLoginRedirect({ error: error.message, next, mode: 'signup' }));
  }

  revalidatePath('/', 'layout');

  if (data?.session) {
    redirect(next);
  }

  redirect(
    buildLoginRedirect({
      message: 'Check your email to confirm your account, then log in.',
      next,
      mode: 'login'
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

  const fullName = getFormValue(formData, 'full_name');
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
      full_name: fullName,
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
