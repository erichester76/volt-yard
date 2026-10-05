import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applicationOrigin, bearerToken } from "@/lib/api-validation";
import { isCurrentMembershipStatus } from "@/lib/membership-billing";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Sign in to manage your membership." }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  const admin = createAdminSupabaseClient();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const { data: customer, error: customerError } = await admin.from("membership_billing_customers").select("stripe_customer_id").eq("user_id", auth.user.id).maybeSingle();
  if (customerError) return NextResponse.json({ error: "Could not look up your membership." }, { status: 500 });
  if (!customer) return NextResponse.json({ error: "You do not have a Stripe membership to cancel." }, { status: 404 });

  try {
    const stripe = new Stripe(secret);
    const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
    if (configuration) {
      const portal = await stripe.billingPortal.sessions.create({ customer: customer.stripe_customer_id, configuration, return_url: `${applicationOrigin(request)}/membership` });
      return NextResponse.json({ url: portal.url });
    }
    const subscriptions = await stripe.subscriptions.list({ customer: customer.stripe_customer_id, status: "all", limit: 100 });
    const current = subscriptions.data.find((subscription) => subscription.metadata.user_id === auth.user.id && isCurrentMembershipStatus(subscription.status));
    if (!current) return NextResponse.json({ error: "You do not have a current Stripe membership to cancel." }, { status: 409 });
    await stripe.subscriptions.update(current.id, { cancel_at_period_end: true });
    return NextResponse.json({ message: "Your membership will end at the close of the current billing period." });
  } catch (error) {
    console.error("Could not cancel Stripe membership", error);
    return NextResponse.json({ error: "Membership cancellation is temporarily unavailable." }, { status: 502 });
  }
}
