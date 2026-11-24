"use client";

import Link from "@/app/locale-link";

const paths = [
  ["Get comfortable first", "Charging, daily care, and the questions worth asking in month one.", "Read the journal", "/journal"],
  ["When something needs attention", "See the hands-on service that is available. A gift card can help pay, but you still choose the visit.", "Browse services", "/services"],
  ["Make the car more yours", "Look through upgrades that may fit. What is available depends on the car and the shop.", "Browse upgrades", "/upgrades"],
  ["Ask people who have been there", "Read owner conversations now. Join in only when you want to.", "Visit the community", "/community"],
] as const;

export default function NewEvOwnerPage() {
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">New to this car</p>
      <h1 className="heading-primary">You do not have to figure the whole car out tonight.</h1>
      <p className="intro">Amped Up is here for the practical part: what to learn, who can help, and how to keep the story of the car in one place. If someone gave you this, it is yours now.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      <div className="home-section-heading"><h2>Start with the piece that feels useful.</h2><p>We are not booking appointments or reviewing cars yet. These are the places you can actually go today.</p></div>
      <div className="purchase-research-grid">{paths.map(([title, copy, action, href]) => <article key={href}><h3>{title}</h3><p>{copy}</p><Link href={href}>{action} <span aria-hidden="true">→</span></Link></article>)}</div>
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>Someone may be planning a gift.</h2><p>If a private link arrives, open it when you have a minute. It will explain the gift before it asks for anything.</p><Link className="inline-cta" href="/black-friday">See the gift</Link></div></section>
  </main>;
}
