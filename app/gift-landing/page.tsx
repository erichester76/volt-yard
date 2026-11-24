"use client";

import Link from "@/app/locale-link";

const paths = [
  ["Sharpen what you already know", "Charging habits, maintenance, and the questions that still come up in year one or year five.", "Read the journal", "/journal"],
  ["Put the credit toward real work", "Browse the service that is listed now. A gift can help pay, and you still choose the visit.", "Browse services", "/services"],
  ["Make the car more yours", "Look through upgrades that may fit, whether this is a new habit or a long-owned car.", "Browse upgrades", "/upgrades"],
  ["Compare notes with other owners", "Read what people wish they had known sooner. Join the conversation only when you want to.", "Visit the community", "/community"],
] as const;

export default function GiftLandingPage() {
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">Your ownership, upgraded</p>
      <h1 className="heading-primary">A smoother year with the EV you already love.</h1>
      <p className="intro">Whether this is your first month or your fifth year, Amped Up is the practical layer around the car: better questions, the right specialists, and a place to keep the story together. If someone gave you this, it is yours now.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      <div className="home-section-heading"><h2>Use it where it helps most.</h2><p>We are not booking appointments or reviewing cars yet. These are the places you can actually go today.</p></div>
      <div className="purchase-research-grid">{paths.map(([title, copy, action, href]) => <article key={href}><h3>{title}</h3><p>{copy}</p><Link href={href}>{action} <span aria-hidden="true">→</span></Link></article>)}</div>
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>The gift is a head start, not a script.</h2><p>Open the private link when you have a minute. It explains the membership and the credit before it asks for anything.</p><Link className="inline-cta" href="/black-friday">See the gift</Link></div></section>
  </main>;
}
