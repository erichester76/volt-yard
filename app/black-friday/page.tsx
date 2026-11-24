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
  const [sendOn, setSendOn] = useState("");
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
        <p className="eyebrow">Black Friday gift</p>
        <h1 className="heading-primary">Give the practical side of EV ownership.</h1>
        <p className="intro">Amped Up Network is the place an owner goes when a search, a forum, and a parts store are not enough. This gift gives them {giftMembershipDays} days inside that network and credit for any service or upgrade. You do not need an account, and you do not have to be the person who uses it.</p>
        <ol className="gift-offer-story">
          <li><b>Find help that is hard to search for.</b> Independent mechanics, alignment shops, electricians, and aftermarket specialists, gathered for EV owners.</li>
          <li><b>Stop piecing the answer together.</b> Recommendations, guides, products, and services live next to owners who have already been there.</li>
          <li><b>Keep the story with the car.</b> The recipient can save the vehicle, the question, and the purchase so the next step starts with context.</li>
        </ol>
        {examples.length > 0 && <div className="gift-store-examples"><p>Credit can cover catalog items such as:</p><ul>{examples.map((item) => <li key={item.id}><span>{item.name}</span><b>{money(item.price_cents)}</b></li>)}</ul></div>}
        <p className="gift-offer-limit">The credit spends on any listed service or upgrade. It does not book an appointment or review a vehicle by itself.</p>
      </div>
      <form className="gift-offer-form" onSubmit={buy}>
        <h2>Build the gift</h2>
        <p>Every card includes {giftMembershipDays} days of membership. Choose the store credit.</p>
        <div className="gift-amount-stepper">
          <button type="button" aria-label="Decrease gift amount by 100 dollars" onClick={() => changeAmount(-1)} disabled={creditCents <= giftCreditMinimumCents}>−</button>
          <strong>{money(creditCents)}</strong>
          <button type="button" aria-label="Increase gift amount by 100 dollars" onClick={() => changeAmount(1)} disabled={creditCents >= giftCreditMaximumCents}>+</button>
        </div>
        <div className="gift-delivery-choices">
          <label className={delivery === "buyer" ? "is-selected" : undefined}>
            <input type="radio" name="delivery" checked={delivery === "buyer"} onChange={() => setDelivery("buyer")} />
            <strong>Hold the link</strong>
            <span>Send the private link to me, so I can give it when I am ready.</span>
          </label>
          <label className={delivery === "scheduled" ? "is-selected" : undefined}>
            <input type="radio" name="delivery" checked={delivery === "scheduled"} onChange={() => setDelivery("scheduled")} />
            <strong>Send the gift link on a date</strong>
            <span>The link is not sent to the recipient at checkout.</span>
          </label>
        </div>
        <label>Your email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        {delivery === "scheduled" && <div className="gift-schedule-fields">
          <label>Recipient email<input required type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="recipient@example.com" /></label>
          <label>Delivery date<input required type="date" value={sendOn} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setSendOn(event.target.value)} /></label>
        </div>}
        <p className="gift-offer-summary">You pay {money(creditCents)}. They receive {giftMembershipDays} days of membership and {money(creditCents)} to spend on any service or upgrade.</p>
        <Button disabled={submitting}>{submitting ? "Opening secure checkout..." : `Buy ${money(creditCents)} gift`}</Button>
        {message && <p className="form-message" role="alert">{message}</p>}
      </form>
    </div></section>
    <section className="gift-offer-note"><div className="wrap"><p>Shopify holds the credit. The recipient creates their own account only when they open the gift. <Link href="/new-ev-owner">See what they will find.</Link></p></div></section>
  </main>;
}
