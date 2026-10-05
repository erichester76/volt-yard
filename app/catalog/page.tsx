"use client";

import Link from "@/app/locale-link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { authRedirectUrl } from "@/lib/auth-redirect";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";
import { Button, PageHeader } from "@/app/page-primitives";

type Product = { id: string; slug: string; name: string; description: string; price_cents: number; category: { name: string } | null; product_vehicle_compatibility: { vehicle: { make: string; model: string; model_year: number } | null }[] };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function CatalogPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    db.from("catalog_products").select("id,slug,name,description,price_cents,category:catalog_categories(name),product_vehicle_compatibility(vehicle:vehicle_catalog(make,model,model_year))").eq("active", true).order("price_cents").then(({ data, error }) => {
      if (error) setMessage("Services & upgrades are temporarily unavailable.");
      else setProducts((data ?? []).map((product) => ({
        ...product,
        product_vehicle_compatibility: product.product_vehicle_compatibility.map((compatibility) => ({
          ...compatibility,
          vehicle: Array.isArray(compatibility.vehicle) ? compatibility.vehicle[0] ?? null : compatibility.vehicle,
        })),
      })) as unknown as Product[]);
    });
  }, []);
  async function add(productId: string) {
    if (!isSupabaseConfigured) return setMessage("Services & upgrades require Supabase configuration.");
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return setNeedsLogin(true);
    let { data: cart } = await db.from("carts").select("id").eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
    if (!cart) {
      const created = await db.from("carts").insert({ user_id: auth.user.id }).select("id").single();
      if (created.error || !created.data) return setMessage("Could not create your cart.");
      cart = created.data;
    }
    const { error } = await db.from("cart_items").upsert({ cart_id: cart.id, product_id: productId, quantity: 1 }, { onConflict: "cart_id,product_id" });
    setMessage(error ? error.message : "Added to your cart.");
    if (!error) window.dispatchEvent(new Event("volt-yard-cart-updated"));
  }
  async function sendLogin(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await createBrowserSupabaseClient().auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirectUrl(window.location.origin, "/catalog") } });
    setMessage(error ? error.message : "Check your email for a secure sign-in link, then add your package.");
  }
  return <main className="commerce wrap"><PageHeader className="commerce-head" eyebrow={t("catalog.eyebrow", "Services & upgrades")} title={t("catalog.title", "Care, lined up.")} intro="Choose a service or upgrade from Volt Yard. After payment, compatible independent installers can claim the request." />{message && <p className="form-message">{message}</p>}{needsLogin && <form className="login-prompt" onSubmit={sendLogin}><strong>Sign in to save a cart</strong><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><Button>Send sign-in link</Button></form>}<section className="catalog-grid">{products.map((product) => { const compatibility = product.product_vehicle_compatibility.map((row) => row.vehicle && `${row.vehicle.model_year} ${row.vehicle.make} ${row.vehicle.model}`).filter(Boolean); return <article className="catalog-card" key={product.id}><p className="eyebrow">{product.category?.name ?? "Services & upgrades"}</p><h2>{product.name}</h2><p>{product.description}</p><small>{compatibility.length ? `Compatible: ${compatibility.join(", ")}` : "Compatible with eligible EVs"}</small><footer><strong>{money(product.price_cents)}</strong><Button onClick={() => add(product.id)}>Add to cart</Button></footer></article>; })}{!products.length && !message && <p className="empty-copy">Services and upgrades are coming soon. Check back shortly.</p>}</section></main>;
}
