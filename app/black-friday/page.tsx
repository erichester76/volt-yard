"use client";

import Link from "@/app/locale-link";
import { FormEvent, useState } from "react";
import { LocalizedHeadingAccent } from "@/app/heading-accent";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";
import { giftCreditAmounts, giftMembershipDays } from "@/lib/gift-offers";
import { Button } from "@/app/page-primitives";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const pathways = [
  ["Find capable local help", "Mechanics, alignment shops, electricians, and aftermarket specialists that are hard to discover in a normal search."],
  ["Learn before you buy", "Owner conversations, practical guides, and a catalog of services and upgrades in one place."],
  ["Keep the context", "The recipient can save a vehicle, questions, and purchases so the next step does not start from zero."],
  ["Use the credit anywhere", "The gift card is store credit for any listed service or upgrade, not a coupon for one fixed package."],
] as const;

export default function BlackFridayPage() {
  const t = useLocalizedContent(useLocale());
  const [email, setEmail] = useState("");
  const [creditCents, setCreditCents] = useState<number>(giftCreditAmounts[1]);
  const [delivery, setDelivery] = useState<"buyer" | "scheduled">("buyer");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendOn, setSendOn] = useState("");
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
        body: JSON.stringify({ email, creditCents, delivery, recipientEmail, sendOn }),
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

  return <main className="community-home">
    <section className="hero community-home-hero"><div className="wrap">
      <p className="eyebrow">Black Friday gift</p>
      <h1 className="heading-primary hero-action-heading"><LocalizedHeadingAccent text={t("home.title", "Everything EV, in one place. {{accent}}")} accent="Give it." /></h1>
      <p className="intro">Give someone {giftMembershipDays} days of Amped Up membership and store credit they can spend on any service or upgrade in the catalog. You do not need an account to buy it, and you do not have to be the person who uses it.</p>
      <div className="hero-support-path" aria-label="What Amped Up Network gives an EV owner">
        <p>{t("home.journey_title", "More than a directory. More than a store. More than a forum.")}</p>
        <ol>
          <li><b>01</b><span>{t("home.journey_guided", "Find EV-capable mechanics, alignment shops, electricians, and aftermarket specialists that are hard to discover elsewhere.")}</span></li>
          <li><b>02</b><span>{t("home.journey_community", "Get focused recommendations, training, products, and services instead of piecing together social media and web searches.")}</span></li>
          <li><b>03</b><span>{t("home.journey_expert", "Ask a community built for EV ownership, where owners and experts share practical knowledge.")}</span></li>
          <li><b>04</b><span>{t("home.journey_service", "Carry your vehicle, problem, purchase, and post history forward so every next step starts with context.")}</span></li>
        </ol>
      </div>
    </div></section>
    <section className="home-pathways" id="gift"><div className="wrap">
      <div className="home-section-heading"><h2>A useful gift, not a guessing game.</h2><p>Every card includes a free {giftMembershipDays}-day membership. The amount you choose is credit toward anything listed under services or upgrades. It does not book an appointment or review a vehicle by itself.</p></div>
      <div className="home-pathway-grid">{pathways.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <form className="community-form" onSubmit={buy}>
        <label>Email for the gift link<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label>Store credit<select value={creditCents} onChange={(event) => setCreditCents(Number(event.target.value))}>{giftCreditAmounts.map((cents) => <option key={cents} value={cents}>{money(cents)} catalog credit + {giftMembershipDays} days of membership</option>)}</select></label>
        <fieldset>
          <legend>When should the gift link be sent?</legend>
          <label><input type="radio" name="delivery" checked={delivery === "buyer"} onChange={() => setDelivery("buyer")} /> Send the private link to me, so I can give it when I am ready</label>
          <label><input type="radio" name="delivery" checked={delivery === "scheduled"} onChange={() => setDelivery("scheduled")} /> Send the gift link on a date</label>
        </fieldset>
        {delivery === "scheduled" && <>
          <label>Recipient email<input required type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="recipient@example.com" /></label>
          <label>Delivery date<input required type="date" value={sendOn} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setSendOn(event.target.value)} /></label>
        </>}
        <Button disabled={submitting}>{submitting ? "Opening secure checkout..." : "Buy gift card"}</Button>
        {message && <p className="form-message" role="alert">{message}</p>}
        <p>The gift link is not sent to the recipient at checkout. You can hold it, or choose a date such as Christmas for us to email it. Stripe collects the payment. Shopify holds the credit. No Amped Up account is created for the buyer.</p>
      </form>
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>The person who receives it chooses the next step.</h2><p>They can learn first, create their own account, then spend the credit on the service or upgrade that fits their car.</p><Link className="inline-cta" href="/new-ev-owner">See the new-owner guide</Link></div></section>
  </main>;
}
