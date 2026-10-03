import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { applicationOrigin, idempotencyKey } from "@/lib/api-validation";

export const runtime = "nodejs";
const prices: Record<string, { amount: number; name: string }> = { member: { amount: 900, name: "Volt Yard Member" }, premium: { amount: 1900, name: "Volt Yard Premium" } };

export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { tier } = await request.json().catch(() => ({}));
  if (!key) return NextResponse.json({ error: "Stripe is not configured. An administrator can assign a demo tier." }, { status: 503 });
  if (!token || typeof tier !== "string" || !prices[tier] || !idempotencyKey(request)) return NextResponse.json({ error: "Sign in, choose a paid tier, and provide an Idempotency-Key header." }, { status: 400 });
  const admin = createAdminSupabaseClient(); const { data } = await admin.auth.getUser(token);
  if (!data.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const origin = applicationOrigin(request);
  const metadata = { membership_tier: tier, user_id: data.user.id };
  const session = await new Stripe(key).checkout.sessions.create({ mode: "subscription", customer_email: data.user.email, metadata, subscription_data: { metadata }, line_items: [{ price_data: { currency: "usd", recurring: { interval: "month" }, unit_amount: prices[tier].amount, product_data: { name: prices[tier].name } }, quantity: 1 }], success_url: `${origin}/membership?success=1`, cancel_url: `${origin}/membership?cancelled=1` }, { idempotencyKey: idempotencyKey(request)! });
  return NextResponse.json({ url: session.url });
}
