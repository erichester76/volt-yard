import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";

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
  const body = await request.json().catch(() => ({}));
  const cartId = typeof body.cartId === "string" ? body.cartId : "";
  const vehicleId = typeof body.vehicleId === "string" && body.vehicleId ? body.vehicleId : null;
  const locationText = typeof body.locationText === "string" ? body.locationText.trim().slice(0, 200) : null;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;
  if (!cartId) return NextResponse.json({ error: "Cart is required." }, { status: 400 });

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

  const amount = items.reduce((total, item) => total + item.quantity * (item.product?.price_cents ?? 0), 0);
  const payoutAmount = items.reduce((total, item) => total + item.quantity * (item.product?.installer_payout_cents ?? 0), 0);
  const { data: order, error: orderError } = await admin.from("orders").insert({ user_id: userData.user.id, cart_id: cartId, amount_cents: amount, retail_service_amount_cents: amount, installer_payout_amount_cents: payoutAmount, platform_margin_cents: amount - payoutAmount }).select("id").single();
  if (orderError || !order) return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  const { error: requestError } = await admin.from("service_requests").insert(items.map((item) => ({ order_id: order.id, cart_item_id: item.id, product_id: item.product!.id, customer_id: userData.user.id, vehicle_id: vehicleId, location_text: locationText, notes, quantity: item.quantity, retail_service_price_cents: item.quantity * item.product!.price_cents, installer_payout_cents: item.quantity * item.product!.installer_payout_cents, platform_margin_cents: item.quantity * (item.product!.price_cents - item.product!.installer_payout_cents) })));
  if (requestError) {
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Could not create service requests." }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userData.user.email,
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      line_items: items.map((item) => ({ quantity: item.quantity, price_data: { currency: item.product!.currency, unit_amount: item.product!.price_cents, product_data: { name: item.product!.name, description: item.product!.description } } })),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?cancelled=1`,
    });
    await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
    return NextResponse.json({ url: session.url });
  } catch (stripeError) {
    await admin.from("orders").delete().eq("id", order.id);
    console.error("Stripe Checkout creation failed", stripeError);
    return NextResponse.json({ error: "Could not start Stripe Checkout." }, { status: 502 });
  }
}
