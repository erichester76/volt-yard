"use client";

import Link from "@/app/locale-link";
import { FormEvent, useState } from "react";
import { CatalogTeaser } from "@/app/catalog-teaser";
import { giftCreditMaximumCents, giftCreditMinimumCents, giftCreditStepCents, giftMembershipDays, giftMembershipValueCents } from "@/lib/gift-offers";
import { Button } from "@/app/page-primitives";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function BlackFridayPage() {
  const [email, setEmail] = useState("");
  const [creditCents, setCreditCents] = useState(20000);
  const [delivery, setDelivery] = useState<"buyer" | "scheduled">("buyer");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendOn, setSendOn] = useState("2026-12-25");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        <h1 className="heading-primary">The best gift you can give an EV owner.</h1>
        <p className="gift-offer-certainty">Certainty.</p>
        <p className="intro">One place for the answer, the part, and a mechanic who will take the car.</p>
      </div>
      <div className="gift-offer-aside">
        <form className="gift-offer-form" onSubmit={buy}>
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
      </div>
    </div></section>
    <section className="gift-offer-more" aria-label="What the gift replaces"><div className="wrap">
      <div className="gift-tour">
        <article className="gift-tour-shot">
          <div className="gift-tour-frame" aria-hidden="true">
            <p className="eyebrow">The usual way</p>
            <ul>
              <li>Facebook group: still no answer</li>
              <li>YouTube: three conflicting videos</li>
              <li>Parts sites and eBay</li>
              <li>Shop: we do not touch EVs</li>
              <li>Dealer: far away, long wait</li>
            </ul>
          </div>
          <h2>The hunt.</h2>
        </article>
        <article className="gift-tour-shot">
          <div className="gift-tour-frame" aria-hidden="true">
            <p className="eyebrow">Amped Up</p>
            <strong>Certainty.</strong>
            <ul>
              <li>The answer</li>
              <li>The part</li>
              <li>A mechanic who will take the car</li>
            </ul>
          </div>
          <h2>One stop.</h2>
        </article>
        <article className="gift-tour-shot">
          <div className="gift-tour-frame" aria-hidden="true">
            <p className="eyebrow">Network access</p>
            <strong>{giftMembershipDays} days included</strong>
            <ul>
              <li>Ask owners and experts</li>
              <li>Keep a history of the car</li>
              <li>Normally {money(giftMembershipValueCents)}</li>
            </ul>
          </div>
          <h2>Not a forum login.</h2>
        </article>
        <article className="gift-tour-shot">
          <div className="gift-tour-frame" aria-hidden="true">
            <p className="eyebrow">When they want a bay</p>
            <ul>
              <li>Nearby partner</li>
              <li>Not only the dealer</li>
              <li>Not a distant service center</li>
              <li>They choose. We do not book it.</li>
            </ul>
          </div>
          <h2>More options.</h2>
        </article>
        <article className="gift-tour-shot">
          <div className="gift-tour-frame" aria-hidden="true">
            <p className="eyebrow">The credit</p>
            <ul>
              <li>any service or upgrade in the catalog</li>
              <li>Or a partner visit</li>
              <li>On top of the access</li>
            </ul>
          </div>
          <h2>For whatever they need.</h2>
        </article>
      </div>
      <CatalogTeaser compact title="The credit can go to things like" />
    </div></section>
  </main>;
}
