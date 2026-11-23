import { NextRequest, NextResponse } from "next/server";
import { bearerToken } from "@/lib/api-validation";
import { applyGiftCardPayment, type GiftCardRow } from "@/lib/gift-card-fulfillment";
import { isGiftOffer } from "@/lib/gift-offers";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const tokenHeader = bearerToken(request);
  if (!tokenHeader) return NextResponse.json({ error: "Create an account to claim this gift." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const token = typeof record?.token === "string" ? record.token : "";
  const action = record?.action === "apply" ? "apply" : record?.action === "claim" ? "claim" : null;
  if (!action || token.length < 32 || token.length > 128) return NextResponse.json({ error: "This gift link is not valid." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: userData, error: userError } = await admin.auth.getUser(tokenHeader);
  if (userError || !userData.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const { data, error } = await admin.from("gift_cards").select("id,offer,amount_cents,purchaser_email,delivery_token,status,shopify_gift_card_id,shopify_last4,claimed_by,shopify_adjustment_id").eq("delivery_token", token).maybeSingle();
  if (error || !data || !isGiftOffer(data.offer) || data.status === "pending_payment") return NextResponse.json({ error: "This gift is not ready." }, { status: 404 });
  if (data.claimed_by && data.claimed_by !== userData.user.id) return NextResponse.json({ error: "This gift has already been claimed." }, { status: 409 });

  if (!data.claimed_by) {
    const claimed = await admin.from("gift_cards").update({ claimed_by: userData.user.id, claimed_at: new Date().toISOString(), status: "claimed" }).eq("id", data.id).is("claimed_by", null).select("id").maybeSingle();
    if (claimed.error || !claimed.data) return NextResponse.json({ error: "Could not claim this gift." }, { status: 409 });
  }
  if (action === "claim") return NextResponse.json({ status: "claimed", last4: data.shopify_last4, paymentMethod: "shopify_gift_card" });

  try {
    const adjustmentId = await applyGiftCardPayment(admin, { ...data, claimed_by: userData.user.id } as GiftCardRow, userData.user.id);
    return NextResponse.json({ status: "applied", adjustmentId, paymentMethod: "shopify_gift_card", last4: data.shopify_last4 });
  } catch (error) {
    console.error("Gift card payment failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "The Shopify gift card could not be applied." }, { status: 502 });
  }
}
