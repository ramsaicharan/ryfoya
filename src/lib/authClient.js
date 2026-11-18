'use client';

// Sign-in runs in the visitor's browser (the site is prebuilt static files with no
// server). Supabase's Row Level Security applies exactly as it did on the server.
import { PREFERENCE_FIELDS } from './userProfile';

export function getSafeNext(value, fallback = '/sunscreens') {
  const next = String(value || '').trim();

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }

  return next;
}

function callbackUrl(next) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function loginWithPassword(supabase, { email, password }) {
  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message || '' };
}

export async function signUpWithPassword(supabase, { fullName, email, password, confirmPassword, next }) {
  if (!fullName || !email || !password || !confirmPassword) {
    return { error: 'Enter your name, email, and password.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: callbackUrl(next)
    }
  });

  if (error) {
    return { error: error.message };
  }

  return { error: '', signedIn: Boolean(data?.session) };
}

export async function signInWithGoogle(supabase, next) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(next) }
  });

  return { error: error?.message || '' };
}

export async function getUserProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, skin_type, skin_condition, age, skin_tone, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  return error ? null : data || null;
}

export async function saveProfilePreferences(supabase, user, formData) {
  const value = (key) => String(formData.get(key) || '').trim();
  const preferenceValues = PREFERENCE_FIELDS.reduce((values, field) => {
    const choice = value(`${field}_choice`);
    return { ...values, [field]: choice === '__other__' ? value(`${field}_other`) : choice };
  }, {});

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      email: user.email || '',
      full_name: value('full_name'),
      ...preferenceValues,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );

  return { error: error?.message || '' };
}
