import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { applicationOrigin, bearerToken, idempotencyKey } from "@/lib/api-validation";

export const runtime = "nodejs";
const prices: Record<string, { amount: number; name: string }> = { member: { amount: 900, name: "Volt Yard Member" }, premium: { amount: 1900, name: "Volt Yard Premium" } };

export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const token = bearerToken(request);
  const body: unknown = await request.json().catch(() => null);
  const tier = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).tier : undefined;
  if (!key) return NextResponse.json({ error: "Stripe is not configured. An administrator can assign a demo tier." }, { status: 503 });
  if (!token) return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  const requestKey = idempotencyKey(request);
  if (typeof tier !== "string" || !prices[tier] || !requestKey) return NextResponse.json({ error: "Choose a paid tier and provide an Idempotency-Key header." }, { status: 400 });
  const admin = createAdminSupabaseClient(); const { data } = await admin.auth.getUser(token);
  if (!data.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const origin = applicationOrigin(request);
  const metadata = { membership_tier: tier, user_id: data.user.id };
  const session = await new Stripe(key).checkout.sessions.create({ mode: "subscription", customer_email: data.user.email, metadata, subscription_data: { metadata }, line_items: [{ price_data: { currency: "usd", recurring: { interval: "month" }, unit_amount: prices[tier].amount, product_data: { name: prices[tier].name } }, quantity: 1 }], success_url: `${origin}/membership?success=1`, cancel_url: `${origin}/membership?cancelled=1` }, { idempotencyKey: requestKey });
  return NextResponse.json({ url: session.url });
}
