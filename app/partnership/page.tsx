"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const levels = [
  ["partnership.level_specialist", "Verified Specialty / Infrastructure", "partnership.level_specialist_intro", "For electrical, charging, appearance, protection, and aftermarket businesses. We verify the business, required credentials, service scope, and profile details for the partner class.", "specialist"],
  ["partnership.level_certified", "Certified Partner", "partnership.level_certified_intro", "Reserved for core EV repair partners that complete the network's readiness, safety, training, warranty, and customer-experience standards.", "certified"],
  ["partnership.level_leader", "Network Leader", "partnership.level_leader_intro", "For established Certified Partners with sustained outcomes and a meaningful contribution to education, events, and the local EV community.", "leader"],
] as const;

const commercialTerms = [
  ["partnership.commercial_launch", "Launch support", "partnership.commercial_launch_intro", "Your launch track is matched to your work. It may include profile development, scope and credential review, team training, customer-experience preparation, and class-appropriate launch support."],
  ["partnership.commercial_ongoing", "Ongoing participation", "partnership.commercial_ongoing_intro", "Direct referrals keep the customer relationship and work with your shop: you quote, contract, bill, and warranty it. A fixed completed-booking fee may apply only to verified qualifying work, never a percentage of your sale."],
  ["partnership.commercial_payout", "Paid work and expert contributions", "partnership.commercial_payout_intro", "When paid managed-service or expert work is offered, the scope and partner payout are disclosed before acceptance. Payout records are administered manually; automated transfers are not available."],
] as const;

function LevelBadge({ level }: { level: typeof levels[number][4] }) {
  const label = level === "specialist" ? "VERIFIED" : level === "certified" ? "CERTIFIED" : "LEADER";
  const mark = level === "specialist" ? <path d="M50 34 64 42v16L50 66 36 58V42zM42 50h16M50 42v16" /> : level === "certified" ? <path d="M50 33 64 38v11c0 9-5.8 15-14 19-8.2-4-14-10-14-19V38zM43 50l5 5 10-11" /> : <path d="m50 33 4.4 11.6L66 49l-11.6 4.4L50 65l-4.4-11.6L34 49l11.6-4.4z" />;
  return <svg className="partnership-level-badge" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="38" />
    <text x="50" y="17" textAnchor="middle">AMPED UP</text><text x="50" y="27" textAnchor="middle">NETWORK</text>
    {mark}<text x="50" y="84" textAnchor="middle">{label}</text>
  </svg>;
}

export default function PartnershipPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return <main className="partnership-page">
    <section className="hero partnership-hero"><div className="wrap">
      <p className="eyebrow">{t("partnership.eyebrow", "For EV businesses")}</p>
      <h1 className="heading-primary">{t("partnership.title", "Your brand. Your shop.")}</h1>
      <p className="intro">{t("partnership.intro", "A reviewed referral and advisory network for EV repair, electrical, appearance, and aftermarket specialists.")}</p>
    </div></section>
    <section className="partnership-case"><div className="wrap">
      <p className="eyebrow">{t("partnership.case_eyebrow", "More than a listing")}</p>
      <h2>{t("partnership.case_title", "Connecting qualified clients to qualified shops.")}</h2>
      <p>{t("partnership.case_intro", "Amped Up Network is not a franchise. You retain your brand, pricing, operations, customer relationship, and the work you choose to take on. We are a referral and advisory network: a front door that helps owners understand who is a fit and advocates for clear, qualified partner choices.")}</p>
    </div></section>
    <section className="partnership-program"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.program_eyebrow", "How the program works")}</p><h2>{t("partnership.program_title", "Build a trusted local presence, then grow with the network.")}</h2><p>{t("partnership.program_intro", "The program brings together practical marketing support, a clear review path, and commercial terms that are understood before you join.")}</p></div>
      <div className="partnership-program-chapter">
        <p className="eyebrow">{t("partnership.chapter_front_door_eyebrow", "01 / Build your front door")}</p><h3>{t("partnership.chapter_front_door_title", "Start with the truth about what your business does best.")}</h3>
        <p>{t("partnership.chapter_front_door_intro", "Your application captures your service area, EV experience, credentials, scope, and supported vehicles. We review the evidence required for your class, then help shape a credible profile, defined offer, and class-appropriate launch plan before it is published.")}</p>
      </div>
      <div className="partnership-program-chapter">
        <p className="eyebrow">{t("partnership.chapter_growth_eyebrow", "02 / Market yourself by participating")}</p><h3>{t("partnership.chapter_growth_title", "Turn real expertise into a stronger local reputation.")}</h3>
        <p>{t("partnership.chapter_growth_intro", "Your profile is only the start. Partners market their own brand through helpful community participation, education, local events, and clear EV-specific service information. Training, verified outcomes, and sustained contribution create a path to higher program levels when available.")}</p>
        <div className="partnership-level-grid">{levels.map(([titleKey, title, introKey, intro, badge]) => <article key={titleKey}><LevelBadge level={badge} /><h4>{t(titleKey, title)}</h4><p>{t(introKey, intro)}</p></article>)}</div>
      </div>
      <div className="partnership-program-chapter">
        <p className="eyebrow">{t("partnership.chapter_terms_eyebrow", "03 / Work from clear terms")}</p><h3>{t("partnership.chapter_terms_title", "Keep your customer relationship. Know the terms before you say yes.")}</h3><p>{t("partnership.chapter_terms_intro", "For direct referrals, your shop quotes, contracts, bills, and warranties the work. We discuss launch, participation, booking, managed-service, and expert-work terms in advance, with no promises of lead volume, earnings, or certification.")}</p>
        <div className="partnership-commercial-grid">{commercialTerms.map(([titleKey, title, introKey, intro]) => <article key={titleKey}><h4>{t(titleKey, title)}</h4><p>{t(introKey, intro)}</p></article>)}</div>
      </div>
    </div></section>
    <section className="partnership-close"><div className="wrap">
      <p className="eyebrow">{t("partnership.close_eyebrow", "Ready when you are")}</p>
      <h2>{t("partnership.close_title", "Start the conversation about your place in the network.")}</h2>
      <p>{t("partnership.close_intro", "Tell us what you do, where you work, and the EV owners you serve. We will start with the right application and discuss the program path that fits your business.")}</p>
      <Link className="inline-cta" href="/portal">{t("partnership.close_action", "Start your partner application")}</Link>
    </div></section>
  </main>;
}
