import 'server-only';
import { createClient } from '@supabase/supabase-js';

function getEnvValue(...keys) {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }

  return '';
}

export function getSupabaseServerClient() {
  const supabaseUrl = getEnvValue('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnvValue('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
