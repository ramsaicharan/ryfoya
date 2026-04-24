import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseConfig } from './supabaseConfig';

export async function createSupabaseAuthServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware and Server Actions can.
        }
      }
    }
  });
}

export async function getCurrentUser() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user || null;
}
