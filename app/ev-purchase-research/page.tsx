"use client";

import Link from "@/app/locale-link";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

export default function EvPurchaseResearchPage() {
  const t = useLocalizedContent(useLocale());
  const paths = [
    ["research.path.owners", "Owner perspectives", "research.path.owners_intro", "Compare real ownership experience, charging routines, and the trade-offs people discover after the purchase.", "research.path.owners_action", "Explore the community", "/community"],
    ["research.path.guides", "Practical guides", "research.path.guides_intro", "Build a better question list with plain-language articles and tutorials for everyday EV ownership.", "research.path.guides_action", "Read guides and tutorials", "/journal"],
    ["research.path.inspection", "Pre-purchase inspection", "research.path.inspection_intro", "If an inspection service is available for your vehicle and area, start with the service catalog before you buy.", "research.path.inspection_action", "Explore inspection services", "/services"],
    ["research.path.essentials", "New-owner essentials", "research.path.essentials_intro", "See available products and packages that can help make your first months of ownership easier.", "research.path.essentials_action", "Explore owner essentials", "/upgrades"],
  ] as const;
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">{t("research.eyebrow", "Before you buy")}</p>
      <h1 className="heading-primary">{t("research.title", "Research the ownership experience, not just the spec sheet.")}</h1>
      <p className="intro">{t("research.intro", "Learn what owners wish they had known, build better questions, and decide which next step makes sense for the EV you are considering.")}</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      <div className="home-section-heading"><h2>{t("research.section_title", "Get closer to the real decision.")}</h2><p>{t("research.section_intro", "Vehicle reviews are not part of Amped Up yet. Until they are, start with owner conversations, practical resources, and the services or essentials that are actually available.")}</p></div>
      <div className="purchase-research-grid">{paths.map(([titleKey, title, introKey, intro, actionKey, action, href]) => <article key={href}><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p><Link href={href}>{t(actionKey, action)} <span aria-hidden="true">→</span></Link></article>)}</div>
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>{t("research.close_title", "A confident purchase starts with better context.")}</h2><p>{t("research.close_intro", "Availability, compatibility, and next steps vary by vehicle, area, and partner. We will keep building the research tools that help you make the call.")}</p><Link className="inline-cta" href="/community">{t("research.ask", "Ask owners a question")}</Link></div></section>
  </main>;
}
