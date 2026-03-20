import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductImageGallery from '../../../src/components/ProductImageGallery';
import SkinMatchTabs from '../../../src/components/SkinMatchTabs';
import { fetchProductBySlug, fetchProductDetailPageData, getProductMetadata } from '../../../src/lib/site-data';

export const dynamic = 'force-dynamic';

function extractNumber(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function getEvaluationMetric(evaluations, agentName, metricKey) {
  const metric = evaluations?.[agentName]?.[metricKey] || null;
  const rawScore = metric?.score;
  const numericScore = typeof rawScore === 'number' ? rawScore : extractNumber(rawScore);

  return {
    score: Math.max(0, Math.min(5, numericScore || 0)),
    shortDesc:
      String(metric?.rationale || '').trim() ||
      String(metric?.flags || '').trim() ||
      String(metric?.evidence || '').trim() ||
      'No evaluation details available.'
  };
}

function getPositiveMetricStatus(score) {
  if (score >= 4) {
    return 'good';
  }

  if (score === 3) {
    return 'warning';
  }

  return 'bad';
}

function getRiskMetricStatus(score) {
  if (score <= 2) {
    return 'good';
  }

  if (score === 3) {
    return 'warning';
  }

  return 'bad';
}

function buildPerformanceFactors(evaluations) {
  const spfLevel = getEvaluationMetric(evaluations, 'light_shield', 'spf_level');
  const broadSpectrum = getEvaluationMetric(evaluations, 'light_shield', 'broad_spectrum_quality');
  const waterResistance = getEvaluationMetric(evaluations, 'light_shield', 'water_sweat_resistance');
  const visibleLight = getEvaluationMetric(evaluations, 'light_shield', 'visible_light_protection');
  const irritationRisk = getEvaluationMetric(evaluations, 'skin_safety', 'irritation_potential');
  const poreClogging = getEvaluationMetric(evaluations, 'pore_and_oil', 'comedogenicity_score');
  const whiteCast = getEvaluationMetric(evaluations, 'function_experience', 'white_cast_potential');

  return [
    {
      id: 'spf',
      name: 'SPF Level',
      score: spfLevel.score,
      shortDesc: spfLevel.shortDesc,
      status: getPositiveMetricStatus(spfLevel.score)
    },
    {
      id: 'uva',
      name: 'Broad Spectrum',
      score: broadSpectrum.score,
      shortDesc: broadSpectrum.shortDesc,
      status: getPositiveMetricStatus(broadSpectrum.score)
    },
    {
      id: 'water',
      name: 'Sweat Resistance',
      score: waterResistance.score,
      shortDesc: waterResistance.shortDesc,
      status: getPositiveMetricStatus(waterResistance.score)
    },
    {
      id: 'visible-light',
      name: 'Visible Light',
      score: visibleLight.score,
      shortDesc: visibleLight.shortDesc,
      status: getPositiveMetricStatus(visibleLight.score)
    },
    {
      id: 'irritation',
      name: 'Irritation Risk',
      score: irritationRisk.score,
      shortDesc: irritationRisk.shortDesc,
      status: getRiskMetricStatus(irritationRisk.score)
    },
    {
      id: 'comedogenicity',
      name: 'Pore Clogging',
      score: poreClogging.score,
      shortDesc: poreClogging.shortDesc,
      status: getRiskMetricStatus(poreClogging.score)
    },
    {
      id: 'white-cast',
      name: 'White Cast',
      score: whiteCast.score,
      shortDesc: whiteCast.shortDesc,
      status: getRiskMetricStatus(whiteCast.score)
    }
  ];
}

function buildIngredientDetail(ingredient) {
  if (ingredient.isFlagged && ingredient.firstFlagDescription) {
    return ingredient.firstFlagDescription;
  }
  return '';
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found'
    };
  }

  return getProductMetadata(product);
}

