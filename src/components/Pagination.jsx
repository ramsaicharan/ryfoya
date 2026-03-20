import Link from 'next/link';

function buildPageHref(basePath, page) {
  const safeBasePath = String(basePath || '/').trim() || '/';

  if (page <= 1) {
    return safeBasePath;
  }

  return `${safeBasePath}?page=${page}`;
}

export default function Pagination({ basePath, currentPage, totalPages }) {
  const safeCurrentPage = Math.max(1, Number(currentPage) || 1);
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);

  if (safeTotalPages <= 1) {
    return null;
  }

  const previousPage = Math.max(1, safeCurrentPage - 1);
  const nextPage = Math.min(safeTotalPages, safeCurrentPage + 1);

  return (
    <nav className="pagination" aria-label="Pagination">
      <Link
        className={`pagination__link ${safeCurrentPage <= 1 ? 'pagination__link--disabled' : ''}`}
        href={buildPageHref(basePath, previousPage)}
        aria-disabled={safeCurrentPage <= 1}
        tabIndex={safeCurrentPage <= 1 ? -1 : undefined}
      >
        Previous
      </Link>

      <span className="pagination__status">
        Page {safeCurrentPage} of {safeTotalPages}
      </span>

      <Link
        className={`pagination__link ${safeCurrentPage >= safeTotalPages ? 'pagination__link--disabled' : ''}`}
        href={buildPageHref(basePath, nextPage)}
        aria-disabled={safeCurrentPage >= safeTotalPages}
        tabIndex={safeCurrentPage >= safeTotalPages ? -1 : undefined}
      >
        Next
      </Link>
    </nav>
  );
}
