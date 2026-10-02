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
  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription;
    const tier = subscription.metadata.membership_tier;
    const userId = subscription.metadata.user_id;
    if (!userId || (tier !== "member" && tier !== "premium")) return NextResponse.json({ received: true });
    const active = subscription.status === "active" || subscription.status === "trialing";
    const status = active ? subscription.status : "cancelled";
    const { error } = await admin.from("membership_subscriptions").upsert({ user_id: userId, tier, status, stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id, stripe_subscription_id: subscription.id, source: "stripe" }, { onConflict: "user_id" });
    if (!error) await admin.from("profiles").update({ membership_tier: active ? tier : "free" }).eq("id", userId);
    return NextResponse.json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return NextResponse.json({ received: true });
  const orderId = session.metadata?.order_id || session.client_reference_id;
  if (!orderId) return NextResponse.json({ error: "Order reference missing." }, { status: 400 });
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (session.mode === "subscription") return NextResponse.json({ received: true });
  const { error } = await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent }).eq("id", orderId).eq("stripe_checkout_session_id", session.id).neq("status", "paid");
  if (error) {
    console.error("Could not fulfill Stripe order", error);
    return NextResponse.json({ error: "Could not fulfill order." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
