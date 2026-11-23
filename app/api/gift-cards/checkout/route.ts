import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applicationOrigin, idempotencyKey, isApplicationOrigin } from "@/lib/api-validation";
import { newDeliveryToken } from "@/lib/gift-card-fulfillment";
import { giftOffers, isGiftOffer } from "@/lib/gift-offers";
import { shopifyGiftCardsConfigured } from "@/lib/shopify-gift-cards";
import { giftEmailConfigured } from "@/lib/transactional-email";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !isApplicationOrigin(origin, request)) return NextResponse.json({ error: "Invalid checkout origin." }, { status: 403 });
  if (!shopifyGiftCardsConfigured() || !giftEmailConfigured()) return NextResponse.json({ error: "Gift cards are not configured." }, { status: 503 });
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  const key = idempotencyKey(request);
  const body = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const email = typeof record?.email === "string" ? record.email.trim().toLowerCase() : "";
  const offer = record?.offer;
  if (!key || !isGiftOffer(offer) || !emailPattern.test(email) || email.length > 320) return NextResponse.json({ error: "Enter an email and choose a gift." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const existing = await admin.from("gift_cards").select("id,stripe_checkout_session_id").eq("idempotency_key", key).maybeSingle();
  if (existing.error) return NextResponse.json({ error: "Could not start gift checkout." }, { status: 500 });
  const stripe = new Stripe(stripeKey);
  if (existing.data?.stripe_checkout_session_id) {
    const session = await stripe.checkout.sessions.retrieve(existing.data.stripe_checkout_session_id);
    return NextResponse.json({ url: session.url });
  }
  const token = newDeliveryToken();
  const created = existing.data
    ? existing
    : await admin.from("gift_cards").insert({ offer, amount_cents: giftOffers[offer].cents, purchaser_email: email, delivery_token: token, idempotency_key: key }).select("id,stripe_checkout_session_id").single();
  if (created.error || !created.data) return NextResponse.json({ error: "Could not start gift checkout." }, { status: 500 });
  const appOrigin = applicationOrigin(request);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: created.data.id,
    metadata: { purpose: "shopify_gift_card", gift_card_id: created.data.id, offer },
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: giftOffers[offer].cents, product_data: { name: giftOffers[offer].name, description: "Shopify-managed Amped Up gift card. No account is required to buy or forward it." } } }],
    success_url: `${appOrigin}/black-friday/sent?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appOrigin}/black-friday`,
  }, { idempotencyKey: key });
  const saved = await admin.from("gift_cards").update({ stripe_checkout_session_id: session.id }).eq("id", created.data.id).is("stripe_checkout_session_id", null);
  if (saved.error) return NextResponse.json({ error: "Could not start gift checkout." }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
