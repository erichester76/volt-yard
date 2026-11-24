import { NextRequest, NextResponse } from "next/server";
import { giftMembershipDays, giftOfferName } from "@/lib/gift-offers";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 128) return NextResponse.json({ error: "This gift link is not valid." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("gift_cards").select("offer,amount_cents,remaining_cents,status,recipient_email").eq("delivery_token", token).in("status", ["paid", "claimed", "applied"]).maybeSingle();
  if (error) return NextResponse.json({ error: "This gift is temporarily unavailable." }, { status: 500 });
  if (!data || data.offer !== "store-credit") return NextResponse.json({ error: "This gift link is not ready yet." }, { status: 404 });
  return NextResponse.json({ offer: data.offer, name: giftOfferName, amountCents: data.amount_cents, remainingCents: data.remaining_cents, membershipDays: giftMembershipDays, status: data.status, recipientEmail: data.recipient_email });
}
