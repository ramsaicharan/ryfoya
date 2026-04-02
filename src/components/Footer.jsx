import Link from 'next/link';

function splitIntoColumns(items, columnCount) {
  const columns = [];

  for (let index = 0; index < items.length; index += columnCount) {
    columns.push(items.slice(index, index + columnCount));
  }

  return columns;
}

function getSkinContextLabel(page) {
  const parts = [page.skin_type, page.skin_condition, page.age, page.skin_tone]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return parts.join(' and ') || page.route_slug || page.page_slug;
}

function Footer({ pages }) {
  const skinContextPages = pages.filter((page) => page.route_slug || page.page_slug).slice(0, 8);
  const columns = splitIntoColumns(skinContextPages, 4);

  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div className="site-footer__brand">
          <a className="site-footer__logo" href="/">
            <img className="site-footer__logo-image" src="/ryfoya-logo.png" alt="Ryfoya" />
            <span className="sr-only">Ryfoya</span>
          </a>
          <p className="site-footer__copy">
            Your intelligent personal skin care suggestion engine. We analyze ingredients,
            performance, and your unique skin profile to find what truly works.
          </p>
        </div>

        <div className="site-footer__links">
          <h4 className="site-footer__heading">Skin Context</h4>
          <div className="site-footer__columns">
            {columns.map((column, columnIndex) => (
              <ul className="site-footer__list" key={`footer-column-${columnIndex}`}>
                {column.map((page) => (
                  <li key={page.id}>
                    <a
                      className="site-footer__link"
                      href={page.route_slug ? `/sunscreens/best/${page.route_slug}` : `/${page.page_slug}`}
                    >
                      {getSkinContextLabel(page)}
                    </a>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        <div className="site-footer__more">
          <h4 className="site-footer__heading">More</h4>
          <ul className="site-footer__list">
            <li>
              <Link className="site-footer__link" href="/sunscreens">
                Sunscreens
              </Link>
            </li>
            <li>
              <Link className="site-footer__link" href="/how-it-works">
                How It Works
              </Link>
            </li>
            <li>
              <Link className="site-footer__link" href="/about">
                About Us
              </Link>
            </li>
            <li>
              <Link className="site-footer__link" href="/legal">
                Legal & Disclaimer
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="wrap site-footer__bottom">
        <p>&copy; {new Date().getFullYear()} Ryfoya. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
