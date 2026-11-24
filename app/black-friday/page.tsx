"use client";

import Link from "@/app/locale-link";
import { FormEvent, useEffect, useState } from "react";
import { CatalogTeaser } from "@/app/catalog-teaser";
import { giftCreditMaximumCents, giftCreditMinimumCents, giftCreditStepCents, giftMembershipDays, giftMembershipValueCents } from "@/lib/gift-offers";
import { Button } from "@/app/page-primitives";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const giftWords = ["Answers", "Solutions", "Certainty", "Comfort", "Knowledge", "Community"];

export default function BlackFridayPage() {
  const [email, setEmail] = useState("");
  const [creditCents, setCreditCents] = useState(20000);
  const [delivery, setDelivery] = useState<"buyer" | "scheduled">("buyer");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendOn, setSendOn] = useState("2026-12-25");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => setWordIndex((current) => (current + 1) % giftWords.length), 2200);
    return () => window.clearInterval(timer);
  }, []);

  function changeAmount(direction: -1 | 1) {
    setCreditCents((current) => Math.min(giftCreditMaximumCents, Math.max(giftCreditMinimumCents, current + direction * giftCreditStepCents)));
  }

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

  return <main className="gift-offer">
    <section className="gift-offer-hero"><div className="wrap gift-offer-layout">
      <div>
        <p className="eyebrow">Black Friday</p>
        <h1 className="heading-primary">The best gift you can give an EV owner: <span className="gift-offer-certainty" aria-live="polite">{giftWords[wordIndex]}.</span></h1>
        <p className="intro">No more guesswork. No more hunting endlessly for answers. Solutions in one place.</p>
      </div>
    </div>
    <div className="gift-compare wrap">
      <article>
        <p className="eyebrow">The usual way</p>
        <h2>The hunt.</h2>
        <ul>
          <li>Facebook, YouTube, parts sites, eBay</li>
          <li>Shops that do not touch EVs</li>
          <li>Dealer or a far service center</li>
          <li>A long wait</li>
        </ul>
      </article>
      <article>
        <p className="eyebrow">Amped Up</p>
        <h2>One stop.</h2>
        <ul>
          <li>The answer, the part, the mechanic</li>
          <li>Parts from the best vendors, in one place</li>
          <li>Owners and experts in one place</li>
          <li>A history of the car</li>
          <li>A nearby partner, not only the dealer</li>
        </ul>
      </article>
      <article className="gift-compare-close">
        <p className="eyebrow">The gift</p>
        <h2>Access and credit.</h2>
        <ul>
          <li>{giftMembershipDays} days of network access, normally {money(giftMembershipValueCents)}</li>
          <li>Credit for any service or upgrade, in the amount you choose</li>
          <li>One gift. The hunt stops here.</li>
        </ul>
      </article>
    </div>
    <div className="wrap gift-offer-layout">
      <CatalogTeaser compact title="The credit can go to things like" />
    </div>
    <a className="hero-scroll-cue" href="#gift-form" aria-label="Continue to the gift form">
      <svg viewBox="0 0 44 30" aria-hidden="true">
        <path className="hero-scroll-chevron-orange" d="M2 2l20 7 20-7" />
        <path className="hero-scroll-chevron-gold" d="M2 11l20 7 20-7" />
        <path className="hero-scroll-chevron-yellow" d="M2 20l20 7 20-7" />
      </svg>
    </a>
    </section>
    <section className="gift-offer-buy"><div className="wrap gift-offer-layout">
      <form className="gift-offer-form" id="gift-form" onSubmit={buy}>
          <h2>Choose the credit</h2>
          <p>Three months of Amped Up Network access are already included. Choose how much credit to set aside for a catalog service, an upgrade, or a partner visit.</p>
          <div className="gift-amount-stepper">
            <button type="button" aria-label="Decrease gift amount by 100 dollars" onClick={() => changeAmount(-1)} disabled={creditCents <= giftCreditMinimumCents}>−</button>
            <strong>{money(creditCents)}</strong>
            <button type="button" aria-label="Increase gift amount by 100 dollars" onClick={() => changeAmount(1)} disabled={creditCents >= giftCreditMaximumCents}>+</button>
          </div>
          <label>Their email<input required type="email" autoComplete="off" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="recipient@example.com" /></label>
          <label>Your email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <div className="gift-delivery-choices">
            <label className={delivery === "buyer" ? "is-selected" : undefined}>
              <input type="radio" name="delivery" checked={delivery === "buyer"} onChange={() => setDelivery("buyer")} />
              <strong>I will give it myself</strong>
              <span>Email me the private link. It is not sent to the recipient at checkout.</span>
            </label>
            <label className={delivery === "scheduled" ? "is-selected" : undefined}>
              <input type="radio" name="delivery" checked={delivery === "scheduled"} onChange={() => setDelivery("scheduled")} />
              <strong>Send the gift link on a date</strong>
              <span>Perfect for Christmas morning, or any day you choose.</span>
            </label>
          </div>
          {delivery === "scheduled" && <label className="gift-date-field">Delivery date<input required type="date" value={sendOn} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setSendOn(event.target.value)} onClick={(event) => { try { event.currentTarget.showPicker(); } catch { /* The picker is already open. */ } }} /></label>}
          <p className="gift-offer-summary">They get {money(giftMembershipValueCents)} of membership, plus {money(creditCents)} for a service, an upgrade, or a partner visit.</p>
          <Button disabled={submitting}>{submitting ? "Taking you to checkout..." : `Give ${money(creditCents)}`}</Button>
          {message && <p className="form-message" role="alert">{message}</p>}
        </form>
        <p className="gift-offer-preview"><Link href="/gift-landing/example">Click here to see what they will get when they open the link.</Link></p>
    </div></section>
  </main>;
}
