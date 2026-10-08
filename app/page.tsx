"use client";

import Link from "@/app/locale-link";
import { LocalizedHeadingAccent } from "@/app/heading-accent";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const pathways = [
  ["home.path_issue", "Solve a current problem", "home.path_issue_intro", "Start a guided issue", "/issues"],
  ["home.path_maintenance", "Be proactive with maintenance", "home.path_maintenance_intro", "Browse practical guides", "/tutorials"],
  ["home.path_catalog", "Enhance your ride", "home.path_catalog_intro", "Explore community favorites", "/upgrades"],
  ["home.path_community", "Compare notes with owners", "home.path_community_intro", "Browse or ask the community", "/community"],
] as const;

export default function Home() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return (
    <main className="community-home">
      <section className="hero community-home-hero">
        <div className="wrap">
          <h1 className="heading-primary hero-action-heading hero-action-heading-primary"><LocalizedHeadingAccent text={t("home.title", "Your EV ownership network, {{accent}}")} accent={t("home.title_accent", "finally")} /></h1>
          <p className="intro">{t("home.intro", "Amped Up Network is a focused home for EV owners to find real answers, capable local help, community knowledge, and practical next steps.")}</p>
          <div className="hero-support-path" aria-label={t("home.journey_title", "More than a directory. More than a store. More than a forum.")}>
            <p>{t("home.journey_title", "More than a directory. More than a store. More than a forum.")}</p>
            <ol>
              <li><b>01</b><span>{t("home.journey_guided", "Find EV-capable mechanics, alignment shops, electricians, and aftermarket specialists that are hard to discover elsewhere.")}</span></li>
              <li><b>02</b><span>{t("home.journey_community", "Get focused recommendations, training, products, and services instead of piecing together social media and web searches.")}</span></li>
              <li><b>03</b><span>{t("home.journey_expert", "Ask a community built for EV ownership, where owners and experts share practical knowledge.")}</span></li>
              <li><b>04</b><span>{t("home.journey_service", "Carry your vehicle, problem, purchase, and post history forward so every next step starts with context.")}</span></li>
            </ol>
          </div>
        </div>
      </section>
      <section className="home-pathways"><div className="wrap">
        <div className="home-pathway-grid">{pathways.map(([titleKey, title, introKey, intro, href]) => <article key={href}><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p><Link href={href}>{title} <span aria-hidden="true">→</span></Link></article>)}</div>
      </div></section>
    </main>
  );
}
