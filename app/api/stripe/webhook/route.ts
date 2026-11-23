import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { applicationOrigin } from "@/lib/api-validation";
import { issueAndEmailGiftCard, type GiftCardRow } from "@/lib/gift-card-fulfillment";
import { isGiftOffer } from "@/lib/gift-offers";
import { isHandledStripeWebhookEvent, giftCardWebhookUpdate, membershipWebhookUpdate, paidOrderWebhookUpdate } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !webhookSecret || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = new Stripe(secret).webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.warn("Rejected Stripe webhook signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (!isHandledStripeWebhookEvent(event.type)) return NextResponse.json({ received: true });
  const admin = createAdminSupabaseClient();
  const { error: ledgerInsertError } = await admin.from("stripe_event_ledger").upsert(
    { event_id: event.id, event_type: event.type, payload: event }, { onConflict: "event_id", ignoreDuplicates: true },
  );
  if (ledgerInsertError) return NextResponse.json({ error: "Could not record webhook." }, { status: 500 });
  const { data: ledger, error: ledgerError } = await admin.from("stripe_event_ledger").select("processed_at,failure_count").eq("event_id", event.id).single();
  if (ledgerError) return NextResponse.json({ error: "Could not read webhook ledger." }, { status: 500 });
  if (ledger.processed_at) return NextResponse.json({ received: true });

  try {
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const update = membershipWebhookUpdate(subscription);
      if (!update) throw new Error("Subscription metadata is missing or invalid.");
      const { error } = await admin.from("membership_subscriptions").upsert({ user_id: update.userId, tier: update.tier, status: update.status, stripe_customer_id: update.customerId, stripe_subscription_id: update.subscriptionId, source: "stripe" }, { onConflict: "user_id" });
      if (error) throw error;
      const { error: customerError } = await admin.from("membership_billing_customers").upsert({ user_id: update.userId, stripe_customer_id: update.customerId, checkout_started_at: null, stripe_checkout_session_id: null }, { onConflict: "user_id" });
      if (customerError) throw customerError;
      const { error: profileError } = await admin.from("profiles").update({ membership_tier: update.profileTier }).eq("id", update.userId);
      if (profileError) throw profileError;
    } else {
      const session = event.data.object as Stripe.Checkout.Session;
      const gift = giftCardWebhookUpdate(session);
      if (gift) {
        const { data: row, error: giftError } = await admin.from("gift_cards").select("id,offer,amount_cents,purchaser_email,delivery_token,status,shopify_gift_card_id,shopify_last4,claimed_by,shopify_adjustment_id").eq("id", gift.giftCardId).eq("stripe_checkout_session_id", gift.sessionId).maybeSingle();
        if (giftError || !row || !isGiftOffer(row.offer)) throw new Error("Gift card does not match this checkout session.");
        const { error: paidError } = await admin.from("gift_cards").update({ stripe_payment_intent_id: gift.paymentIntent, status: row.status === "pending_payment" ? "paid" : row.status }).eq("id", row.id);
        if (paidError) throw paidError;
        await issueAndEmailGiftCard(admin, row as GiftCardRow, applicationOrigin(request));
      }
      const update = gift ? null : paidOrderWebhookUpdate(session);
      if (session.payment_status === "paid" && session.mode !== "subscription" && !update) throw new Error("Order reference missing.");
      if (update) {
        const { data: order, error } = await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: update.paymentIntent }).eq("id", update.orderId).eq("stripe_checkout_session_id", update.sessionId).neq("status", "paid").select("id").maybeSingle();
        if (error) throw error;
        if (!order) {
          const { data: existing, error: existingError } = await admin.from("orders").select("status").eq("id", update.orderId).eq("stripe_checkout_session_id", update.sessionId).maybeSingle();
          if (existingError || existing?.status !== "paid") throw new Error("Order does not match this checkout session.");
        }
      }
    }
    const { error } = await admin.from("stripe_event_ledger").update({ processed_at: new Date().toISOString(), last_error: null }).eq("event_id", event.id);
    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    await admin.from("stripe_event_ledger").update({ failure_count: ledger.failure_count + 1, last_error: error instanceof Error ? error.message.slice(0, 2000) : "Webhook processing failed" }).eq("event_id", event.id);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
