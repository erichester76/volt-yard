"use client";

import Link from "@/app/locale-link";
import { LocalizedHeadingAccent } from "@/app/heading-accent";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const pathways = [
  ["home.path_issue", "Solve a current problem", "home.path_issue_intro", "Start a guided issue", "/issues"],
  ["home.path_maintenance", "Be proactive with maintenance", "home.path_maintenance_intro", "Browse practical guides", "/tutorials"],
  ["home.path_membership", "Keep your support history", "home.path_membership_intro", "Join as a member", "/pricing"],
  ["home.path_community", "Compare notes with owners", "home.path_community_intro", "Browse or ask the community", "/community"],
  ["home.path_catalog", "Enhance your ride", "home.path_catalog_intro", "Explore community favorites", "/upgrades"],
  ["home.path_shops", "Need hands-on service?", "home.path_shops_intro", "Find a mechanic", "/shops"],
] as const;

export default function Home() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return (
    <main className="community-home">
      <section className="hero community-home-hero">
        <div className="wrap">
          <h1 className="heading-primary hero-action-heading hero-action-heading-primary"><LocalizedHeadingAccent text={t("home.title", "Find your solution, {{accent}}.")} accent={t("home.title_accent", "faster")} /></h1>
          <p className="intro">{t("home.intro", "From question to next step, all in one place. Amped Up Network helps you move from a guided issue to community knowledge, expert context, and, only when hands-on service is needed, the right mechanic network.")}</p>
          <div className="hero-support-path" aria-label={t("home.journey_title", "From question to next step, all in one place.")}>
            <p>{t("home.journey_title", "From question to next step, all in one place.")}</p>
            <ol>
              <li><b>01</b><span>{t("home.journey_guided", "Solve a current issue with guided support.")}</span></li>
              <li><b>02</b><span>{t("home.journey_community", "Stay proactive with maintenance training and checklists.")}</span></li>
              <li><b>03</b><span>{t("home.journey_expert", "Discover owner-tested upgrades and community favorites.")}</span></li>
              <li><b>04</b><span>{t("home.journey_service", "Connect with owners, experts, and mechanics when you need hands-on help.")}</span></li>
            </ol>
          </div>
        </div>
      </section>
      <section className="home-pathways"><div className="wrap">
        <div className="home-section-heading"><p className="eyebrow">{t("home.paths_eyebrow", "Choose your next move")}</p><h2>{t("home.paths_title", "Support for the road you are on.")}</h2></div>
        <div className="home-pathway-grid">{pathways.map(([titleKey, title, introKey, intro, href]) => <article key={href}><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p><Link href={href}>{title} <span aria-hidden="true">→</span></Link></article>)}</div>
      </div></section>
    </main>
  );
}
