"use client";

import Link from "@/app/locale-link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { requestAccount } from "@/lib/account-gate";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/app/page-primitives";

type GiftPreview = { name: string; amountCents: number; status: string };

export default function GiftLandingPage() {
  const { token } = useParams<{ token: string }>();
  const [gift, setGift] = useState<GiftPreview | null>(null);
  const [message, setMessage] = useState("Opening your gift...");
  const [signedIn, setSignedIn] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/gift-cards/preview?token=${encodeURIComponent(token)}`).then(async (response) => {
      const result: GiftPreview & { error?: string } = await response.json().catch(() => ({ error: "This gift is not ready to open yet." }));
      if (!response.ok) return setMessage(result.error ?? "This gift is not ready to open yet.");
      setGift(result);
      setMessage("");
      setClaimed(result.status === "claimed" || result.status === "applied");
    }).catch(() => setMessage("This gift is not ready to open yet."));
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    void db.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => listener.subscription.unsubscribe();
  }, [token]);

  async function claim() {
    if (!signedIn) {
      requestAccount("sign-up", window.location.pathname);
      return;
    }
    setClaiming(true);
    setMessage("");
    try {
      const db = createBrowserSupabaseClient();
      const { data: session } = await db.auth.getSession();
      if (!session.session) return requestAccount("sign-up", window.location.pathname);
      const response = await fetch("/api/gift-cards/redeem", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.session.access_token}` },
        body: JSON.stringify({ token, action: "claim" }),
      });
      const result: { error?: string; last4?: string } = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(result.error ?? "We could not open this gift yet. Please try again.");
      setClaimed(true);
      setMessage(result.last4 ? `Welcome in. Your 30 days have started, and your gift card ending ${result.last4} is ready when you want to use it.` : "Welcome in. Your 30 days have started, and the gift credit is ready when you want to use it.");
    } finally {
      setClaiming(false);
    }
  }

  const amount = gift ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(gift.amountCents / 100) : "";
  return <main className="purchase-research-page">
    <section className="hero purchase-research-hero"><div className="wrap">
      <p className="eyebrow">Your gift</p>
      <h1 className="heading-primary">{gift ? `${amount} to make the car easier to own` : "A gift is waiting."}</h1>
      <p className="intro">Whether this is your first day or your fifth year with your EV, someone just gave you a way to make the experience better. Amped Up is the place for better answers, the right parts, and the right specialist to get you and your car where you want to go. This gift is your entry to the Amped Up Network. Enjoy.</p>
    </div></section>
    <section className="purchase-research-paths"><div className="wrap">
      {message && <p className="form-message" role="status">{message}</p>}
      {gift && <div className="purchase-research-grid">
        <article><h3>30 days inside</h3><p>Membership, normally $9 a month, lets you keep a history of the car and join the owner conversation. Reading is free. This month lets you take part.</p></article>
        <article><h3>{amount} for the work</h3><p>Spend it on any service or upgrade. It will not book the visit or pick the shop. You still choose.</p></article>
        <article><h3>Make it yours</h3><p>{claimed ? "Your membership is started and the credit is ready at checkout." : signedIn ? "Claiming puts the membership and credit in your name." : "Create your own account when you want the gift in your name. The buyer does not need one."}</p>{!claimed && <Button disabled={claiming} onClick={claim}>{claiming ? "Opening your gift..." : "Claim my gift"}</Button>}</article>
      </div>}
    </div></section>
    {claimed && <section className="purchase-research-close"><div className="wrap"><h2>Go use it.</h2><p>Look at service, upgrades, or what other owners already figured out.</p><Link className="inline-cta" href="/services">Browse services</Link></div></section>}
  </main>;
}
