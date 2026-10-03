import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";

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
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded" && event.type !== "customer.subscription.created" && event.type !== "customer.subscription.updated" && event.type !== "customer.subscription.deleted") return NextResponse.json({ received: true });
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
      const tier = subscription.metadata.membership_tier;
      const userId = subscription.metadata.user_id;
      if (!userId || (tier !== "member" && tier !== "premium")) throw new Error("Subscription metadata is missing or invalid.");
      const active = subscription.status === "active" || subscription.status === "trialing";
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const { error } = await admin.from("membership_subscriptions").upsert({ user_id: userId, tier, status: subscription.status, stripe_customer_id: customerId, stripe_subscription_id: subscription.id, source: "stripe" }, { onConflict: "user_id" });
      if (error) throw error;
      const { error: customerError } = await admin.from("membership_billing_customers").upsert({ user_id: userId, stripe_customer_id: customerId, checkout_started_at: null, stripe_checkout_session_id: null }, { onConflict: "user_id" });
      if (customerError) throw customerError;
      const { error: profileError } = await admin.from("profiles").update({ membership_tier: active ? tier : "free" }).eq("id", userId);
      if (profileError) throw profileError;
    } else {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid" && session.mode !== "subscription") {
        const orderId = session.metadata?.order_id || session.client_reference_id;
        if (!orderId) throw new Error("Order reference missing.");
        const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
        const { data: order, error } = await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent }).eq("id", orderId).eq("stripe_checkout_session_id", session.id).neq("status", "paid").select("id").maybeSingle();
        if (error) throw error;
        if (!order) {
          const { data: existing, error: existingError } = await admin.from("orders").select("status").eq("id", orderId).eq("stripe_checkout_session_id", session.id).maybeSingle();
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
