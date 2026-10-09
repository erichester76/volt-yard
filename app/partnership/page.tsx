"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const steps = [
  ["partnership.step_apply", "Apply", "partnership.step_apply_intro", "Tell us about your business, service area, EV experience, and the work you do."],
  ["partnership.step_review", "We review", "partnership.step_review_intro", "We review your profile and the credentials required for your partner type before publishing it."],
  ["partnership.step_participate", "You participate", "partnership.step_participate_intro", "Approved partners can be found by owners and take part in the network's existing partner workflows."],
] as const;

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

const benefits = [
  ["partnership.benefit_context", "Qualified context, not cold inquiries", "partnership.benefit_context_intro", "Owners can carry their vehicle, issue, and service context forward with permission, so the right conversations start with less repeated intake."],
  ["partnership.benefit_marketing", "Launch marketing with substance", "partnership.benefit_marketing_intro", "Build a credible profile, a defined offer, and class-appropriate launch materials. Co-branded education, local events, and community activity are used where they make sense."],
  ["partnership.benefit_reputation", "Market yourself by participating", "partnership.benefit_reputation_intro", "Show your actual scope, credentials, supported vehicles, and verified outcomes. Share useful expertise in the community, support education and events, and build a reputation beyond a generic directory listing."],
] as const;

function LevelBadge({ level }: { level: typeof levels[number][4] }) {
  if (level === "specialist") return <svg className="partnership-level-badge" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 40 14v20L24 43 8 34V14z" /><path d="M16 24h16M24 16v16" /></svg>;
  if (level === "certified") return <svg className="partnership-level-badge" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 39 10v12c0 10-6.2 16.3-15 21-8.8-4.7-15-11-15-21V10z" /><path d="m16 24 5 5 11-12" /></svg>;
  return <svg className="partnership-level-badge" viewBox="0 0 48 48" aria-hidden="true"><path d="m24 5 4.2 10.8L39 20l-10.8 4.2L24 35l-4.2-10.8L9 20l10.8-4.2z" /><path d="M24 35v8M16 43h16" /></svg>;
}

export default function PartnershipPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return <main className="partnership-page">
    <section className="hero partnership-hero"><div className="wrap">
      <p className="eyebrow">{t("partnership.eyebrow", "For EV businesses")}</p>
      <h1 className="heading-primary">{t("partnership.title", "Connecting qualified clients to qualified shops.")}</h1>
      <p className="intro">{t("partnership.intro", "A reviewed referral and advisory network for EV repair, electrical, appearance, and aftermarket specialists.")}</p>
    </div></section>
    <section className="partnership-case"><div className="wrap">
      <p className="eyebrow">{t("partnership.case_eyebrow", "More than a listing")}</p>
      <h2>{t("partnership.case_title", "Your brand. Your shop. A stronger front door.")}</h2>
      <p>{t("partnership.case_intro", "Amped Up Network is not a franchise. You retain your brand, pricing, operations, customer relationship, and the work you choose to take on. We are a referral and advisory network: a front door that helps owners understand who is a fit and advocates for clear, qualified partner choices.")}</p>
    </div></section>
    <section className="partnership-program"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.program_eyebrow", "How the program works")}</p><h2>{t("partnership.program_title", "Build a trusted local presence, then grow with the network.")}</h2><p>{t("partnership.program_intro", "The program brings together practical marketing support, a clear review path, and commercial terms that are understood before you join.")}</p></div>
      <div className="partnership-program-block">
        <p className="eyebrow">{t("partnership.steps_eyebrow", "How it works")}</p><h3>{t("partnership.steps_title", "A clear path into the network.")}</h3>
        <ol>{steps.map(([titleKey, title, introKey, intro], index) => <li key={titleKey}><b>{String(index + 1).padStart(2, "0")}</b><div><h4>{t(titleKey, title)}</h4><p>{t(introKey, intro)}</p></div></li>)}</ol>
      </div>
      <div className="partnership-program-block">
        <p className="eyebrow">{t("partnership.benefits_eyebrow", "Built to help you grow")}</p><h3>{t("partnership.benefits_title", "Marketing support, better context, and a trusted local presence.")}</h3>
        <div className="partnership-benefit-grid">{benefits.map(([titleKey, title, introKey, intro]) => <article key={titleKey}><h4>{t(titleKey, title)}</h4><p>{t(introKey, intro)}</p></article>)}</div>
      </div>
      <div className="partnership-program-block">
        <p className="eyebrow">{t("partnership.commercial_eyebrow", "Clear commercial terms")}</p><h3>{t("partnership.commercial_title", "Know how the program works before you join.")}</h3><p>{t("partnership.commercial_intro", "We discuss the right track, responsibilities, and terms before enrollment. We do not promise lead volume, earnings, or certification.")}</p>
        <div className="partnership-commercial-grid">{commercialTerms.map(([titleKey, title, introKey, intro]) => <article key={titleKey}><h4>{t(titleKey, title)}</h4><p>{t(introKey, intro)}</p></article>)}</div>
      </div>
    </div></section>
    <section className="partnership-levels"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.levels_eyebrow", "Programs that match your work")}</p><h2>{t("partnership.levels_title", "Built around your specialty and readiness.")}</h2><p>{t("partnership.levels_intro", "Start where your business is ready. As evidence, outcomes, and participation grow, eligible partners can progress through the levels available for their class.")}</p></div>
      <div className="partnership-level-grid">{levels.map(([titleKey, title, introKey, intro, badge]) => <article key={titleKey}><LevelBadge level={badge} /><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p></article>)}</div>
    </div></section>
    <section className="partnership-close"><div className="wrap">
      <p className="eyebrow">{t("partnership.close_eyebrow", "Ready when you are")}</p>
      <h2>{t("partnership.close_title", "Start the conversation about your place in the network.")}</h2>
      <p>{t("partnership.close_intro", "Tell us what you do, where you work, and the EV owners you serve. We will start with the right application and discuss the program path that fits your business.")}</p>
      <Link className="inline-cta" href="/portal">{t("partnership.close_action", "Start your partner application")}</Link>
    </div></section>
  </main>;
}
