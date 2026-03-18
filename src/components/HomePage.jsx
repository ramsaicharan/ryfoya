function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="category-card__icon">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 1.8v3.1M12 19.1v3.1M4.1 4.1l2.2 2.2M17.7 17.7l2.2 2.2M1.8 12h3.1M19.1 12h3.1M4.1 19.9l2.2-2.2M17.7 6.3l2.2-2.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DropletsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="category-card__icon">
      <path
        d="M12 2.5c3.8 4.2 5.8 7 5.8 9.4A5.8 5.8 0 1 1 6.2 12c0-2.4 2-5.2 5.8-9.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="category-card__icon">
      <path d="m12 2 1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m18.2 15.5.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="category-card__icon">
      <path
        d="M3 9h10.5a2.5 2.5 0 1 0-2.5-2.5M3 15h14.5a2.5 2.5 0 1 1-2.5 2.5M3 12h18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="category-card__arrow">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function HomePage({ pages }) {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="wrap home-hero__inner home-hero__inner--center">
          <span className="home-hero__eyebrow">Ryfoya intelligent skincare</span>
          <h1 className="home-hero__title home-hero__title--center">
            Personalized <br className="home-hero__break" />
            <span className="home-hero__accent">skin care</span> for you.
          </h1>
          <p className="home-hero__desc home-hero__desc--center">
            Your intelligent personal skin care suggestion engine. We analyze ingredients,
            performance, and your unique skin profile to find what truly works.
          </p>
        </div>
      </section>

      <section className="wrap home-categories">
        <div className="home-links__head">
          <h2 className="home-links__title">Explore Categories</h2>
        </div>

        <div className="category-grid">
          <a className="category-card category-card--lime" href="/sunscreens">
            <span className="category-card__glow" />
            <SunIcon />
            <div className="category-card__content">
              <h3 className="category-card__title">Sunscreens</h3>
              <p className="category-card__meta">Protect &amp; Prevent</p>
              <span className="category-card__action">
                Compare <ArrowIcon />
              </span>
            </div>
          </a>

          <div className="category-card category-card--dark">
            <DropletsIcon />
            <div className="category-card__content">
              <h3 className="category-card__title">Moisturizers</h3>
              <p className="category-card__meta">Hydrate &amp; Repair</p>
              <span className="category-card__coming">Coming soon</span>
            </div>
          </div>

          <div className="category-card category-card--purple">
            <SparklesIcon />
            <div className="category-card__content">
              <h3 className="category-card__title">Serums</h3>
              <p className="category-card__meta">Target &amp; Treat</p>
              <span className="category-card__coming">Coming soon</span>
            </div>
          </div>

          <div className="category-card category-card--light">
            <WindIcon />
            <div className="category-card__content">
              <h3 className="category-card__title">Cleansers</h3>
              <p className="category-card__meta">Purify &amp; Prep</p>
              <span className="category-card__coming">Coming soon</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

export default HomePage;
