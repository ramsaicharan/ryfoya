function BrandListingFaq({ faq }) {
  if (!faq) {
    return null;
  }

  return (
    <section className="brand-listing-faq" aria-labelledby="brand-listing-faq-title">
      <h2 id="brand-listing-faq-title" className="brand-listing-faq__title">
        Frequently Asked Questions
      </h2>
      <details className="brand-listing-faq__item">
        <summary className="brand-listing-faq__question">
          <span>{faq.question}</span>
          <span className="brand-listing-faq__chevron" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </summary>
        <p className="brand-listing-faq__answer">{faq.answer}</p>
      </details>
    </section>
  );
}

export default BrandListingFaq;
