import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseConfig } from './src/lib/supabaseConfig';

export async function middleware(request) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sitemaps|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'
  ]
};
