export default function ListingLoading() {
  return (
    <main className="listing-loading">
      <section className="loading-header wrap">
        <div className="loading-line loading-line--sm" />
        <div className="loading-line loading-line--title" />
        <div className="loading-line loading-line--title loading-line--title-short" />
        <div className="loading-line loading-line--md" />
        <div className="loading-line loading-line--md loading-line--md-short" />
      </section>

      <section className="listing-layout listing-layout--full">
        <aside className="persona-filters persona-filters--desktop">
          <div className="persona-filters__sticky">
            <div className="loading-sidebar">
              <div className="loading-line loading-line--md loading-line--block" />
              <div className="loading-line loading-line--chip" />
              <div className="loading-line loading-line--chip" />
              <div className="loading-line loading-line--chip" />
            </div>
          </div>
        </aside>

        <div className="listing-content">
          <div className="card-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <article className="loading-card" key={`loading-card-${index}`}>
                <div className="loading-card__banner" />
                <div className="loading-card__image" />
                <div className="loading-card__line loading-card__line--brand" />
                <div className="loading-card__line loading-card__line--title" />
                <div className="loading-card__line loading-card__line--meta" />
                <div className="loading-card__pill" />
                <div className="loading-card__line loading-card__line--meta" />
                <div className="loading-card__actions">
                  <div className="loading-card__button" />
                  <div className="loading-card__button loading-card__button--secondary" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
