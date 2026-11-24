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
        <p className="eyebrow">The gift they will still be glad they opened</p>
        <h1 className="heading-primary">Give someone a smoother 2027 with their EV.</h1>
        <p className="intro">Skip the gadget that ends up in a drawer. This is three months inside Amped Up, plus money already set aside for the car. First day or fifth year, they get a place for better answers, a record that stays with the car, and credit for any service or upgrade.</p>
        <ol className="gift-offer-story">
          <li><b>{giftMembershipDays} days of membership, included.</b> That is three months of Member access, normally {money(giftMembershipValueCents)}. This is more than a login for the forum. They keep a history of the car: symptoms, what was tried, and the next question. They can ask, reply, and vote with owners who have these cars. Reading is free. These three months let them take part, and carry that context into the next step.</li>
          <li><b>Credit for the real work.</b> The amount you choose sits on top of the membership. It spends on any service or upgrade, from a checkup to something that makes the car more theirs.</li>
          <li><b>A network, not a blank search.</b> EV mechanics, alignment shops, electricians, and aftermarket specialists are already gathered here. They still choose the shop and the visit. The gift does not book it for them.</li>
        </ol>
        <p className="gift-offer-limit">Hand them a head start. The membership opens the network. The credit is waiting when the car needs something real.</p>
        <CatalogTeaser compact title="The credit can go to things like" />
      </div>
      <div className="gift-offer-aside">
        <form className="gift-offer-form" onSubmit={buy}>
          <h2>Put money on the gift</h2>
          <p>Three months of membership are already included. The amount below is extra credit for service or an upgrade, whenever they are ready.</p>
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
          <p className="gift-offer-summary">They get {money(giftMembershipValueCents)} of membership, plus {money(creditCents)} for any service or upgrade.</p>
          <Button disabled={submitting}>{submitting ? "Taking you to checkout..." : `Give ${money(creditCents)}`}</Button>
          {message && <p className="form-message" role="alert">{message}</p>}
        </form>
        <p className="gift-offer-preview">Three months in the network, plus credit for whatever the car needs next. <Link href="/gift-landing/example">See the gift.</Link></p>
      </div>
    </div></section>
  </main>;
}
