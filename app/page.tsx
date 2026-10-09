"use client";

import Link from "@/app/locale-link";
import { LocalizedHeadingAccent } from "@/app/heading-accent";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

const pathways = [
  ["home.path_issue", "Solve a current problem", "home.path_issue_intro", "Tell us what is happening. We organize the details, surface relevant answers, and help you choose a next step.", "Start a guided issue", "/issues"],
  ["home.path_maintenance", "Be proactive with maintenance", "home.path_maintenance_intro", "Use training and checklists to build a practical plan, then carry it into a service visit when needed.", "Browse practical guides", "/tutorials"],
  ["home.path_catalog", "Enhance your ride", "home.path_catalog_intro", "Compare community favorites and compatible options before you buy or book, with your vehicle context close at hand.", "Explore community favorites", "/upgrades"],
  ["home.path_community", "Compare notes with owners", "home.path_community_intro", "Ask focused questions, learn from real ownership experience, and save what helps for next time.", "Browse or ask the community", "/community"],
] as const;

export default function Home() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);

  return (
    <main className="community-home">
      <section className="hero community-home-hero">
        <div className="wrap">
          <h1 className="heading-primary hero-action-heading hero-action-heading-primary"><LocalizedHeadingAccent text={t("home.title", "Everything EV, in one place. {{accent}}")} accent={t("home.title_accent", "Finally.")} /></h1>
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
          <a className="hero-scroll-cue" href="#owner-journeys" aria-label="Explore owner journeys">
            <svg viewBox="0 0 44 30" aria-hidden="true">
              <path className="hero-scroll-chevron-orange" d="M2 2l20 7 20-7" />
              <path className="hero-scroll-chevron-gold" d="M2 11l20 7 20-7" />
              <path className="hero-scroll-chevron-yellow" d="M2 20l20 7 20-7" />
            </svg>
          </a>
        </div>
      </section>
      <section className="home-pathways" id="owner-journeys"><div className="wrap">
        <div className="home-section-heading home-pathways-heading"><h2>{t("home.paths_title", "Tell us where to start. We'll keep notes and guide you through next steps.")}</h2><p>{t("home.paths_intro", "Every journey connects your vehicle, questions, and progress to the next useful resource.")}</p></div>
        <div className="home-pathway-grid">{pathways.map(([titleKey, title, introKey, intro, action, href]) => <article key={href}><h3>{t(titleKey, title)}</h3><p>{t(introKey, intro)}</p><Link href={href}>{action} <span aria-hidden="true">→</span></Link></article>)}</div>
      </div></section>
      <section className="home-partner-invitation"><div className="wrap">
        <p className="eyebrow">{t("home.partner_eyebrow", "Interested partners")}</p>
        <div className="home-partner-invitation-content">
          <h2>{t("home.partner_title", "EV mechanic? Sparky? Wrap artist? Tint master?")}</h2>
          <div><p>{t("home.partner_intro", "Want to join in on the fun? Sign up to be a network member today.")}</p><Link className="inline-cta" href="/partnership">{t("home.partner_action", "Become a network member")}</Link></div>
        </div>
      </div></section>
    </main>
  );
}
