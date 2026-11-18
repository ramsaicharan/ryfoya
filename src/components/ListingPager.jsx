'use client';

import { Children, useEffect, useState } from 'react';

function readPageFromUrl() {
  const page = Number.parseInt(new URLSearchParams(window.location.search).get('page') || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// All products are in the prebuilt HTML, so search engines see every one.
// This shows one page at a time and keeps the old ?page=N links working.
export default function ListingPager({ pageSize = 24, children }) {
  const items = Children.toArray(children);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const sync = () => setCurrentPage(Math.min(readPageFromUrl(), totalPages));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [totalPages]);

  function goToPage(page) {
    const url = new URL(window.location.href);

    if (page <= 1) {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', String(page));
    }

    window.history.pushState(null, '', url);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const firstIndex = (currentPage - 1) * pageSize;
  const lastIndex = firstIndex + pageSize;

  return (
    <>
      <div className="card-grid">
        {items.map((item, index) => (
          <div key={item.key ?? index} style={{ display: index >= firstIndex && index < lastIndex ? 'contents' : 'none' }}>
            {item}
          </div>
        ))}
      </div>

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Pagination">
          <button
            type="button"
            className={`pagination__link ${currentPage <= 1 ? 'pagination__link--disabled' : ''}`}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>

          <span className="pagination__status">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className={`pagination__link ${currentPage >= totalPages ? 'pagination__link--disabled' : ''}`}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </nav>
      ) : null}
    </>
  );
}
