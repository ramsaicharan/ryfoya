import { Database, FileText, Lock, Mail, UserCheck } from 'lucide-react';
import { buildAlternates } from '../../src/lib/site-data';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'Read how Ryfoya collects, stores, and uses account, skin profile, analytics, and product interaction data.',
  alternates: buildAlternates('/privacy')
};

const PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    icon: FileText,
    toneClass: 'legal-card__icon--purple',
    paragraphs: [
      `Ryfoya may collect account information such as your email address when you create an account or sign in with Google.`,
      `If you complete your profile, we store your selected or typed skin type, skin condition, age group, and skin tone so we can support personalized sunscreen recommendations later.`,
      `We also collect basic technical and usage information, such as page visits and interaction events, to understand site performance and improve the product experience.`
    ]
  },
  {
    title: '2. How We Use Your Information',
    icon: UserCheck,
    toneClass: 'legal-card__icon--teal',
    paragraphs: [
      `We use account information to authenticate you, keep your profile connected to your account, and allow you to update your saved preferences.`,
      `We use skin profile information to prepare for personalized product matching. In this first stage, these preferences are saved but do not yet change product rankings or recommendations.`,
      `We use analytics and site performance data to maintain Ryfoya, diagnose issues, and improve page speed, navigation, and product discovery.`
    ]
  },
  {
    title: '3. Storage & Security',
    icon: Lock,
    toneClass: 'legal-card__icon--orange',
    paragraphs: [
      `Account authentication and profile storage are handled through Supabase. Profile records are protected with row-level security so users can access only their own saved profile data.`,
      `No internet-connected service can be guaranteed perfectly secure, but we use reasonable technical controls and avoid collecting sensitive information that is not needed for the product experience.`
    ]
  },
  {
    title: '4. Sharing & Third Parties',
    icon: Database,
    toneClass: 'legal-card__icon--blue',
    paragraphs: [
      `Ryfoya does not sell your skin profile information.`,
      `We may use third-party services for authentication, hosting, analytics, and affiliate links. These services process limited information needed to provide those functions.`,
      `When you click an external purchase link, you leave Ryfoya and the merchant or affiliate network may process your activity under its own privacy practices.`
    ]
  },
  {
    title: '5. Your Choices',
    icon: Mail,
    toneClass: 'legal-card__icon--purple',
    paragraphs: [
      `You can update your saved skin profile from your profile page while signed in.`,
      `You can choose not to complete your skin profile. Ryfoya will continue to show general sunscreen information without personalized profile matching.`,
      `For account or privacy requests, contact the Ryfoya team through the contact method provided on the site or through the channel where you originally reached us.`
    ]
  }
];

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="wrap legal-hero__inner">
          <div className="legal-hero__icon">
            <Lock size={32} strokeWidth={2} />
          </div>
          <h1 className="legal-hero__title">
            Privacy <span className="legal-hero__accent">Policy</span>
          </h1>
          <p className="legal-hero__desc">
            Ryfoya keeps privacy practical: collect only what helps the product work, protect saved
            profile data, and make it clear how account and skin context information is used.
          </p>
        </div>
      </section>

      <section className="legal-content">
        <div className="wrap legal-content__inner">
          <div className="legal-stack">
            {PRIVACY_SECTIONS.map((section) => {
              const Icon = section.icon;

              return (
                <article className="legal-card" key={section.title}>
                  <div className="legal-card__head">
                    <div className={`legal-card__icon ${section.toneClass}`}>
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <h2 className="legal-card__title">{section.title}</h2>
                  </div>
                  <div className="legal-card__body">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.title}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
