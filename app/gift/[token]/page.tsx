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
      if (!response.ok) return setMessage(result.error ?? "This gift is not ready to open yet.");
      setGift(result);
      setMessage("");
    }).catch(() => setMessage("This gift is not ready to open yet."));
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
      if (!response.ok) return setMessage(result.error ?? "We could not open this gift yet. Please try again.");
      setMessage(result.last4 ? `Welcome in. Your 30 days have started, and your gift card ending ${result.last4} is ready when you want to use it.` : "Welcome in. Your 30 days have started, and the gift credit is ready when you want to use it.");
      setStep(3);
    } finally {
      setApplying(false);
    }
  }

  const amount = gift ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(gift.amountCents / 100) : "";
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">Someone thought of you</p>
      <h1 className="heading-primary">{gift ? `${amount} toward taking care of your EV` : "A gift is on its way."}</h1>
      <p className="intro">This is yours, not the person who bought it. You get 30 days of membership, normally $9, so your questions and history stay in one place. The credit is extra, for any service or upgrade you choose.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      {message && <p className="form-message" role="status">{message}</p>}
      {gift && <div className="purchase-research-grid">
        <article><h3>A month inside the network</h3><p>Membership lets you keep a case history and take part in the community: ask, reply, and vote. Reading is free. This month lets you join in.</p>{step === 0 && <Button onClick={() => setStep(1)}>That sounds good</Button>}</article>
        <article><h3>Money set aside for real work</h3><p>Use it on any service or upgrade in the catalog. It will not book the appointment or pick the shop for you. You still get to choose.</p>{step === 1 && <Button onClick={() => setStep(2)}>I am ready</Button>}</article>
        <article><h3>Make it yours</h3><p>{signedIn ? "Claiming starts your 30 days and keeps the credit ready for checkout." : "Create your own account when you want the gift in your name."}</p>{step >= 2 && <Button disabled={applying} onClick={() => redeem("claim")}>{applying ? "Opening your gift..." : "Claim my gift"}</Button>}</article>
      </div>}
    </div></section>
    <section className="purchase-research-close"><div className="wrap"><h2>When you are ready for the next step</h2><p>Start with the basics, look at service, or just read what other owners wish they had known.</p><Link className="inline-cta" href="/new-ev-owner">Show me where to start</Link></div></section>
  </main>;
}
