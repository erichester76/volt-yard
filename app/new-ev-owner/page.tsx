"use client";

import Link from "@/app/locale-link";

const paths = [
  ["Start with the basics", "Charging, daily care, and the questions worth answering in the first month.", "Read the journal", "/journal"],
  ["See available service", "Browse hands-on service that is actually listed. A gift card can be applied at checkout, but it does not reserve a bay.", "Browse services", "/services"],
  ["Look at upgrades", "Compare compatible upgrades before buying. Availability depends on the vehicle and partner.", "Browse upgrades", "/upgrades"],
  ["Ask owners", "Read public owner conversations, then create an account only when you want to post.", "Visit the community", "/community"],
] as const;

export default function NewEvOwnerPage() {
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">New EV owner</p>
      <h1 className="heading-primary">You have the car. Here is the useful next step.</h1>
      <p className="intro">Amped Up Network is a place to learn, keep context, and find independent EV help. This page is for the person using the car, including someone who received a gift from somebody else.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      <div className="home-section-heading"><h2>Start where you are.</h2><p>Vehicle reviews, automatic shop matching, scheduling, and inspection booking are not part of Amped Up yet. These links go only to what is available now.</p></div>
      <div className="purchase-research-grid">{paths.map(([title, copy, action, href]) => <article key={href}><h3>{title}</h3><p>{copy}</p><Link href={href}>{action} <span aria-hidden="true">→</span></Link></article>)}</div>
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>Have a gift link?</h2><p>Open the private link from the buyer. It will explain the gift before asking you to create an account.</p><Link className="inline-cta" href="/black-friday">See the Black Friday gift</Link></div></section>
  </main>;
}
