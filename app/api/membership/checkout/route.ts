import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { applicationOrigin, bearerToken, idempotencyKey } from "@/lib/api-validation";
import { isCurrentMembershipStatus, isMembershipTier, membershipPriceId, MembershipTier } from "@/lib/membership-billing";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  const body: unknown = await request.json().catch(() => null);
  const tier = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).tier : undefined;
  if (!token) return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  const requestKey = idempotencyKey(request);
  if (!isMembershipTier(tier) || !requestKey) return NextResponse.json({ error: "Choose a paid tier and provide an Idempotency-Key header." }, { status: 400 });
  const key = process.env.STRIPE_SECRET_KEY;
  const priceId = membershipPriceId(tier);
  if (!key || !priceId) return NextResponse.json({ error: "Stripe membership pricing is not configured." }, { status: 503 });
  const admin = createAdminSupabaseClient(); const { data, error: authError } = await admin.auth.getUser(token);
  if (authError || !data.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const origin = applicationOrigin(request);
  const metadata = { membership_tier: tier, user_id: data.user.id };
  const stripe = new Stripe(key);
  const { data: savedCustomer, error: savedCustomerError } = await admin.from("membership_billing_customers").select("stripe_customer_id").eq("user_id", data.user.id).maybeSingle();
  if (savedCustomerError) return NextResponse.json({ error: "Could not look up your membership." }, { status: 500 });
  let customerId = savedCustomer?.stripe_customer_id;
  if (!customerId) {
    const createdCustomer = await stripe.customers.create({ email: data.user.email ?? undefined, metadata: { user_id: data.user.id } }, { idempotencyKey: `membership-customer-${data.user.id}` });
    const { error } = await admin.from("membership_billing_customers").upsert({ user_id: data.user.id, stripe_customer_id: createdCustomer.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "Could not save your billing customer." }, { status: 500 });
    const { data: mappedCustomer, error: mappedCustomerError } = await admin.from("membership_billing_customers").select("stripe_customer_id").eq("user_id", data.user.id).single();
    if (mappedCustomerError || !mappedCustomer) return NextResponse.json({ error: "Could not confirm your billing customer." }, { status: 500 });
    customerId = mappedCustomer.stripe_customer_id;
  }
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  const current = subscriptions.data.find((subscription) => subscription.metadata.user_id === data.user.id && isCurrentMembershipStatus(subscription.status));
  if (current) {
    const currentTier = current.metadata.membership_tier as MembershipTier;
    if (!isMembershipTier(currentTier)) return NextResponse.json({ error: "Your current membership cannot be identified safely. Contact support." }, { status: 409 });
    if (currentTier === tier) return NextResponse.json({ error: "You already have this membership. Manage it in Stripe to cancel or update payment details." }, { status: 409 });
    const portalConfiguration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
    if (portalConfiguration) {
      const portal = await stripe.billingPortal.sessions.create({ customer: customerId, configuration: portalConfiguration, return_url: `${origin}/membership` });
      return NextResponse.json({ url: portal.url });
    }
    const item = current.items.data[0];
    if (!item) return NextResponse.json({ error: "Your current membership cannot be updated automatically." }, { status: 409 });
    await stripe.subscriptions.update(current.id, { items: [{ id: item.id, price: priceId }], metadata });
    return NextResponse.json({ status: "updated", message: "Your membership change was submitted. Stripe will confirm it shortly." });
  }
  const now = new Date();
  const staleCheckout = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const { data: checkoutClaim, error: checkoutClaimError } = await admin.from("membership_billing_customers").update({ checkout_started_at: now.toISOString(), stripe_checkout_session_id: null }).eq("user_id", data.user.id).or(`checkout_started_at.is.null,checkout_started_at.lt.${staleCheckout}`).select("user_id").maybeSingle();
  if (checkoutClaimError) return NextResponse.json({ error: "Could not start membership checkout." }, { status: 500 });
  if (!checkoutClaim) return NextResponse.json({ error: "A membership checkout is already in progress. Finish it or wait for it to expire before trying again." }, { status: 409 });
  const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: customerId, metadata, subscription_data: { metadata }, line_items: [{ price: priceId, quantity: 1 }], expires_at: Math.floor(now.getTime() / 1000) + 30 * 60, success_url: `${origin}/membership?success=1`, cancel_url: `${origin}/membership?cancelled=1` }, { idempotencyKey: requestKey });
  const { error: sessionError } = await admin.from("membership_billing_customers").update({ stripe_checkout_session_id: session.id }).eq("user_id", data.user.id).eq("checkout_started_at", now.toISOString());
  if (sessionError) return NextResponse.json({ error: "Could not save membership checkout." }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
