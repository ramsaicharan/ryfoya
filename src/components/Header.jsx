function splitTitle(title) {
  const trimmedTitle = String(title || '').trim();

  if (!trimmedTitle) {
    return {
      lineOne: 'Best Sunscreens',
      lineTwo: 'for Oily Skin'
    };
  }

  const match = trimmedTitle.match(/^(.*?)(\s+for\s+.+)$/i);

  if (!match) {
    return {
      lineOne: trimmedTitle,
      lineTwo: ''
    };
  }

  return {
    lineOne: match[1].trim(),
    lineTwo: match[2].trim()
  };
}

function Header({ persona, formulasReviewed }) {
  const titleParts = splitTitle(persona?.page_title);
  const description =
    persona?.page_description ||
    'Doctor-led recommendations for protected, shine-free skin.';

  return (
    <header className="site-header">
      <div className="wrap">
        <span className="header__eyebrow">
          Doctor-led recommendations · Dermatologist tested · {formulasReviewed} formulas reviewed
        </span>
        <h1 className="header__title">
          <span className="t1">{titleParts.lineOne}</span>
          {titleParts.lineTwo ? <span className="t2">{titleParts.lineTwo}</span> : null}
        </h1>
        <p className="header__desc">{description}</p>
      </div>
    </header>
  );
}

export default Header;
