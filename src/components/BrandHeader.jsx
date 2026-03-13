function BrandHeader() {
  return (
    <div className="site-nav">
      <div className="wrap site-nav__inner">
        <a className="brand-logo" href="/">
          <img className="brand-logo__image" src="/ryfoya-logo.png" alt="Ryfoya" />
          <span className="brand-logo__text sr-only">Ryfoya</span>
        </a>
      </div>
    </div>
  );
}

export default BrandHeader;
