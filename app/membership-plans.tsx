"use client";

import { useEffect, useState } from "react";
import { HeadingAccent } from "@/app/heading-accent";
import { ActionLink, Button, PageHeader } from "@/app/page-primitives";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const tiers = [
  { key: "free", name: "Free", price: "$0", copy: "Start a case, use DIY guides, and read the community." },
  { key: "member", name: "Member", price: "$9/mo", copy: "Persistent case history and full community participation. Future member discounts are planned and not yet available." },
  { key: "premium", name: "Premium", price: "$19/mo", copy: "Priority service context and paid expert-response opportunities. Future member discounts are planned and not yet available." },
];

export default function MembershipPlans({ management = false }: { management?: boolean }) {
  const [tier, setTier] = useState("free");
  const [message, setMessage] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    db.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await db.from("profiles").select("membership_tier").eq("id", data.user.id).maybeSingle();
      setTier(profile?.membership_tier ?? "free");
    });
  }, []);

  async function requestMembership(path: string, body?: object) {
    if (checkingOut) return;
    if (!isSupabaseConfigured) return setMessage("Configure Supabase and Stripe to subscribe.");
    setCheckingOut(true);
    const db = createBrowserSupabaseClient();
    try {
      const { data } = await db.auth.getSession();
      if (!data.session) {
        setMessage("Sign in, then choose a tier.");
        return;
      }
      setMessage("Opening secure Stripe membership management...");
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`, ...(body ? { "Idempotency-Key": crypto.randomUUID() } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result: { url?: string; error?: string; message?: string } = await response.json().catch(() => ({}));
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setMessage(result.message || result.error || "Membership management could not be started.");
    } catch {
      setMessage("Membership management could not be started. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  return <main className="content-page wrap membership"><PageHeader className="content-head" eyebrow={management ? "Membership" : "Membership plans"} title={management ? <><HeadingAccent>Manage</HeadingAccent> your membership.</> : <><HeadingAccent>Choose</HeadingAccent> the help you need.</>} intro="Keep your issue history in one place, join the community, and get the support you need." actions={management ? <><ActionLink variant="secondary" href="/issues">My issues</ActionLink>{tier !== "free" ? <><Button variant="secondary" disabled={checkingOut} onClick={() => requestMembership("/api/membership/portal")}>Manage membership</Button><Button variant="secondary" disabled={checkingOut} onClick={() => { if (window.confirm("Cancel at the end of the current billing period?")) void requestMembership("/api/membership/cancel"); }}>Cancel membership</Button></> : null}</> : <ActionLink variant="secondary" href="/membership">Manage membership</ActionLink>} /><p className="directory-status" role="status">{message}</p><section className="tier-grid">{tiers.map((item) => <article className={tier === item.key ? "tier-card active" : "tier-card"} key={item.key}><p className="eyebrow">{item.name}</p><h2>{item.price}</h2><p>{item.copy}</p>{item.key === "free" ? <span>{tier === "free" ? "Current baseline" : "Included with every account"}</span> : <Button disabled={checkingOut || tier === item.key} onClick={() => requestMembership("/api/membership/checkout", { tier: item.key })}>{tier === item.key ? "Current tier" : checkingOut ? "Opening Stripe..." : `Choose ${item.name}`}</Button>}</article>)}</section></main>;
}
