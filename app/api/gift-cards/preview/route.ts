import { NextRequest, NextResponse } from "next/server";
import { giftOffers, isGiftOffer } from "@/lib/gift-offers";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 128) return NextResponse.json({ error: "This gift link is not valid." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("gift_cards").select("offer,amount_cents,status").eq("delivery_token", token).in("status", ["paid", "claimed", "applied"]).maybeSingle();
  if (error) return NextResponse.json({ error: "This gift is temporarily unavailable." }, { status: 500 });
  if (!data || !isGiftOffer(data.offer)) return NextResponse.json({ error: "This gift link is not ready yet." }, { status: 404 });
  return NextResponse.json({ offer: data.offer, name: giftOffers[data.offer].name, amountCents: data.amount_cents, status: data.status });
}
