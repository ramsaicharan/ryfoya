import Link from 'next/link';

function ProductCard({ product, rank }) {
  const isEven = rank % 2 === 0;
  const bannerClass = isEven ? 'banner--purple' : 'banner--lime';
  const skinPillClass = isEven ? 'skin-tag-pill--purple' : 'skin-tag-pill--lime';
  const rawScore = Number(product.score) || 0;
  const matchPercent = Math.max(0, Math.min(100, Math.round(rawScore <= 10 ? rawScore * 10 : rawScore)));
  const brandForArt = (product.brandName || 'BRAND').slice(0, 10).toUpperCase();
  const detailsHref = product.productSlug
    ? `/sunscreens/${product.productSlug}${product.contextPageSlug ? `?context=${encodeURIComponent(product.contextPageSlug)}` : ''}`
    : '/sunscreens';
  const buyHref = product.productBuyLink || '';
  const firstImage = product.imageLinks?.[0] || '';

  return (
    <article className="card">
      <div className={`card__banner ${bannerClass}`}>
        <span className="banner__rank">
          Rank <strong>#{rank}</strong>
        </span>
        <span className="banner__match">⚡ {matchPercent}% Match</span>
      </div>

      <Link href={detailsHref} className="card__img">
        {firstImage ? (
          <img
            className="card__img-photo"
            src={firstImage}
            alt={product.productName}
            loading="lazy"
          />
        ) : (
          <svg width="320" height="320" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
            <rect x="105" y="50" width="110" height="220" rx="22" fill="#F0ECE6" />
            <rect x="105" y="50" width="110" height="58" rx="22" fill="#E2DDD5" />
            <rect x="112" y="112" width="96" height="132" rx="8" fill="white" opacity=".92" />
            <rect x="112" y="112" width="96" height="22" rx="4" fill="#7C5BFF" />
            <text
              x="160"
              y="127"
              textAnchor="middle"
              fontFamily="DM Sans,sans-serif"
              fontSize="9"
              fontWeight="700"
              fill="white"
              letterSpacing="2"
            >
              {brandForArt}
            </text>
            <text
              x="160"
              y="165"
              textAnchor="middle"
              fontFamily="Playfair Display,serif"
              fontSize="20"
              fontWeight="700"
              fill="#0B110B"
            >
              SPF
            </text>
            <text
              x="160"
              y="197"
              textAnchor="middle"
              fontFamily="Playfair Display,serif"
              fontSize="30"
              fontWeight="800"
              fill="#7C5BFF"
            >
              {product.spfRating || '50+'}
            </text>
            <rect x="130" y="207" width="60" height="1.5" rx="1" fill="#E2DDD5" />
            <text
              x="160"
              y="222"
              textAnchor="middle"
              fontFamily="DM Sans,sans-serif"
              fontSize="7.5"
              fill="#9A9690"
              letterSpacing="1.5"
            >
              {product.paRating || 'BROAD SPECTRUM'}
            </text>
            <rect x="142" y="34" width="36" height="22" rx="6" fill="#D5D0C8" />
            <rect x="154" y="23" width="12" height="15" rx="4" fill="#C8C3BB" />
            <circle cx="72" cy="268" r="38" fill="#CFF03E" opacity=".18" />
            <circle cx="256" cy="74" r="26" fill="#7C5BFF" opacity=".08" />
          </svg>
        )}
      </Link>

      <Link href={detailsHref} className="card__identity">
        <span className="card__brand">{product.brandName}</span>
        <h2 className="card__title">{product.productName}</h2>
      </Link>

      <div className="card__specs">
        <span className="specs-text">
          SPF <span>{product.spfRating || 'SPF N/A'}</span>
          <span>{product.paRating || 'PA N/A'}</span>
          <span>{product.filterType || 'Filter Type N/A'}</span>
          <span>{product.productFormat || 'Format N/A'}</span>
        </span>
      </div>

      <div className="card__skinfit">
        <span className={`skin-tag-pill ${skinPillClass}`}>{product.skinFitText}</span>
      </div>

      <details className="card__accordion">
        <summary className="acc__trigger">
          <span className="acc__left">
            <span className="acc__label">Pros &amp; Cons</span>
          </span>
          <span className="acc__chevron">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="#0B110B"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </summary>
        <div className="acc__body">
          <div className="verdict">
            <div className="verdict__col">
              <span className="verdict__head">Liked</span>
              {product.pros.map((pro, index) => (
                <div key={`pro-${product.id}-${index}`} className="verdict__item verdict__item--pro">
                  <span className="verdict__dot" />
                  {pro}
                </div>
              ))}
            </div>
            <div className="verdict__col">
              <span className="verdict__head">Note</span>
              {product.cons.map((con, index) => (
                <div key={`con-${product.id}-${index}`} className="verdict__item verdict__item--con">
                  <span className="verdict__dot" />
                  {con}
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      <div className="card__bottom">
        <div className="card__cta">
          {buyHref ? (
            <a
              href={buyHref}
              className="btn btn--primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buy on Amazon
            </a>
          ) : null}
          <Link href={detailsHref} className="btn btn--secondary">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
