"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const levels = [
  ["Verified Specialty", "specialist"],
  ["Partner", "partner"],
  ["Network Leader", "leader"],
] as const;

function LevelBadge({ level }: { level: typeof levels[number][1] }) {
  const label = level === "specialist" ? "VERIFIED" : level === "partner" ? "PARTNER" : "LEADER";
  const id = `partnership-badge-${level}`;
  const mark = level === "specialist" ? <><path d="M50 36 62 43v14L50 64 38 57V43z" /><path d="M43 50h14M50 43v14" /></> : level === "partner" ? <><path d="M50 35 63 40v11c0 8.5-5.4 14.2-13 18-7.6-3.8-13-9.5-13-18V40z" /><path d="m43 51 5 5 10-11" /></> : <><path d="m50 36 4.4 10.6L65 51l-10.6 4.4L50 66l-4.4-10.6L35 51l10.6-4.4z" /><path d="M50 68v7M43 75h14" /></>;
  return <svg className="partnership-level-badge" viewBox="0 0 100 100" aria-hidden="true"><defs><path id={`${id}-arc`} d="M22 54a28 28 0 0 1 56 0" /></defs><circle className="partnership-badge-outer" cx="50" cy="50" r="46" /><circle className="partnership-badge-inner" cx="50" cy="50" r="37" /><text className="partnership-badge-wordmark"><textPath href={`#${id}-arc`} startOffset="50%" textAnchor="middle">AMPED UP</textPath></text><circle className="partnership-badge-dot" cx="22" cy="50" r="1.5" /><circle className="partnership-badge-dot" cx="78" cy="50" r="1.5" /><g className="partnership-badge-mark">{mark}</g><path className="partnership-badge-ribbon" d="M25 74h50v12H25z" /><text className="partnership-badge-level" x="50" y="82" textAnchor="middle">{label}</text></svg>;
}

function StoryArtwork({ number, label }: { number: string; label: string }) {
  return <div className="partnership-story-art" aria-hidden="true"><span>{number}</span><strong>{label}</strong><i /></div>;
}

export default function PartnershipPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return <main className="partnership-page">
    <section className="hero partnership-hero"><div className="wrap">
      <h1 className="heading-primary">{t("partnership.title", "Your Brand. Our Community. Stronger Together.")}</h1>
      <p className="intro">Built for independent businesses. You retain your brand, pricing, operations, customer relationship, and work. You quote, bill, and warranty directly.</p>
      <p className="partnership-hero-detail">Amped Up helps create demand through marketing, referrals, and community. We do not take a percentage of your sale; participation terms are disclosed upfront. We do not promise lead volume, earnings, or certification.</p>
      <Link className="inline-cta" href="/portal">Start your partner application</Link>
    </div></section>

    <section className="partnership-story"><div className="wrap partnership-story-layout">
      <div className="partnership-story-copy"><h2>Your EV capability may be real. Your visibility probably is not.</h2>
        <p>You run a specialist shop, but few people know what you can do for an EV. You are busy serving traditional work. You do not have time to chase a fractured EV community across social media, forums, and local groups just to get your name out. You may be an electrician looking for charger installs, a wrap shop ready to work on Cybertrucks, or an established ICE shop building a serious EV practice. In each case, you need a clearer way into the market and a partner that understands how to grow there.</p>
        <div className="partnership-story-bridge"><h3>People look for their own answers before they look for a vendor.</h3><p>They search, ask AI tools, watch videos, compare notes in communities, and learn in forums before they call a shop. Technical EV owners often take that research even further. We are building Amped Up as a trusted place for that work: a place where owners can learn, organize a problem, and find the right next step. Your business can be on the inside of that conversation, with a profile that explains your actual scope and a community presence that earns trust over time. You market your own brand by participating, sharing useful expertise, supporting education, and delivering work that owners can stand behind.</p></div>
      </div><StoryArtwork number="01" label="Be found" />
    </div></section>

    <section className="partnership-story"><div className="wrap partnership-story-layout partnership-story-layout-reverse">
      <StoryArtwork number="02" label="Arrive ready" /><div className="partnership-story-copy"><h2>You keep the customer. We organize the details.</h2>
        <p>Typical intake means reverse-engineering a customer's history, their current problem, and the work that has already been attempted. Amped Up keeps the owner-controlled record of the vehicle, issue notes, prior service, photos, and documents so the right details can travel with permission into the service conversation.</p>
        <p>Owners can organize a concern before they reach you and, where useful, learn from the community first. That is not a remote diagnosis or an automatic assignment. It is a qualified starting point that helps your team spend less time rebuilding the story and more time doing the work. Future permissioned Connected Garage data may add relevant vehicle details before an appointment when available; it will never replace your inspection or diagnose a vehicle for you.</p>
      </div>
    </div></section>

    <section className="partnership-story"><div className="wrap partnership-story-layout">
      <div className="partnership-story-copy"><h2>Our Demand. Your Customer. Your Revenue.</h2>
        <p>The network is designed to create interest in EV ownership support and, ultimately, in the partners who make that support real. We bring together launch marketing, social content, local events, owner education, paid advertising where appropriate, practical tools, training, and community infrastructure. You participate, provide good service, and focus on growing in the EV space with a community that wants every capable member to succeed.</p>
      </div><StoryArtwork number="03" label="Build demand" />
    </div></section>

    <section className="partnership-standards"><div className="wrap">
      <div className="home-section-heading"><h2>We make the standard clear, then help you meet it.</h2><p>Certification is not something a business buys. It is a class-specific review of the work you do and the evidence behind it.</p></div>
      <div className="partnership-standards-grid">
        <div><h3>What we review</h3><ul><li>Your business, licenses, insurance, and stated service area.</li><li>Your EV capability, supported vehicles, tools, training, safety process, and scope.</li><li>Your customer experience, service terms, warranty disclosures, and verified outcomes.</li><li>Your community participation and the evidence that supports your program level.</li></ul></div>
        <div><h3>What we build with you</h3><p>A credible public profile. A practical readiness and training plan. Clear service and member offers. Launch materials that fit your specialty. A better way to explain your work to owners before they ever call the shop.</p><p>If a business is not ready for a level yet, the next step is not a fake badge. It is a clear plan for what to strengthen, learn, document, or prove next.</p></div>
      </div>
      <div className="partnership-seal-row">{levels.map(([title, level]) => <div key={level}><LevelBadge level={level} /><span>{title}</span></div>)}</div>
      <p className="partnership-story-note">Training, verified outcomes, and useful participation create a path to higher levels when they are available for your specialty. We do not publish an opaque score or make a quality claim your evidence does not support.</p>
    </div></section>

    <section className="partnership-close"><div className="wrap"><h2>Bring your expertise. We will help open the right doors.</h2><p>Tell us what you do, where you work, and the owners you serve. We will start with the right application and discuss the network path that fits your business.</p><Link className="inline-cta" href="/portal">Start your partner application</Link></div></section>
  </main>;
}
