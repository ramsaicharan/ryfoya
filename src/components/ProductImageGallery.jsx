'use client';

import { useMemo, useState } from 'react';

function ProductImageGallery({ images, productName }) {
  const galleryImages = useMemo(
    () => (Array.isArray(images) ? images.map((image) => String(image || '').trim()).filter(Boolean) : []),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  if (galleryImages.length === 0) {
    return null;
  }

  const activeImage = galleryImages[activeIndex] || galleryImages[0];

  function goPrevious() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? galleryImages.length - 1 : currentIndex - 1
    );
  }

  function goNext() {
    setActiveIndex((currentIndex) =>
      currentIndex === galleryImages.length - 1 ? 0 : currentIndex + 1
    );
  }

  return (
    <div className="detail-gallery__media">
      <div className="detail-gallery__hero">
        <img
          className="detail-gallery__hero-image"
          src={activeImage}
          alt={`${productName} image ${activeIndex + 1}`}
        />

        {galleryImages.length > 1 ? (
          <>
            <span className="detail-gallery__count">
              {activeIndex + 1} / {galleryImages.length}
            </span>
            <button
              type="button"
              className="detail-gallery__arrow detail-gallery__arrow--left"
              onClick={goPrevious}
              aria-label="Show previous image"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="detail-gallery__arrow detail-gallery__arrow--right"
              onClick={goNext}
              aria-label="Show next image"
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        ) : null}
      </div>

      <div className="detail-gallery__thumbs">
        {galleryImages.map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            type="button"
            className={`detail-gallery__thumb ${index === activeIndex ? 'detail-gallery__thumb--active' : ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show image ${index + 1}`}
          >
            <img
              className="detail-gallery__thumb-image"
              src={imageUrl}
              alt={`${productName} thumbnail ${index + 1}`}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default ProductImageGallery;
