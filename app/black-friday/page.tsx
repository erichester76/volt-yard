"use client";

import Link from "@/app/locale-link";
import { FormEvent, useState } from "react";
import { giftOffers, type GiftOffer } from "@/lib/gift-offers";
import { Button } from "@/app/page-primitives";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function BlackFridayPage() {
  const [email, setEmail] = useState("");
  const [offer, setOffer] = useState<GiftOffer>("membership");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function buy(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    const stored = window.sessionStorage.getItem("volt-yard-gift-key") ?? crypto.randomUUID().replace(/-/g, "");
    window.sessionStorage.setItem("volt-yard-gift-key", stored);
    try {
      const response = await fetch("/api/gift-cards/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": stored },
        body: JSON.stringify({ email, offer }),
      });
      const result: { url?: string; error?: string } = await response.json().catch(() => ({}));
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setMessage(result.error ?? "Gift checkout is not available right now.");
    } catch {
      setMessage("Gift checkout is not available right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">Black Friday gift</p>
      <h1 className="heading-primary">Give someone a real head start with their EV.</h1>
      <p className="intro">Amped Up Network connects a new or curious EV owner with practical guidance, a membership, and service or upgrade support from independent specialists. You can buy the gift without creating an account.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      <div className="home-section-heading"><h2>What the gift can do.</h2><p>The purchaser and the person who uses the gift do not have to be the same person. After payment, we email you a private link to forward. The recipient learns what they received before creating their own account.</p></div>
      <div className="purchase-research-grid">
        <article><h3>Membership</h3><p>A Premium membership gift gives the recipient a guided place to keep their vehicle, questions, and next steps together.</p><p>{money(giftOffers.membership.cents)}</p></article>
        <article><h3>Service kit</h3><p>A service-kit gift can be applied toward hands-on EV service in the catalog. It does not book an appointment by itself.</p><p>{money(giftOffers["service-kit"].cents)}</p></article>
        <article><h3>Upgrade kit</h3><p>An upgrade-kit gift can be applied toward a compatible upgrade. Availability still depends on the vehicle and partner.</p><p>{money(giftOffers["upgrade-kit"].cents)}</p></article>
      </div>
      <form className="community-form" onSubmit={buy}>
        <label>Email for the gift link<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label>Gift<select value={offer} onChange={(event) => setOffer(event.target.value as GiftOffer)}>{Object.entries(giftOffers).map(([key, item]) => <option key={key} value={key}>{item.name} · {money(item.cents)}</option>)}</select></label>
        <Button disabled={submitting}>{submitting ? "Opening secure checkout..." : "Buy gift card"}</Button>
        {message && <p className="form-message" role="alert">{message}</p>}
        <p>Payment is collected by Stripe. Shopify issues and holds the gift card, and the recipient later uses that card as the payment method. No Amped Up account is created for you.</p>
      </form>
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>Want to look around first?</h2><p>The regular site stays available. This page is only the ad destination.</p><Link className="inline-cta" href="/">Visit Amped Up Network</Link></div></section>
  </main>;
}
