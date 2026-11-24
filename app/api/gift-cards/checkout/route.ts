import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applicationOrigin, idempotencyKey, isApplicationOrigin } from "@/lib/api-validation";
import { newDeliveryToken } from "@/lib/gift-card-fulfillment";
import { giftOfferName, isGiftCreditAmount } from "@/lib/gift-offers";
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
  const creditCents = record?.creditCents;
  const delivery = record?.delivery === "scheduled" ? "scheduled" : record?.delivery === "buyer" ? "buyer" : null;
  const recipientEmail = typeof record?.recipientEmail === "string" ? record.recipientEmail.trim().toLowerCase() : "";
  const sendOn = typeof record?.sendOn === "string" ? record.sendOn : "";
  const today = new Date().toISOString().slice(0, 10);
  const latest = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const scheduled = delivery === "scheduled";
  if (!key || !delivery || !isGiftCreditAmount(creditCents) || !emailPattern.test(email) || email.length > 320 || !emailPattern.test(recipientEmail) || recipientEmail.length > 320) return NextResponse.json({ error: "Enter both emails and choose a credit amount." }, { status: 400 });
  if (scheduled && (!/^\d{4}-\d{2}-\d{2}$/.test(sendOn) || sendOn < today || sendOn > latest)) return NextResponse.json({ error: "Choose a future delivery date." }, { status: 400 });

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
    : await admin.from("gift_cards").insert({
      offer: "store-credit",
      amount_cents: creditCents,
      remaining_cents: creditCents,
      purchaser_email: email,
      delivery_mode: delivery,
      recipient_email: recipientEmail,
      send_on: scheduled ? sendOn : null,
      delivery_token: token,
      idempotency_key: key,
    }).select("id,stripe_checkout_session_id").single();
  if (created.error || !created.data) return NextResponse.json({ error: "Could not start gift checkout." }, { status: 500 });
  const appOrigin = applicationOrigin(request);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: created.data.id,
    metadata: { purpose: "shopify_gift_card", gift_card_id: created.data.id, offer: "store-credit" },
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: creditCents, product_data: { name: giftOfferName, description: "Store credit for any Amped Up service or upgrade, plus 90 days of membership for the recipient. No buyer account is required." } } }],
    success_url: `${appOrigin}/black-friday/sent?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appOrigin}/black-friday`,
  }, { idempotencyKey: key });
  const saved = await admin.from("gift_cards").update({ stripe_checkout_session_id: session.id }).eq("id", created.data.id).is("stripe_checkout_session_id", null);
  if (saved.error) return NextResponse.json({ error: "Could not start gift checkout." }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
