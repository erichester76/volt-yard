"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { requestAccount } from "@/lib/account-gate";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { GiftLandingView } from "../gift-landing-view";

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
      setMessage(result.last4 ? `Welcome in. Your 90 days have started, and your gift card ending ${result.last4} is ready when you want to use it.` : "Welcome in. Your 90 days have started, and the gift credit is ready when you want to use it.");
    } finally {
      setClaiming(false);
    }
  }

  const amount = gift ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(gift.amountCents / 100) : "";
  return <GiftLandingView amountLabel={amount} message={message} claimed={claimed} claiming={claiming} onClaim={claim} />;
}
