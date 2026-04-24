'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '../lib/supabaseBrowser';

const NAV_ITEMS = [
  { href: '/sunscreens', label: 'Sunscreens' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/about', label: 'About' }
];

function isProfileIncomplete(profile) {
  if (!profile) {
    return true;
  }

  return ['skin_type', 'skin_condition', 'age', 'skin_tone'].some(
    (field) => !String(profile[field] || '').trim()
  );
}

function BrandHeader({ supabaseConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [authState, setAuthState] = useState({
    email: '',
    isProfileIncomplete: false
  });
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient(supabaseConfig);
    } catch {
      return null;
    }
  }, [supabaseConfig]);
  const isSignedIn = Boolean(authState?.email);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;

    async function loadAuthState() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        setAuthState({
          email: '',
          isProfileIncomplete: false
        });
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('skin_type, skin_condition, age, skin_tone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (isMounted) {
        setAuthState({
          email: user.email || '',
          isProfileIncomplete: isProfileIncomplete(profile)
        });
      }
    }

    loadAuthState();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      loadAuthState();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    window.location.assign('/');
  }

  return (
    <div className="site-nav h-10">
      <div className="wrap site-nav__inner">
        <Link className="brand-logo" href="/" prefetch={false} onClick={() => setIsOpen(false)}>
          <img className="brand-logo__image" src="/ryfoya-logo.svg" alt="Ryfoya" />
          <span className="brand-logo__text sr-only">Ryfoya</span>
        </Link>

        <nav className="site-nav__links" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link className="site-nav__link" href={item.href} key={item.href} prefetch={false}>
              {item.label}
            </Link>
          ))}
          {isSignedIn ? (
            <>
              <Link className="site-nav__link site-nav__link--profile" href="/profile" prefetch={false}>
                Profile
              </Link>
              <button className="site-nav__button-link" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="site-nav__auth-link" href="/login" prefetch={false}>
              Login
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="site-nav__toggle"
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setIsOpen((value) => !value)}
        >
          <span className="site-nav__toggle-line" />
          <span className="site-nav__toggle-line" />
          <span className="site-nav__toggle-line" />
        </button>
      </div>

      <div className={`site-nav__drawer ${isOpen ? 'site-nav__drawer--open' : ''}`}>
        <div className="wrap site-nav__drawer-inner">
          {NAV_ITEMS.map((item) => (
            <Link
              className="site-nav__drawer-link"
              href={item.href}
              key={item.href}
              prefetch={false}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {isSignedIn ? (
            <>
              <Link
                className="site-nav__drawer-link"
                href="/profile"
                prefetch={false}
                onClick={() => setIsOpen(false)}
              >
                Profile
              </Link>
              <button className="site-nav__drawer-link site-nav__drawer-button" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link
              className="site-nav__drawer-link"
              href="/login"
              prefetch={false}
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {isSignedIn && authState?.isProfileIncomplete ? (
        <div className="profile-completion-banner">
          <div className="wrap profile-completion-banner__inner">
            <span>Complete your skin profile to unlock better sunscreen matching later.</span>
            <Link href="/profile" prefetch={false}>
              Complete your skin profile
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BrandHeader;
