import Link from 'next/link';
import {
  Search,
  ShieldCheck,
  Users,
  Smile,
  UserCheck,
  Star,
  Droplet,
  Cloud,
  HandHeart,
  CheckCircle2,
  HeartHandshake,
  ArrowRight
} from 'lucide-react';

export const metadata = {
  title: 'How Ryfoya Works',
  description:
    'See how Ryfoya evaluates ingredients, product performance, safety, and skin-context fit before recommending sunscreens.',
  alternates: {
    canonical: '/how-it-works'
  }
};

const agents = [
  {
    name: 'Performance Checker',
    icon: Star,
    desc: 'Looks at the main ingredients to see if they actually do what they promise.'
  },
  {
    name: 'Safety Checker',
    icon: ShieldCheck,
    desc: 'Makes sure there is nothing inside that could irritate your skin or cause allergies.'
  },
  {
    name: 'Pore & Breakout Checker',
    icon: Droplet,
    desc: 'Checks if the product might clog your pores or cause breakouts.'
  },
  {
    name: 'Hydration Checker',
    icon: Cloud,
    desc: 'Measures how well the product moisturizes and protects your skin barrier.'
  },
  {
    name: 'Feel & Finish Checker',
    icon: HandHeart,
    desc: 'Looks at how the product feels on your skin, its texture, and if it plays well with others.'
  }
];

const steps = [
  {
    id: '01',
    title: 'Reading the Label',
    subtitle: "What's inside?",
    description:
      'We look at every single ingredient on the back of the bottle. Our system figures out exactly what each ingredient does and how much of it is in the product, so nothing is hidden from you.',
    icon: Search,
    toneClass: 'how-step__tone--blue',
    visual: (
      <div className="how-codecard">
        <div className="how-codecard__head">
          <Search size={16} />
          <span>Looking closely...</span>
        </div>
        <div className="how-codecard__rows">
          <div className="how-codecard__row">
            <span>Niacinamide</span>
            <span>Main Ingredient</span>
          </div>
          <div className="how-codecard__row">
            <span>Sodium Hyaluronate</span>
            <span>Hydrator</span>
          </div>
          <div className="how-codecard__row">
            <span>Ceramide NP</span>
            <span>Barrier Support</span>
          </div>
          <div className="how-codecard__row">
            <span>Salicylic Acid</span>
            <span>Pore Cleanser</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: '02',
    title: 'Safety Check',
    subtitle: 'Is it safe for you?',
    description:
      'We check every ingredient against the latest skin science. We look out for things that might cause allergies, irritate your skin, or harm the environment, making sure the product is truly safe to use.',
    icon: HeartHandshake,
    toneClass: 'how-step__tone--green',
    visual: (
      <div className="how-badges">
        <span className="how-badge how-badge--green">
          <CheckCircle2 size={12} /> Gentle on Skin
        </span>
        <span className="how-badge how-badge--green">
          <CheckCircle2 size={12} /> Won&apos;t Clog Pores
        </span>
        <span className="how-badge how-badge--purple">
          <CheckCircle2 size={12} /> Fragrance-Free
        </span>
        <span className="how-badge how-badge--neutral">
          <CheckCircle2 size={12} /> No Drying Alcohols
        </span>
      </div>
    )
  },
  {
    id: '03',
    title: 'Deep Product Review',
    subtitle: 'Looking at the big picture',
    description:
      'Our team of smart digital helpers looks at the product from every angle. They check up to 30 different details like how moisturizing it is, how it feels on the skin, and if it might cause breakouts.',
    icon: Users,
    toneClass: 'how-step__tone--purple',
    visual: (
      <div className="how-agent-grid">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.name} className="how-agent-card">
              <div className="how-agent-card__icon">
                <Icon size={18} />
              </div>
              <div>
                <h4 className="how-agent-card__title">{agent.name}</h4>
                <p className="how-agent-card__desc">{agent.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    )
  },
  {
    id: '04',
    title: 'Your Personal Match',
    subtitle: 'Made for your skin',
    description:
      'A product that works for someone else might not work for you. We take everything we learned about the product and compare it to your unique skin type, age, and concerns to give you a personalized match score.',
    icon: Smile,
    toneClass: 'how-step__tone--orange',
    visual: (
      <div className="how-match-card">
        <div className="how-match-card__glow how-match-card__glow--lime" />
        <div className="how-match-card__glow how-match-card__glow--purple" />
        <div className="how-match-card__avatar">
          <Smile size={32} />
        </div>
        <div className="how-match-card__tags">
          <span>Oily</span>
          <span>Acne-Prone</span>
          <span>Sensitive</span>
        </div>
        <div className="how-match-card__score">92% Match</div>
      </div>
    )
  },
  {
    id: '05',
    title: 'Doctor Approved',
    subtitle: 'Real human experts',
    description:
      'While our technology does the heavy lifting, human experts have the final say. Real skin doctors review our matching system to make sure our recommendations are safe, accurate, and trustworthy.',
    icon: UserCheck,
    toneClass: 'how-step__tone--teal',
    visual: (
      <div className="how-doctor-card">
        <div className="how-doctor-card__avatar">
          <UserCheck size={24} />
        </div>
        <div>
          <h4 className="how-doctor-card__title">Doctor Verified</h4>
          <p className="how-doctor-card__desc">Approved by Dr. Sarah Jenkins, Dermatologist</p>
          <div className="how-doctor-card__signature" aria-hidden="true">
            <svg width="80" height="24" viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M2 25C15 10 25 5 35 15C45 25 50 20 60 10C70 0 80 15 98 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    )
  }
];

export default function HowItWorksPage() {
  return (
    <main className="how-page">
      <section className="how-hero">
        <div className="wrap how-hero__inner">
          <span className="about-pill">The Science Behind The Score</span>
          <h1 className="how-hero__title">
            How we find your <br className="how-hero__break" />
            <span className="how-hero__accent">perfect match.</span>
          </h1>
          <p className="how-hero__desc">
            We do not just guess what works. Our system looks at every ingredient, checks how the
            product performs, and compares it against the needs of different skin contexts.
          </p>
        </div>
      </section>

      <section className="how-steps">
        <div className="wrap">
          <div className="how-steps__stack">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.id}
                  className={`how-step ${index % 2 === 1 ? 'how-step--reverse' : ''}`}
                >
                  <div className="how-step__copy">
                    <div className="how-step__head">
                      <span className="how-step__id">{step.id}</span>
                      <span className={`how-step__icon ${step.toneClass}`}>
                        <Icon size={24} />
                      </span>
                    </div>
                    <div>
                      <h2 className="how-step__title">{step.title}</h2>
                      <h3 className="how-step__subtitle">{step.subtitle}</h3>
                      <p className="how-step__desc">{step.description}</p>
                    </div>
                  </div>

                  <div className="how-step__visual-shell">
                    <div className="how-step__visual-bg" />
                    <div className="how-step__visual">{step.visual}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="how-cta">
        <div className="wrap">
          <div className="about-cta__panel">
            <h2 className="about-cta__title">
              Ready to compare more
              <span className="about-cta__accent"> sunscreens?</span>
            </h2>
            <p className="about-cta__desc">
              Browse sunscreen rankings and skin-context pages to see how the evaluation logic shows
              up in real product recommendations.
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
