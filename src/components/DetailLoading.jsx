export default function DetailLoading() {
  return (
    <main className="detail-loading detail-shell">
      <section className="detail-layout">
        <div className="detail-gallery">
          <div className="detail-gallery__frame">
            <div className="detail-loading__gallery" />
          </div>
        </div>

        <div className="detail-content">
          <div className="detail-loading__stack">
            <div className="loading-line loading-line--sm" />
            <div className="loading-line loading-line--title" />
            <div className="loading-line loading-line--md" />
            <div className="loading-line loading-line--md loading-line--md-short" />
            <div className="loading-line loading-line--chip" />
            <div className="loading-line loading-line--chip loading-line--chip-short" />
          </div>

          <div className="detail-loading__panel" />
          <div className="detail-loading__panel" />
          <div className="detail-loading__panel detail-loading__panel--tall" />
        </div>
      </section>
    </main>
  );
}