export default async function SunscreenDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const contextPageSlug = String(resolvedSearchParams?.context || '').trim();
  const pageData = await fetchProductDetailPageData(slug, contextPageSlug);

  if (!pageData) {
    notFound();
  }

  const { product, evaluations, skinMatches, activeIngredients, inactiveIngredients } = pageData;
  const topMatches = skinMatches;
  const performanceFactors = buildPerformanceFactors(evaluations);
  const brandForArt = (product.brandName || 'BRAND').slice(0, 10).toUpperCase();
  const galleryImages = product.imageLinks || [];

  return (
    <div className="product-detail-page">
      <main className="detail-shell">
        <section className="detail-layout">
          <div className="detail-gallery">
            <div className="detail-gallery__frame">
              {galleryImages.length > 0 ? (
                <ProductImageGallery images={galleryImages} productName={product.productName} />
              ) : (
                <>
                  <div className="detail-gallery__blob detail-gallery__blob--purple" />
                  <div className="detail-gallery__blob detail-gallery__blob--lime" />

                  <div className="detail-bottle">
                    <div className="detail-bottle__cap" />
                    <div className="detail-bottle__band" />
                    <div className="detail-bottle__label">
                      <div className="detail-bottle__brand">{brandForArt}</div>
                      <div className="detail-bottle__spf-label">SPF</div>
                      <div className="detail-bottle__spf-value">{product.spfRating || '50+'}</div>
                      <div className="detail-bottle__format">{product.productFormat}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="detail-content">
            <div className="detail-intro">
              <div className="detail-intro__brand">{product.brandName}</div>
              <h1 className="detail-intro__title">
                {product.productName}{' '}
                <span className="detail-intro__title-accent">{product.spfRating ? `SPF ${product.spfRating}` : ''}</span>
              </h1>

              <p className="detail-intro__desc">
                {product.overallPros[0] ||
                  'Sunscreen detail page showing product-level scoring, persona matches, and ingredient analysis.'}
              </p>

              <div className="detail-badge-row">
                {/* {topMatches[0]?.contextLabel ? (
                  <span className="detail-badge detail-badge--lime">{topMatches[0].contextLabel}</span>
                ) : null} */}
                <span className="detail-badge detail-badge--lime">{product.filterType}</span>
                <span className="detail-badge detail-badge--lime">{product.productFormat}</span>
              </div>
              {product.productBuyLink ? (
                <a
                  className="detail-buy-link"
                  href={product.productBuyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                Buy on Amazon
                </a>
              ) : null}
            </div>

            <hr className="detail-divider" />

            <section className="detail-block">
              <h2 className="detail-block__title">Skin Type Match</h2>
              {topMatches.length > 0 ? (
                <SkinMatchTabs matches={topMatches} />
              ) : (
                <div className="detail-empty-state">No persona-specific skin match data is available yet.</div>
              )}
            </section>

            <hr className="detail-divider" />

            <section className="detail-block">
              <h2 className="detail-block__title">Performance Scores</h2>
              <div className="detail-factors">
                {performanceFactors.map((factor) => (
                  <div key={factor.id} className="detail-factor">
                    <div className="detail-factor__copy">
                      <div className="detail-factor__name">{factor.name}</div>
                      <div className={`detail-factor__desc detail-factor__desc--${factor.status}`}>
                        {factor.shortDesc}
                      </div>
                    </div>
                    <div className="detail-scorebar" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((dot) => (
                        <span
                          key={`${factor.id}-${dot}`}
                          className={`detail-scorebar__dot ${
                            dot <= factor.score
                              ? `detail-scorebar__dot--${factor.status}`
                              : 'detail-scorebar__dot--off'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            

            <hr className="detail-divider" />

            <section className="detail-block">
              <details className="ingredients-accordion">
                <summary className="ingredients-accordion__summary">
                  <span>Ingredients Analysis</span>
                  <span className="ingredients-accordion__chevron">▾</span>
                </summary>

                <div className="ingredients-accordion__body">
                  <div className="ingredients-section">
                    <h3 className="ingredients-section__title">Active Filters</h3>
                    <div className="ingredient-tags">
                      {activeIngredients.length > 0 ? (
                        activeIngredients.map((ingredient) => (
                          ingredient.isFlagged ? (
                            <details
                              key={ingredient.id}
                              className="ingredient-tag ingredient-tag--flagged"
                            >
                              <summary className="ingredient-tag__summary">
                                <span className="ingredient-tag__name">{ingredient.name}</span>
                                {ingredient.shortDescription ? (
                                  <span className="ingredient-tag__desc">{ingredient.shortDescription}</span>
                                ) : null}
                              </summary>
                              <div className="ingredient-tag__details">{buildIngredientDetail(ingredient)}</div>
                            </details>
                          ) : (
                            <div key={ingredient.id} className="ingredient-tag ingredient-tag--active ingredient-tag--static">
                              <div className="ingredient-tag__summary">
                                <span className="ingredient-tag__name">{ingredient.name}</span>
                                {ingredient.shortDescription ? (
                                  <span className="ingredient-tag__desc">{ingredient.shortDescription}</span>
                                ) : null}
                              </div>
                            </div>
                          )
                        ))
                      ) : (
                        <div className="detail-empty-state">No active filter rows are available yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="ingredients-section">
                    <h3 className="ingredients-section__title">Key Inactives</h3>
                    <div className="ingredient-tags">
                      {inactiveIngredients.length > 0 ? (
                        inactiveIngredients.map((ingredient) => (
                          ingredient.isFlagged ? (
                            <details
                              key={ingredient.id}
                              className="ingredient-tag ingredient-tag--flagged"
                            >
                              <summary className="ingredient-tag__summary">
                                <span className="ingredient-tag__name">{ingredient.name}</span>
                                {ingredient.shortDescription ? (
                                  <span className="ingredient-tag__desc">{ingredient.shortDescription}</span>
                                ) : null}
                              </summary>
                              <div className="ingredient-tag__details">{buildIngredientDetail(ingredient)}</div>
                            </details>
                          ) : (
                            <div key={ingredient.id} className="ingredient-tag ingredient-tag--inactive ingredient-tag--static">
                              <div className="ingredient-tag__summary">
                                <span className="ingredient-tag__name">{ingredient.name}</span>
                                {ingredient.shortDescription ? (
                                  <span className="ingredient-tag__desc">{ingredient.shortDescription}</span>
                                ) : null}
                              </div>
                            </div>
                          )
                        ))
                      ) : (
                        <div className="detail-empty-state">No supporting ingredient rows are available yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
