import Link from '../../../src/components/AppLink';
import { notFound } from 'next/navigation';
import {
  Activity,
  ChevronDown,
  Droplets,
  Eye,
  Shield,
  Sparkles,
  Sun,
  Wind
} from 'lucide-react';
import ProductImageGallery from '../../../src/components/ProductImageGallery';
import SkinMatchTabs from '../../../src/components/SkinMatchTabs';
import {
  fetchBrandForProduct,
  fetchProductBySlug,
  fetchProductDetailPageData,
  formatProductDisplayName,
  getProductMetadata
} from '../../../src/lib/site-data';
import { getProductStaticParams } from '../../../src/lib/static-paths';

// Every product in the sitemap is prebuilt; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getProductStaticParams();
}

function extractNumber(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function formatSpfBadge(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized || /^spf\s*n\/?a$/i.test(normalized) || /^n\/?a$/i.test(normalized)) {
    return '';
  }

  return /^spf\b/i.test(normalized) ? normalized.toUpperCase() : `SPF ${normalized}`;
}

function formatPaBadge(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized || /^pa\s*n\/?a$/i.test(normalized) || /^n\/?a$/i.test(normalized)) {
    return '';
  }

  return /^pa\b/i.test(normalized) ? normalized.toUpperCase() : `PA ${normalized}`;
}

