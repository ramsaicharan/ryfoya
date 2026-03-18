import Link from 'next/link';
import { Heart, Shield, Sparkles, Microscope, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'About Ryfoya',
  description:
    "Learn why Ryfoya exists, how we evaluate skincare, and why we focus on clear, evidence-based sunscreen recommendations."
};

const PRINCIPLES = [
  {
    icon: Microscope,
    title: 'Science First',
    text: 'Every recommendation is backed by peer-reviewed dermatological research.'
  },
  {
    icon: Shield,
    title: 'Radical Transparency',
    text: 'We tell you exactly why a product is good or bad for you. No secrets.'
  },
  {
    icon: Heart,
    title: 'Skin Positivity',
    text: `We focus on healthy skin, not "perfect" skin. Every skin type is beautiful.`
  }
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="wrap about-hero__inner">
          <span className="about-pill">Our Story</span>
          <h1 className="about-hero__title">
            Skincare shouldn&apos;t be <br className="about-hero__break" />
            <span className="about-hero__accent">a guessing game.</span>
          </h1>
          <p className="about-hero__desc">
            We built Ryfoya because we were tired of misleading marketing and confusing ingredient
            lists. We believe everyone deserves to know exactly what they&apos;re putting on their skin.
          </p>
        </div>
      </section>

      <section className="about-section">
        <div className="wrap about-grid">
          <div className="about-copy">
            <h2 className="about-section__title">
              The beauty industry is broken. <br className="about-section__break" />
              <span className="about-section__accent">We&apos;re fixing it.</span>
            </h2>
            <p className="about-section__text">
              For too long, finding the right skincare has meant trial and error, wasted money, and
              compromised skin barriers. Brands hide behind complex chemical names and empty promises.
            </p>
            <p className="about-section__text">
              We decided to change that. By combining advanced AI with real dermatological science,
              we&apos;ve created a system that cuts through the noise and finds what actually works for
              your unique skin.
            </p>
          </div>

          <div className="about-principles">
            {PRINCIPLES.map((principle) => (
              <article className="about-principle" key={principle.title}>
                <div className="about-principle__icon-wrap" aria-hidden="true">
                  <principle.icon className="about-principle__icon" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="about-principle__title">{principle.title}</h3>
                  <p className="about-principle__text">{principle.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-section--white">
        <div className="wrap about-center">
          <Sparkles className="about-center__sparkle" strokeWidth={2} />
          <h2 className="about-section__title">Human Expertise + AI Precision</h2>
          <p className="about-section__text about-section__text--wide">
            Ryfoya isn&apos;t just an algorithm. It is dermatologist-led product reasoning, scaled by
            structured analysis. Our systems can process ingredient lists and formula tradeoffs
            quickly, but the evaluation logic stays grounded in medical and cosmetic science.
          </p>
        </div>
      </section>

      <section className="about-cta">
        <div className="wrap">
          <div className="about-cta__panel">
            <h2 className="about-cta__title">
              Ready to explore sunscreens for
              <span className="about-cta__accent"> different skin types?</span>
            </h2>
            <p className="about-cta__desc">
              Compare sunscreen recommendations across oily, dry, combination, and sensitive skin
              contexts with transparent scoring and ingredient analysis.
            </p>
            <Link className="about-cta__button" href="/sunscreens">
              Check out sunscreens <ArrowRight className="about-cta__arrow" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
