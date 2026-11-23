"use client";

import Link from "@/app/locale-link";
import { useEffect, useState } from "react";
import { requestAccount } from "@/lib/account-gate";
import { clearGuestCart, readGuestCart, removeGuestItem } from "@/lib/guest-cart";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { Button, PageHeader } from "@/app/page-primitives";

type Item = { id: string; quantity: number; product: { name: string; price_cents: number } | null };
type Vehicle = { id: string; make: string; model: string; model_year: number };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function CartPage() {
  const [cartId, setCartId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [guest, setGuest] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  async function load() {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    const { data: vehicleRows } = await db.from("vehicle_catalog").select("id,make,model,model_year").not("powertrain", "is", null).order("make").limit(500);
    setVehicles((vehicleRows ?? []) as Vehicle[]);
    if (!auth.user) {
      setGuest(true);
      setCartId("");
      setItems(readGuestCart().map((item) => ({ id: item.productId, quantity: item.quantity, product: { name: item.name, price_cents: item.priceCents } })));
      return;
    }
    const pending = readGuestCart();
    let { data: cart } = await db.from("carts").select("id").eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
    if (!cart && pending.length) {
      const created = await db.from("carts").insert({ user_id: auth.user.id }).select("id").single();
      if (created.error || !created.data) return setMessage(created.error?.message ?? "Could not create your cart.");
      cart = created.data;
    }
    if (cart && pending.length) {
      for (const item of pending) {
        const { error } = await db.from("cart_items").upsert({ cart_id: cart.id, product_id: item.productId, quantity: item.quantity }, { onConflict: "cart_id,product_id" });
        if (error) return setMessage(error.message);
      }
      clearGuestCart();
    }
    const { data: loaded } = cart
      ? await db.from("carts").select("id,cart_items(id,quantity,product:catalog_products(name,price_cents))").eq("id", cart.id).maybeSingle()
      : { data: null };
    setGuest(false);
    setCartId(loaded?.id ?? "");
    setItems((loaded?.cart_items ?? []).map((item) => ({ ...item, product: Array.isArray(item.product) ? item.product[0] ?? null : item.product })) as unknown as Item[]);
    if (new URLSearchParams(window.location.search).get("checkout") === "1" && loaded?.id && (loaded.cart_items?.length ?? 0) > 0) void checkout(loaded.id, true);
  }

  useEffect(() => { void load();
    // Cart load runs once; sign-in returns through ?checkout=1 and merges the guest cart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(id: string) {
    if (guest) {
      removeGuestItem(id);
      setItems((current) => current.filter((item) => item.id !== id));
      return;
    }
    const { error } = await createBrowserSupabaseClient().from("cart_items").delete().eq("id", id);
    if (error) setMessage(error.message);
    else { window.dispatchEvent(new Event("volt-yard-cart-updated")); void load(); }
  }

  async function checkout(activeCartId = cartId, signedIn = !guest) {
    if (checkingOut) return;
    if (!signedIn || !activeCartId) {
      requestAccount("sign-up", `${window.location.pathname}?checkout=1`);
      return;
    }
    setCheckingOut(true);
    setMessage("");
    try {
      const db = createBrowserSupabaseClient();
      const { data: session } = await db.auth.getSession();
      if (!session.session) {
        requestAccount("sign-up", `${window.location.pathname}?checkout=1`);
        return;
      }
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.session.access_token}`, "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ cartId: activeCartId, vehicleId: vehicleId || null, locationText, notes }) });
      const data: { url?: string; error?: string } = await response.json().catch(() => ({}));
      if (data.url) { window.location.assign(data.url); return; }
      setMessage(data.error ?? "Could not begin checkout.");
    } catch {
      setMessage("Could not begin checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  const total = items.reduce((sum, item) => sum + item.quantity * (item.product?.price_cents ?? 0), 0);
  return <main className="commerce wrap"><PageHeader className="commerce-head" eyebrow="Your cart" title="Set up service." intro="You can review a cart before creating an account. Payment starts only after sign-in, on Stripe Checkout." />{message && <p className="form-message">{message}</p>}<section className="cart-layout"><div className="cart-items">{items.map((item) => <div className="cart-item" key={item.id}><div><strong>{item.product?.name}</strong><p>Quantity {item.quantity}</p></div><div><strong>{money((item.product?.price_cents ?? 0) * item.quantity)}</strong><button onClick={() => remove(item.id)}>Remove</button></div></div>)}{!items.length && <p>Your cart is empty. <Link href="/catalog">Browse services & upgrades.</Link></p>}</div><aside className="checkout-card"><label>Vehicle (optional)<select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">Choose later</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.model_year} {vehicle.make} {vehicle.model}</option>)}</select></label><label>City, state, or ZIP<input value={locationText} onChange={(event) => setLocationText(event.target.value)} placeholder="Used to guide installers" /></label><label>Request notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Access, timing, or vehicle details" /></label><p className="cart-total">Total <strong>{money(total)}</strong></p><Button disabled={checkingOut || !items.length} onClick={() => checkout()}>{checkingOut ? "Opening Stripe..." : guest ? "Sign in to check out" : "Continue to Stripe Checkout"}</Button></aside></section></main>;
}
