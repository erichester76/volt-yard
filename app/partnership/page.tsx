"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const levels = [
  ["Verified Specialty / Infrastructure", "specialist"],
  ["Certified Partner", "certified"],
  ["Network Leader", "leader"],
] as const;

function LevelBadge({ level }: { level: typeof levels[number][1] }) {
  const label = level === "specialist" ? "VERIFIED" : level === "certified" ? "CERTIFIED" : "LEADER";
  const mark = level === "specialist" ? <path d="M50 34 64 42v16L50 66 36 58V42zM42 50h16M50 42v16" /> : level === "certified" ? <path d="M50 33 64 38v11c0 9-5.8 15-14 19-8.2-4-14-10-14-19V38zM43 50l5 5 10-11" /> : <path d="m50 33 4.4 11.6L66 49l-11.6 4.4L50 65l-4.4-11.6L34 49l11.6-4.4z" />;
  return <svg className="partnership-level-badge" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="38" /><text x="50" y="17" textAnchor="middle">AMPED UP</text><text x="50" y="27" textAnchor="middle">NETWORK</text>{mark}<text x="50" y="84" textAnchor="middle">{label}</text></svg>;
}

export default function PartnershipPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return <main className="partnership-page">
    <section className="hero partnership-hero"><div className="wrap">
      <p className="eyebrow">For independent EV businesses</p>
      <h1 className="heading-primary">{t("partnership.title", "Your brand. Your revenue. Your customer.")}</h1>
      <p className="intro">Amped Up Network is not a franchise. You retain your brand, pricing, operations, customer relationship, and the work you choose to accept. You quote, contract, bill, and warranty your work directly.</p>
      <p className="partnership-hero-detail">We are the marketing front door, referral network, and shared-growth community for your EV future. We do not take a percentage of your sale, and any membership, fixed verified-booking fee, managed-service, or expert-work terms are disclosed before you participate. We do not promise lead volume, earnings, or certification.</p>
    </div></section>

    <section className="partnership-story"><div className="wrap">
      <p className="eyebrow">The problem</p>
      <h2>Your EV capability may be real. Your visibility probably is not.</h2>
      <p>You run a specialist shop, but few people know what you can do for an EV. You are busy serving traditional work. You do not have time to chase a fractured EV community across social media, forums, and local groups just to get your name out. You may be an electrician looking for charger installs, a wrap shop ready to work on Cybertrucks, or an established ICE shop building a serious EV practice. In each case, you need a clearer way into the market and a partner that understands how to grow there.</p>
      <div className="partnership-story-bridge"><p className="eyebrow">Why visibility is different in EV</p><h3>EV owners look for answers before they look for vendors.</h3><p>They compare notes in communities, search social media, and learn in forums before they call a shop. That is why a capable specialist can stay invisible. Amped Up helps your business show up in that conversation with a profile that explains your actual scope, and with a community presence that earns trust over time. You market your own brand by participating, sharing useful expertise, supporting education, and delivering work that owners can stand behind.</p></div>
      <div className="partnership-seal-row">{levels.map(([title, level]) => <div key={level}><LevelBadge level={level} /><span>{title}</span></div>)}</div>
      <p className="partnership-story-note">Training, verified outcomes, and useful participation create a path to higher levels when they are available for your specialty. We do not publish an opaque score or make a quality claim your evidence does not support.</p>
    </div></section>

    <section className="partnership-story"><div className="wrap">
      <p className="eyebrow">A better appointment starts earlier</p>
      <h2>You keep the customer. We keep the context.</h2>
      <p>Typical intake means reverse-engineering a customer's history, their current problem, and the work that has already been attempted. Amped Up keeps the owner-controlled record of the vehicle, issue notes, prior service, photos, and documents so the right context can travel with permission into the service conversation.</p>
      <p>Owners can organize a concern before they reach you and, where useful, learn from the community first. That is not a remote diagnosis or an automatic assignment. It is a qualified starting point that helps your team spend less time rebuilding the story and more time doing the work. Future permissioned Connected Garage data may add relevant vehicle context before an appointment when available; it will never replace your inspection or diagnose a vehicle for you.</p>
    </div></section>

    <section className="partnership-story"><div className="wrap">
      <p className="eyebrow">A network that creates demand</p>
      <h2>We build the interest. You build the trust.</h2>
      <p>The network is designed to create interest in EV ownership support and, ultimately, in the partners who make that support real. We bring together launch marketing, social content, local events, owner education, paid advertising where appropriate, practical tools, training, and community infrastructure. You participate, provide good service, and focus on growing in the EV space with a community that wants every capable member to succeed.</p>
    </div></section>

    <section className="partnership-close"><div className="wrap"><p className="eyebrow">Ready to build your EV future?</p><h2>Bring your expertise. We will help open the right doors.</h2><p>Tell us what you do, where you work, and the owners you serve. We will start with the right application and discuss the network path that fits your business.</p><Link className="inline-cta" href="/portal">Start your partner application</Link></div></section>
  </main>;
}
