import { NextResponse } from 'next/server';
import { createSupabaseAuthServerClient } from '../../../src/lib/supabaseAuthServer';

function getSafeNext(value) {
  const next = String(value || '').trim();

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/sunscreens';
  }

  return next;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeNext(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=Could not complete sign in.', requestUrl.origin));
}