function getEvaluationMetric(evaluations, agentName, metricKey) {
  const metric = evaluations?.[agentName]?.[metricKey] || null;
  const rawScore = metric?.score;
  const numericScore = typeof rawScore === 'number' ? rawScore : extractNumber(rawScore);

  return {
    score: Math.max(0, Math.min(5, numericScore || 0)),
    shortDesc:
      String(metric?.evidence || '').trim() ||
      String(metric?.rationale || '').trim() ||
      String(metric?.flags || '').trim() ||
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
  const photostability = getEvaluationMetric(evaluations, 'light_shield', 'photostability');
  const visibleLight = getEvaluationMetric(evaluations, 'light_shield', 'visible_light_protection');
  const irritationRisk = getEvaluationMetric(evaluations, 'skin_safety', 'irritation_potential');
  const poreClogging = getEvaluationMetric(evaluations, 'pore_and_oil', 'comedogenicity_score');
  const whiteCast = getEvaluationMetric(evaluations, 'function_experience', 'white_cast_potential');

  return [
    {
      id: 'spf',
      name: 'SPF Level',
      score: spfLevel.score,
      displayScore: spfLevel.score,
      shortDesc: spfLevel.shortDesc,
      status: getPositiveMetricStatus(spfLevel.score)
    },
    {
      id: 'uva',
      name: 'Broad Spectrum',
      score: broadSpectrum.score,
      displayScore: broadSpectrum.score,
      shortDesc: broadSpectrum.shortDesc,
      status: getPositiveMetricStatus(broadSpectrum.score)
    },
    {
      id: 'water',
      name: 'Sweat Resistance',
      score: waterResistance.score,
      displayScore: waterResistance.score,
      shortDesc: waterResistance.shortDesc,
      status: getPositiveMetricStatus(waterResistance.score)
    },
    {
      id: 'photoStability',
      name: 'Photo Stability',
      score: photostability.score,
      displayScore: photostability.score,
      shortDesc: photostability.shortDesc,
      status: getPositiveMetricStatus(photostability.score)
    },
    {
      id: 'visible-light',
      name: 'Visible Light',
      score: visibleLight.score,
      displayScore: visibleLight.score,
      shortDesc: visibleLight.shortDesc,
      status: getPositiveMetricStatus(visibleLight.score)
    },
    {
      id: 'irritation',
      name: 'Irritation Risk',
      score: irritationRisk.score,
      displayScore: irritationRisk.score > 0 ? 6 - irritationRisk.score : 0,
      shortDesc: irritationRisk.shortDesc,
      status: getRiskMetricStatus(irritationRisk.score)
    },
    {
      id: 'comedogenicity',
      name: 'Pore Clogging',
      score: poreClogging.score,
      displayScore: poreClogging.score > 0 ? 6 - poreClogging.score : 0,
      shortDesc: poreClogging.shortDesc,
      status: getRiskMetricStatus(poreClogging.score)
    },
    {
      id: 'white-cast',
      name: 'White Cast',
      score: whiteCast.score,
      displayScore: whiteCast.score > 0 ? 6 - whiteCast.score : 0,
      shortDesc: whiteCast.shortDesc,
      status: getRiskMetricStatus(whiteCast.score)
    }
  ];
}

function buildIngredientDetail(ingredient) {
  if (ingredient.isFlagged && ingredient.firstFlagDescription) {
    return ingredient.firstFlagDescription;
  }
  // return ingredient.detailDescription || '';
}

function getOverallScoreStatus(score) {
  if (score >= 85) {
    return 'Excellent';
  }

  if (score >= 70) {
    return 'Strong';
  }

  if (score >= 50) {
    return 'Moderate';
  }

  return 'Needs Review';
}

const performanceIconMap = {
  spf: Shield,
  uva: Sun,
  water: Droplets,
  photoStability: Sparkles,
  'visible-light': Eye,
  irritation: Activity,
  comedogenicity: Wind,
  'white-cast': Eye
};

function getPerformanceStatusLabel(factor) {
  const riskMetricIds = new Set(['irritation', 'comedogenicity', 'white-cast']);

  if (riskMetricIds.has(factor.id)) {
    if (factor.status === 'good') {
      return 'Low Risk';
    }

    if (factor.status === 'warning') {
      return 'Medium Risk';
    }

    return 'High Risk';
  }

  if (factor.status === 'good') {
    return 'Excellent';
  }

  if (factor.status === 'warning') {
    return 'Fair';
  }

  return 'Poor';
}

function buildPerfectMatches(matches) {
  const iconCycle = [Droplets, Activity, Sparkles, Shield];
  const toneCycle = ['blue', 'emerald', 'purple', 'amber'];

  return (matches || [])
    .filter((match) => Number(match.matchPercent || 0) > 80)
    .slice(0, 6)
    .map((match, index) => ({
      id: match.id || `${match.contextLabel}-${index}`,
      label: `${match.contextLabel} Skin`,
      href: match.pageHref || '/sunscreens',
      Icon: iconCycle[index % iconCycle.length],
      tone: toneCycle[index % toneCycle.length]
    }));
}

function getIngredientTone(ingredient, isActive) {
  if (ingredient.isFlagged) {
    return 'rose';
  }

  return isActive ? 'emerald' : 'slate';
}

function getIngredientBadge(ingredient, fallbackLabel) {
  return ingredient.source || fallbackLabel;
}

function IngredientRow({ ingredient, isActive }) {
  const detail = buildIngredientDetail(ingredient);
  const tone = getIngredientTone(ingredient, isActive);
  const badge = getIngredientBadge(ingredient, isActive ? 'UV Filter' : 'Skincare');
  const badgeText = 
    (isActive ? ingredient.protection_spectrums : ingredient.category) ||
    (isActive ? 'Active filter' : 'Supporting ingredient');
  const meta =
    (isActive ? ingredient.filterType : ingredient.sub_category) ||
    (isActive ? 'Active filter' : 'Supporting ingredient');
  const summaryContent = (
    <>
      <span className="ingredient-row__main">
        <span className={`ingredient-row__dot ingredient-row__dot--${tone}`} />
        <span className="ingredient-row__copy">
          <span className="ingredient-row__name">{ingredient.name} {detail ? <ChevronDown className="ingredient-row__chevron" aria-hidden="true" /> : null}</span>
          <span className="ingredient-row__meta">{meta}</span>
        </span>
      </span>
      <span className="ingredient-row__side">
        <span className={`ingredient-row__badge ingredient-row__badge--${tone}`}>{badgeText}</span>
        
      </span>
    </>
  );

  if (!detail) {
    return (
      <div className={`ingredient-row ingredient-row--${tone}`}>
        <div className="ingredient-row__summary">{summaryContent}</div>
      </div>
    );
  }

  return (
    <details className={`ingredient-row ingredient-row--${tone}`}>
      <summary className="ingredient-row__summary">{summaryContent}</summary>
      <p className="ingredient-row__detail">{detail}</p>
    </details>
  );
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

export default async function SunscreenDetailPage({ params }) {
  const { slug } = await params;
  // Load every skin context; the tabs pick the one named in ?context= in the browser.
  const pageData = await fetchProductDetailPageData(slug, '*');

  if (!pageData) {
    notFound();
  }

  const { product, evaluations, skinMatches, activeIngredients, inactiveIngredients } = pageData;
  const topMatches = skinMatches.filter((match) => match.isDefault);
  const performanceFactors = buildPerformanceFactors(evaluations);
  const brandForArt = (product.brandName || 'BRAND').slice(0, 10).toUpperCase();
  const galleryImages = product.imageLinks || [];
  const overallScore = Math.max(0, Math.min(100, Math.round(Number(product.overallScore) || 0)));
  const overallScoreStatus = getOverallScoreStatus(overallScore);
  const perfectMatches = buildPerfectMatches(topMatches);
  const displayProductName = formatProductDisplayName(product.productName);
  const spfBadge = formatSpfBadge(product.spfRating);
  const paBadge = formatPaBadge(product.paRating);
  const brand = await fetchBrandForProduct({ brandId: product.brandId, brandName: product.brandName });
  const brandHref = brand?.slug ? `/sunscreens/best/brand/${brand.slug}` : '';

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
              {brandHref ? (
                <Link href={brandHref} className="detail-intro__brand detail-intro__brand--link">
                  {product.brandName}
                </Link>
              ) : (
                <div className="detail-intro__brand">{product.brandName}</div>
              )}
              <h1 className="detail-intro__title">{displayProductName} : Ingredients &amp; Skin Analysis.</h1>
              <div className="detail-badge-row">
                {/* {topMatches[0]?.contextLabel ? (
                  <span className="detail-badge detail-badge--lime">{topMatches[0].contextLabel}</span>
                ) : null} */}
                {spfBadge ? <span className="detail-badge detail-badge--lime">{spfBadge}</span> : null}
                {paBadge ? <span className="detail-badge detail-badge--lime">{paBadge}</span> : null}
                <span className="detail-badge detail-badge--lime">{product.filterType}</span>
                <span className="detail-badge detail-badge--lime">{product.productFormat}</span>
              </div>

              <p className="detail-intro__desc">
                {product.overallPros[0] ||
                  'Sunscreen detail page showing product-level scoring, persona matches, and ingredient analysis.'}
              </p>

              <div className="detail-overall-score">
                <div className="detail-overall-score__value">{overallScore}</div>
                <div className="detail-overall-score__copy">
                  <div className="detail-overall-score__headline">
                    <span className="detail-overall-score__status">{overallScoreStatus}</span>
                    <span className="detail-overall-score__pill">Overall Rating</span>
                  </div>
                  <span className="detail-overall-score__note">Based on formula analysis</span>
                </div>
              </div>

              {perfectMatches.length > 0 ? (
                <section className="detail-perfect-match" aria-labelledby="perfect-match-title">
                  <h2 id="perfect-match-title" className="detail-perfect-match__title">Most Suitable For</h2>
                  <div className="detail-perfect-match__list">
                    {perfectMatches.map(({ id, label, href, Icon, tone }) => (
                      <Link key={id} href={href} className={`detail-perfect-match__pill detail-perfect-match__pill--${tone}`}>
                        <Icon className="detail-perfect-match__icon" aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {product.productBuyLink ? (
                <div>
                <a
                  className="detail-buy-link"
                  href={product.productBuyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                Buy on Amazon
                </a></div>
              ) : null}
            </div>

            <hr className="detail-divider" />

            <section className="detail-block">
              <h2 className="detail-block__title">Skin Type Match</h2>
              {topMatches.length > 0 ? (
                <SkinMatchTabs matches={topMatches} allMatches={skinMatches} />
              ) : (
                <div className="detail-empty-state">No persona-specific skin match data is available yet.</div>
              )}
            </section>

            <hr className="detail-divider" />

            <section className="detail-block">
              <h2 className="detail-block__title">Performance Scores</h2>
              <div className="detail-factors">
                {performanceFactors.map((factor) => {
                  const Icon = performanceIconMap[factor.id] || Shield;
                  const statusLabel = getPerformanceStatusLabel(factor);

                  return (
                    <details key={factor.id} className={`detail-factor detail-factor--${factor.status}`}>
                      <summary className="detail-factor__top">
                        
                        <div className="detail-factor__title-row">
                          <div className="detail-factor__title-left">
                            <span className={`detail-factor__icon detail-factor__icon--${factor.status}`}>
                              <Icon size={16} aria-hidden="true" />
                            </span>

                            <h3 className="detail-factor__name">{factor.name}</h3>
                          </div>

                          <ChevronDown className="detail-factor__chevron" aria-hidden="true" />
                        </div>

                        <div className="detail-factor__score">
                          <span className={`detail-factor__status detail-factor__status--${factor.status}`}>
                            {statusLabel}
                          </span>

                          <div className="detail-scorebar" aria-hidden="true">
                            {[1, 2, 3, 4, 5].map((dot) => (
                              <span
                                key={`${factor.id}-${dot}`}
                                className={`detail-scorebar__dot ${
                                  dot <= factor.displayScore
                                    ? `detail-scorebar__dot--${factor.status}`
                                    : 'detail-scorebar__dot--off'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                      </summary>

                      <p className="detail-factor__desc">{factor.shortDesc}</p>
                    </details>
                  );
                })}
              </div>
            </section>

            <hr className="detail-divider" />

            <section className="detail-block">
              <div className="ingredients-analysis">
                <h2 className="ingredients-analysis__heading">Ingredients Analysis</h2>

                <div className="ingredients-analysis__sections">
                  <section className="ingredients-analysis__section">
                    <h3 className="ingredients-analysis__title">Active Filters</h3>
                    <div className="ingredient-list">
                      {activeIngredients.length > 0 ? (
                        activeIngredients.map((ingredient) => (
                          <IngredientRow key={ingredient.id} ingredient={ingredient} isActive />
                        ))
                      ) : (
                        <div className="detail-empty-state">No active filter rows are available yet.</div>
                      )}
                    </div>
                  </section>

                  <section className="ingredients-analysis__section">
                    <h3 className="ingredients-analysis__title">Key Inactive Ingredients</h3>
                    <div className="ingredient-list">
                      {inactiveIngredients.length > 0 ? (
                        inactiveIngredients.map((ingredient) => (
                          <IngredientRow key={ingredient.id} ingredient={ingredient} isActive={false} />
                        ))
                      ) : (
                        <div className="detail-empty-state">No supporting ingredient rows are available yet.</div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
