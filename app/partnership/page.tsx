"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const levels = [
  ["Verified Specialty / Infrastructure", "For electrical, charging, appearance, protection, and aftermarket businesses. We verify the business, required credentials, service scope, and profile details for the partner class.", "specialist"],
  ["Certified Partner", "For core EV repair partners that complete the network's readiness, safety, training, warranty, and customer-experience standards.", "certified"],
  ["Network Leader", "For established Certified Partners with sustained outcomes and a meaningful contribution to education, events, and the local EV community.", "leader"],
] as const;

const offerings = [
  ["A front door built for EV owners", "We help turn your real capabilities into a clear EV-specific profile, an honest offer, launch materials, and local visibility. Great work should not be invisible because you are busy running the shop."],
  ["Tools and training that improve the handoff", "Use practical intake context, service scope, customer-experience preparation, and training designed around how EV owners actually need help. Less repeated explaining. Better-prepared conversations."],
  ["A community that helps every member grow", "Market your own brand by showing up with useful expertise. Community participation, education, local events, verified outcomes, and certification create trust that a generic directory cannot."],
] as const;

function LevelBadge({ level }: { level: typeof levels[number][2] }) {
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
      <h1 className="heading-primary">{t("partnership.title", "Your brand. Your shop. Your revenue.")}</h1>
      <p className="intro">Amped Up Network is the marketing front door, referral network, and shared-growth community for businesses building the next generation of EV service.</p>
      <div className="partnership-tags" aria-label="Partner value proposition"><span>Qualified clients</span><span>Qualified experts</span><span>Better context</span></div>
    </div></section>
    <section className="partnership-opportunity"><div className="wrap">
      <p className="eyebrow">Connecting qualified clients to qualified experts</p>
      <h2>Great EV work needs a better way to be found.</h2>
      <p>Most independent shops were built to do excellent work, not to become EV marketers or community builders. Amped Up gives you the infrastructure to tell your story, earn trust, and meet owners who are already looking for the kind of help you provide.</p>
    </div></section>
    <section className="partnership-handoff"><div className="wrap">
      <div><p className="eyebrow">A better handoff</p><h2>You keep the customer. We keep the context.</h2></div>
      <div className="partnership-handoff-copy"><p>You quote, contract, bill, perform, and warranty your work. Your customer relationship stays yours. Amped Up helps the right owner arrive with permissioned vehicle details, service history, notes, photos, and a clearly stated need.</p><p>That need has already been organized through the owner's records and, where useful, informed by the community. It is not a diagnosis or an automatic assignment. It is a better starting point for the conversation your team needs to have.</p></div>
    </div></section>
    <section className="partnership-offerings"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">What you join</p><h2>Not a franchise. A community built to make independent EV businesses stronger.</h2><p>You pay to join a community where members help one another grow, while retaining their own brand, business, and revenue.</p></div>
      <div className="partnership-offering-grid">{offerings.map(([title, intro]) => <article key={title}><h3>{title}</h3><p>{intro}</p></article>)}</div>
    </div></section>
    <section className="partnership-growth"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">Grow into the network</p><h2>Build credibility over time, not just a listing.</h2><p>Start with the level that fits your work today. As your training, evidence, outcomes, and contribution grow, eligible partners can move through the program levels available for their specialty.</p></div>
      <div className="partnership-level-grid">{levels.map(([title, intro, badge]) => <article key={title}><LevelBadge level={badge} /><h3>{title}</h3><p>{intro}</p></article>)}</div>
    </div></section>
    <section className="partnership-terms"><div className="wrap"><p className="eyebrow">Clear terms, shared growth</p><h2>Know what you are joining before you join it.</h2><p>We discuss launch support, ongoing participation, direct referrals, managed services, and expert work in writing before you say yes. Fixed completed-booking fees apply only to verified qualifying work where that model is used. Paid managed-service and expert opportunities disclose scope and partner payout before acceptance. We do not promise lead volume, earnings, or certification.</p></div></section>
    <section className="partnership-close"><div className="wrap"><p className="eyebrow">Ready to build your EV future?</p><h2>Bring your expertise. We will help open the right doors.</h2><p>Tell us what you do, where you work, and the owners you serve. We will start with the right application and discuss the network path that fits your business.</p><Link className="inline-cta" href="/portal">Start your partner application</Link></div></section>
  </main>;
}
