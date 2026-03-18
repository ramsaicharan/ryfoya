'use client';

import { useState } from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/sunscreens', label: 'Sunscreens' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/about', label: 'About' }
];

function BrandHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="site-nav h-10">
      <div className="wrap site-nav__inner">
        <Link className="brand-logo" href="/" onClick={() => setIsOpen(false)}>
          <img className="brand-logo__image" src="/ryfoya-logo.png" alt="Ryfoya" />
          <span className="brand-logo__text sr-only">Ryfoya</span>
        </Link>

        <nav className="site-nav__links" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link className="site-nav__link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
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
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BrandHeader;
