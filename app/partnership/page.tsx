"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const steps = [
  ["partnership.step_apply", "Apply", "partnership.step_apply_intro", "Tell us about your business, service area, EV experience, and the work you do."],
  ["partnership.step_review", "We review", "partnership.step_review_intro", "We review your profile and the credentials required for your partner type before publishing it."],
  ["partnership.step_participate", "You participate", "partnership.step_participate_intro", "Approved partners can be found by owners and take part in the network's existing partner workflows."],
] as const;

export default function PartnershipPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return <main className="partnership-page">
    <section className="hero partnership-hero"><div className="wrap">
      <p className="eyebrow">{t("partnership.eyebrow", "For EV businesses")}</p>
      <h1 className="heading-primary">{t("partnership.title", "Bring your EV expertise to the network.")}</h1>
      <p className="intro">{t("partnership.intro", "Join a reviewed network where owners can find capable EV repair, electrical, appearance, and aftermarket specialists.")}</p>
      <Link className="inline-cta" href="/portal">{t("partnership.action", "Start your partner application")}</Link>
    </div></section>
    <section className="partnership-steps"><div className="wrap">
      <div className="home-section-heading"><p className="eyebrow">{t("partnership.steps_eyebrow", "How it works")}</p><h2>{t("partnership.steps_title", "A clear path into the network.")}</h2></div>
      <ol>{steps.map(([titleKey, title, introKey, intro], index) => <li key={titleKey}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p></div></li>)}</ol>
    </div></section>
    <section className="partnership-fit"><div className="wrap">
      <div><p className="eyebrow">{t("partnership.fit_eyebrow", "Built for specialists")}</p><h2>{t("partnership.fit_title", "The right work deserves the right context.")}</h2></div>
      <p>{t("partnership.fit_intro", "Whether you repair EVs, install charging equipment, protect finishes, or support the aftermarket, start with a profile that makes your scope clear to the people looking for it.")}</p>
    </div></section>
  </main>;
}
