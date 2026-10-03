import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { applicationOrigin, boundedText, idempotencyKey, isUuid, optionalUuid } from "@/lib/api-validation";

export const runtime = "nodejs";

type CartItem = {
  id: string;
  quantity: number;
  product: { id: string; name: string; description: string; price_cents: number; installer_payout_cents: number; currency: string; active: boolean } | null;
};

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in to check out." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  const cartId = (body as Record<string, unknown>).cartId;
  const vehicleId = optionalUuid((body as Record<string, unknown>).vehicleId);
  const locationText = boundedText((body as Record<string, unknown>).locationText, 200);
  const notes = boundedText((body as Record<string, unknown>).notes, 2000);
  const key = idempotencyKey(request);
  if (!isUuid(cartId) || vehicleId === undefined || locationText === undefined || notes === undefined || !key) {
    return NextResponse.json({ error: "Provide a valid cart, fields within their limits, and an Idempotency-Key header." }, { status: 400 });
  }

  const { data: cart } = await admin.from("carts").select("id,status").eq("id", cartId).eq("user_id", userData.user.id).maybeSingle();
  if (!cart || cart.status !== "active") return NextResponse.json({ error: "This cart is no longer available." }, { status: 400 });
  const { data, error } = await admin.from("cart_items").select("id,quantity,product:catalog_products(id,name,description,price_cents,installer_payout_cents,currency,active)").eq("cart_id", cartId);
  const items = (data ?? []).map((item) => ({
    ...item,
    product: Array.isArray(item.product) ? item.product[0] ?? null : item.product,
  })) as unknown as CartItem[];
  if (error || !items.length || items.some((item) => !item.product?.active)) return NextResponse.json({ error: "Your cart has no available items." }, { status: 400 });
  if (vehicleId) {
    const { data: vehicle } = await admin.from("vehicle_catalog").select("id").eq("id", vehicleId).maybeSingle();
    if (!vehicle) return NextResponse.json({ error: "Choose a valid vehicle." }, { status: 400 });
    const productIds = items.map((item) => item.product!.id);
    const { data: compatibility, error: compatibilityError } = await admin
      .from("product_vehicle_compatibility")
      .select("product_id,vehicle_id")
      .in("product_id", productIds);
    if (compatibilityError) return NextResponse.json({ error: "Could not validate vehicle compatibility." }, { status: 500 });
    const allowedVehicles = new Map<string, Set<string>>();
    for (const row of compatibility ?? []) {
      const allowed = allowedVehicles.get(row.product_id) ?? new Set<string>();
      allowed.add(row.vehicle_id);
      allowedVehicles.set(row.product_id, allowed);
    }
    if (items.some((item) => {
      const allowed = allowedVehicles.get(item.product!.id);
      return allowed && !allowed.has(vehicleId);
    })) return NextResponse.json({ error: "One or more services are not compatible with the selected vehicle." }, { status: 400 });
  }

  const { data: orderId, error: orderError } = await admin.rpc("create_checkout_order", {
    p_cart_id: cartId, p_vehicle_id: vehicleId, p_location_text: locationText, p_notes: notes, p_idempotency_key: key,
  });
  if (orderError || !orderId) return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });

  const origin = applicationOrigin(request);
  try {
    const stripe = new Stripe(stripeKey);
    const { data: existing } = await admin.from("orders").select("stripe_checkout_session_id").eq("id", orderId).single();
    if (existing?.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id);
      if (session.url) return NextResponse.json({ url: session.url });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userData.user.email,
      client_reference_id: orderId,
      metadata: { order_id: orderId },
      line_items: items.map((item) => ({ quantity: item.quantity, price_data: { currency: item.product!.currency, unit_amount: item.product!.price_cents, product_data: { name: item.product!.name, description: item.product!.description } } })),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?cancelled=1`,
    });
    const { error: sessionError } = await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId).is("stripe_checkout_session_id", null);
    if (sessionError) throw sessionError;
    return NextResponse.json({ url: session.url });
  } catch (stripeError) {
    console.error("Stripe Checkout creation failed", stripeError);
    return NextResponse.json({ error: "Could not start Stripe Checkout." }, { status: 502 });
  }
}
