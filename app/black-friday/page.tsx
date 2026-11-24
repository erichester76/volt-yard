"use client";

import Link from "@/app/locale-link";
import { FormEvent, useEffect, useState } from "react";
import { giftCreditMaximumCents, giftCreditMinimumCents, giftCreditStepCents, giftMembershipDays } from "@/lib/gift-offers";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/app/page-primitives";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function BlackFridayPage() {
  const [email, setEmail] = useState("");
  const [creditCents, setCreditCents] = useState(20000);
  type Example = { id: string; name: string; price_cents: number; category: { slug: string } | { slug: string }[] | null };
  const [examples, setExamples] = useState<Example[]>([]);
  const [delivery, setDelivery] = useState<"buyer" | "scheduled">("buyer");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendOn, setSendOn] = useState("2026-12-25");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    createBrowserSupabaseClient().from("catalog_products").select("id,name,price_cents,category:catalog_categories(slug)").eq("active", true).order("price_cents").limit(8).then(({ data }) => {
      const products = (data ?? []) as Example[];
      const slug = (product: (typeof products)[number]) => Array.isArray(product.category) ? product.category[0]?.slug : product.category?.slug;
      const services = products.filter((product) => slug(product) === "services").slice(0, 2);
      const upgrades = products.filter((product) => slug(product) !== "services").slice(0, 2);
      setExamples([...services, ...upgrades].slice(0, 4));
    });
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
        <p className="eyebrow">A gift they will actually use</p>
        <h1 className="heading-primary">Give someone a smoother 2027 with their EV.</h1>
        <p className="intro">A good gift is not another gadget. It is someone to call, a place to ask, and money already set aside for the work. This card includes {giftMembershipDays} days of membership and credit for any service or upgrade. You do not need an account to buy it.</p>
        <ol className="gift-offer-story">
          <li><b>{giftMembershipDays} days of membership, included.</b> Member access is normally $9 a month. For this month they can keep a case history and join the conversation: ask, reply, and vote, not just read.</li>
          <li><b>Credit on top of that.</b> The amount you choose is separate. It spends on any service or upgrade, from a checkup to something that makes the car more theirs.</li>
          <li><b>A softer landing.</b> Independent EV mechanics, alignment shops, electricians, and aftermarket specialists are gathered here, so they are not starting from a blank search.</li>
        </ol>
        {examples.length > 0 && <div className="gift-store-examples"><p>A few things the credit can go toward:</p><ul>{examples.map((item) => <li key={item.id}><span>{item.name}</span><b>{money(item.price_cents)}</b></li>)}</ul></div>}
        <p className="gift-offer-limit">They choose the service or upgrade when they are ready. The card does not book the visit for them.</p>
      </div>
      <form className="gift-offer-form" onSubmit={buy}>
        <h2>Choose the amount</h2>
        <p>The membership is the part that keeps their questions and history together. The amount below is extra credit for the work.</p>
        <div className="gift-amount-stepper">
          <button type="button" aria-label="Decrease gift amount by 100 dollars" onClick={() => changeAmount(-1)} disabled={creditCents <= giftCreditMinimumCents}>−</button>
          <strong>{money(creditCents)}</strong>
          <button type="button" aria-label="Increase gift amount by 100 dollars" onClick={() => changeAmount(1)} disabled={creditCents >= giftCreditMaximumCents}>+</button>
        </div>
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
        <label>Your email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        {delivery === "scheduled" && <div className="gift-schedule-fields">
          <label>Recipient email<input required type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="recipient@example.com" /></label>
          <label>Delivery date<input required type="date" value={sendOn} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setSendOn(event.target.value)} /></label>
        </div>}
        <p className="gift-offer-summary">They get a ${9} month of membership, plus {money(creditCents)} for any service or upgrade.</p>
        <Button disabled={submitting}>{submitting ? "Taking you to checkout..." : `Give ${money(creditCents)}`}</Button>
        {message && <p className="form-message" role="alert">{message}</p>}
      </form>
    </div></section>
    <section className="gift-offer-note"><div className="wrap"><p>They open the gift in their own time and make the account theirs. <Link href="/new-ev-owner">Peek at what they will see.</Link></p></div></section>
  </main>;
}
