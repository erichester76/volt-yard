import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { applicationOrigin, bearerToken } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Sign in to manage your membership." }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY;
  const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
  if (!secret) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  if (!configuration) return NextResponse.json({ error: "Membership management is not configured. Choose another tier to update it." }, { status: 409 });

  const admin = createAdminSupabaseClient();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const { data: customer, error: customerError } = await admin.from("membership_billing_customers").select("stripe_customer_id").eq("user_id", auth.user.id).maybeSingle();
  if (customerError) return NextResponse.json({ error: "Could not look up your membership." }, { status: 500 });
  if (!customer) return NextResponse.json({ error: "You do not have a Stripe membership to manage." }, { status: 404 });

  try {
    const session = await new Stripe(secret).billingPortal.sessions.create({ customer: customer.stripe_customer_id, configuration, return_url: `${applicationOrigin(request)}/membership` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create Stripe Billing Portal session", error);
    return NextResponse.json({ error: "Membership management is temporarily unavailable." }, { status: 502 });
  }
}
