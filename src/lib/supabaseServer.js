import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseConfig';

export function getSupabaseServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
