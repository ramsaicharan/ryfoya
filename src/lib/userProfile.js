import 'server-only';
import { createSupabaseAuthServerClient } from './supabaseAuthServer';

export const PREFERENCE_FIELDS = ['skin_type', 'skin_condition', 'age', 'skin_tone'];

export function isProfileIncomplete(profile) {
  if (!profile) {
    return true;
  }

  return PREFERENCE_FIELDS.some((field) => !String(profile[field] || '').trim());
}

export async function getUserProfile(userId) {
  if (!userId) {
    return null;
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, skin_type, skin_condition, age, skin_tone, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load user profile: ${error.message}`);
  }

  return data || null;
}

export async function getSafeUserProfile(userId) {
  try {
    return await getUserProfile(userId);
  } catch {
    return null;
  }
}

export function buildPreferenceOptions(personas) {
  return PREFERENCE_FIELDS.reduce((options, field) => {
    const values = new Set();

    for (const persona of personas || []) {
      const value = String(persona?.[field] || '').trim();
      if (value) {
        values.add(value);
      }
    }

    return {
      ...options,
      [field]: [...values].sort((left, right) => left.localeCompare(right))
    };
  }, {});
}
