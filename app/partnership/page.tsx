"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const steps = [
  ["partnership.step_apply", "Apply", "partnership.step_apply_intro", "Tell us about your business, service area, EV experience, and the work you do."],
  ["partnership.step_review", "We review", "partnership.step_review_intro", "We review your profile and the credentials required for your partner type before publishing it."],
  ["partnership.step_participate", "You participate", "partnership.step_participate_intro", "Approved partners can be found by owners and take part in the network's existing partner workflows."],
] as const;

const levels = [
  ["partnership.level_specialist", "Verified Specialty / Infrastructure", "partnership.level_specialist_intro", "For electrical, charging, appearance, protection, and aftermarket businesses. We verify the business, required credentials, service scope, and profile details for the partner class."],
  ["partnership.level_certified", "Certified Partner", "partnership.level_certified_intro", "Reserved for core EV repair partners that complete the network's readiness, safety, training, warranty, and customer-experience standards."],
  ["partnership.level_leader", "Network Leader", "partnership.level_leader_intro", "For established Certified Partners with sustained outcomes and a meaningful contribution to education, events, and the local EV community."],
] as const;

const commercialTerms = [
  ["partnership.commercial_launch", "Launch support", "partnership.commercial_launch_intro", "Your launch track is matched to your work. It may include profile development, scope and credential review, team training, customer-experience preparation, and class-appropriate launch support."],
  ["partnership.commercial_ongoing", "Ongoing participation", "partnership.commercial_ongoing_intro", "Direct referrals keep the customer relationship and work with your shop: you quote, contract, bill, and warranty it. A fixed completed-booking fee may apply only to verified qualifying work, never a percentage of your sale."],
  ["partnership.commercial_payout", "Paid work and expert contributions", "partnership.commercial_payout_intro", "When paid managed-service or expert work is offered, the scope and partner payout are disclosed before acceptance. Payout records are administered manually; automated transfers are not available."],
] as const;

const benefits = [
  ["partnership.benefit_context", "Qualified context, not cold inquiries", "partnership.benefit_context_intro", "Owners can carry their vehicle, issue, and service context forward with permission, so the right conversations start with less repeated intake."],
  ["partnership.benefit_marketing", "Launch marketing with substance", "partnership.benefit_marketing_intro", "Build a credible profile, a defined offer, and class-appropriate launch materials. Co-branded education, local events, and community activity are used where they make sense."],
  ["partnership.benefit_reputation", "Earn trust that compounds", "partnership.benefit_reputation_intro", "Show your actual scope, credentials, supported vehicles, and verified outcomes. Contribute useful expertise and build a reputation beyond a generic directory listing."],
] as const;

export default function PartnershipPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return <main className="partnership-page">
    <section className="hero partnership-hero"><div className="wrap">
      <p className="eyebrow">{t("partnership.eyebrow", "For EV businesses")}</p>
      <h1 className="heading-primary">{t("partnership.title", "Bring your EV expertise to the network.")}</h1>
      <p className="intro">{t("partnership.intro", "Join a reviewed network where owners can find capable EV repair, electrical, appearance, and aftermarket specialists.")}</p>
    </div></section>
    <section className="partnership-case"><div className="wrap">
      <p className="eyebrow">{t("partnership.case_eyebrow", "More than a listing")}</p>
      <h2>{t("partnership.case_title", "Build a better way for EV owners to find your work.")}</h2>
      <p>{t("partnership.case_intro", "Amped Up Network connects EV-specific businesses with owners who need the right help. Your business remains independent: you set your pricing, perform your work, and stand behind it. We make the scope, context, and next step clearer for everyone involved.")}</p>
    </div></section>
    <section className="partnership-benefits"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.benefits_eyebrow", "Built to help you grow")}</p><h2>{t("partnership.benefits_title", "Marketing support, better context, and a trusted local presence.")}</h2></div>
      <div className="partnership-benefit-grid">{benefits.map(([titleKey, title, introKey, intro]) => <article key={titleKey}><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p></article>)}</div>
    </div></section>
    <section className="partnership-steps"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.steps_eyebrow", "How it works")}</p><h2>{t("partnership.steps_title", "A clear path into the network.")}</h2></div>
      <ol>{steps.map(([titleKey, title, introKey, intro], index) => <li key={titleKey}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p></div></li>)}</ol>
    </div></section>
    <section className="partnership-levels"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.levels_eyebrow", "Programs that match your work")}</p><h2>{t("partnership.levels_title", "Built around your specialty and readiness.")}</h2><p>{t("partnership.levels_intro", "Start where your business is ready. As evidence, outcomes, and participation grow, eligible partners can progress through the levels available for their class.")}</p></div>
      <div className="partnership-level-grid">{levels.map(([titleKey, title, introKey, intro]) => <article key={titleKey}><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p></article>)}</div>
    </div></section>
    <section className="partnership-commercial"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.commercial_eyebrow", "Clear commercial terms")}</p><h2>{t("partnership.commercial_title", "Know how the program works before you join.")}</h2><p>{t("partnership.commercial_intro", "We discuss the right track, responsibilities, and terms before enrollment. We do not promise lead volume, earnings, or certification.")}</p></div>
      <div className="partnership-commercial-grid">{commercialTerms.map(([titleKey, title, introKey, intro]) => <article key={titleKey}><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p></article>)}</div>
    </div></section>
    <section className="partnership-fit"><div className="wrap">
      <div><p className="eyebrow">{t("partnership.fit_eyebrow", "Built for specialists")}</p><h2>{t("partnership.fit_title", "Connecting qualified clients to qualified shops.")}</h2></div>
      <p>{t("partnership.fit_intro", "Whether you repair EVs, install charging equipment, protect finishes, or support the aftermarket, start with a profile that makes your scope clear to the people looking for it.")}</p>
    </div></section>
    <section className="partnership-close"><div className="wrap">
      <p className="eyebrow">{t("partnership.close_eyebrow", "Ready when you are")}</p>
      <h2>{t("partnership.close_title", "Start the conversation about your place in the network.")}</h2>
      <p>{t("partnership.close_intro", "Tell us what you do, where you work, and the EV owners you serve. We will start with the right application and discuss the program path that fits your business.")}</p>
      <Link className="inline-cta" href="/portal">{t("partnership.close_action", "Start your partner application")}</Link>
    </div></section>
  </main>;
}
