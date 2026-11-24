import { NextRequest, NextResponse } from "next/server";
import { bearerToken } from "@/lib/api-validation";

import { giftMembershipDays } from "@/lib/gift-offers";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const tokenHeader = bearerToken(request);
  if (!tokenHeader) return NextResponse.json({ error: "Create an account to claim this gift." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const token = typeof record?.token === "string" ? record.token : "";
  const action = record?.action === "claim" ? "claim" : null;
  if (!action || token.length < 32 || token.length > 128) return NextResponse.json({ error: "This gift link is not valid." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: userData, error: userError } = await admin.auth.getUser(tokenHeader);
  if (userError || !userData.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const { data, error } = await admin.from("gift_cards").select("id,offer,amount_cents,remaining_cents,status,shopify_last4,claimed_by").eq("delivery_token", token).maybeSingle();
  if (error || !data || data.offer !== "store-credit" || data.status === "pending_payment") return NextResponse.json({ error: "This gift is not ready." }, { status: 404 });
  if (data.claimed_by && data.claimed_by !== userData.user.id) return NextResponse.json({ error: "This gift has already been claimed." }, { status: 409 });

  if (!data.claimed_by) {
    const claimed = await admin.from("gift_cards").update({ claimed_by: userData.user.id, claimed_at: new Date().toISOString(), status: "claimed" }).eq("id", data.id).is("claimed_by", null).select("id").maybeSingle();
    if (claimed.error || !claimed.data) return NextResponse.json({ error: "Could not claim this gift." }, { status: 409 });
  }
  const endsAt = new Date(Date.now() + giftMembershipDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: subscription } = await admin.from("membership_subscriptions").select("source,tier").eq("user_id", userData.user.id).maybeSingle();
  if (subscription?.source !== "stripe") {
    const { error: membershipError } = await admin.from("membership_subscriptions").upsert({ user_id: userData.user.id, tier: "member", status: "active", current_period_end: endsAt, source: "shopify_gift" }, { onConflict: "user_id" });
    if (membershipError) return NextResponse.json({ error: "Could not start the included membership." }, { status: 500 });
    const { error: profileError } = await admin.from("profiles").update({ membership_tier: "member" }).eq("id", userData.user.id).eq("membership_tier", "free");
    if (profileError) return NextResponse.json({ error: "Could not start the included membership." }, { status: 500 });
  }
  return NextResponse.json({ status: "claimed", last4: data.shopify_last4, paymentMethod: "shopify_gift_card", membershipDays: giftMembershipDays, remainingCents: data.remaining_cents ?? data.amount_cents });
}
