"use client";

import Link from "@/app/locale-link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { requestAccount } from "@/lib/account-gate";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/app/page-primitives";

type GiftPreview = { name: string; amountCents: number; status: string; offer: string };

export default function GiftRecipientPage() {
  const { token } = useParams<{ token: string }>();
  const [gift, setGift] = useState<GiftPreview | null>(null);
  const [message, setMessage] = useState("Loading this gift...");
  const [step, setStep] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/gift-cards/preview?token=${encodeURIComponent(token)}`).then(async (response) => {
      const result: GiftPreview & { error?: string } = await response.json().catch(() => ({ error: "This gift link is not ready yet." }));
      if (!response.ok) return setMessage(result.error ?? "This gift link is not ready yet.");
      setGift(result);
      setMessage("");
    }).catch(() => setMessage("This gift link is not ready yet."));
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    void db.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => listener.subscription.unsubscribe();
  }, [token]);

  async function redeem(action: "claim" | "apply") {
    if (!signedIn) {
      requestAccount("sign-up", window.location.pathname);
      return;
    }
    setApplying(true);
    setMessage("");
    try {
      const db = createBrowserSupabaseClient();
      const { data: session } = await db.auth.getSession();
      if (!session.session) return requestAccount("sign-up", window.location.pathname);
      const response = await fetch("/api/gift-cards/redeem", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.session.access_token}` },
        body: JSON.stringify({ token, action }),
      });
      const result: { error?: string; status?: string; last4?: string } = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(result.error ?? "Could not use this gift card.");
      setMessage(action === "claim" ? `Shopify gift card ending ${result.last4 ?? "in Shopify"} is now your payment method.` : "The Shopify gift card was applied to this gift.");
      if (action === "apply") setStep(3);
    } finally {
      setApplying(false);
    }
  }

  const amount = gift ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(gift.amountCents / 100) : "";
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">A gift for you</p>
      <h1 className="heading-primary">{gift ? `${amount} ${gift.name}` : "Your gift is being prepared."}</h1>
      <p className="intro">Someone bought this for you. You do not need their account. This short guide explains the gift, then lets you create your own account and use the Shopify gift card as payment.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      {message && <p className="form-message" role="status">{message}</p>}
      {gift && <div className="purchase-research-grid">
        <article><h3>1. What this is</h3><p>Amped Up Network helps an EV owner learn, keep notes, and find independent service or upgrades. This gift is a Shopify gift card for {gift.name.toLowerCase()}.</p>{step === 0 && <Button onClick={() => setStep(1)}>Next</Button>}</article>
        <article><h3>2. What it does not do</h3><p>It does not review a car, book a time, or automatically match a shop. Those are not available yet. The card pays toward the included membership or kit when you choose to use it.</p>{step === 1 && <Button onClick={() => setStep(2)}>Create my account</Button>}</article>
        <article><h3>3. Make it yours</h3><p>{signedIn ? "Claim the card, then apply it. Shopify remains the record of the balance." : "Create your account only when you are ready to claim the gift."}</p>{step >= 2 && <div className="catalog-card-actions"><Button variant="secondary" disabled={applying} onClick={() => redeem("claim")}>Claim gift card</Button><Button disabled={applying} onClick={() => redeem("apply")}>Apply as payment</Button></div>}</article>
      </div>}
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>After the gift is applied</h2><p>Continue as a new owner and choose the next useful resource.</p><Link className="inline-cta" href="/new-ev-owner">Continue as a new owner</Link></div></section>
  </main>;
}
