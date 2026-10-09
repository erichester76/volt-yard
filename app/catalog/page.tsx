"use client";

import Link from "@/app/locale-link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { ActionLink, Button, PageHeader } from "@/app/page-primitives";

type CatalogSection = "all" | "services" | "upgrades";
type ProductImage = { id: string; storage_path: string; alt_text: string; sort_order: number; url?: string };
type Product = { id: string; slug: string; name: string; description: string; long_description: string; price_cents: number; category: { name: string; slug: string } | null; catalog_product_images: ProductImage[]; product_vehicle_compatibility: { vehicle: { make: string; model: string; model_year: number } | null }[] };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const sectionCopy = {
  all: { eyebrow: "Store", title: "Care, lined up.", intro: "Start with an account so your vehicle and purchase history stay together, then explore services and upgrades. After payment, compatible independent installers can claim the request.", empty: "Services and upgrades are coming soon. Check back shortly." },
  services: { eyebrow: "Services", title: "Service, lined up.", intro: "Start with an account so your vehicle and purchase history stay together, then explore hands-on EV service. After payment, compatible independent installers can claim the request.", empty: "Services are coming soon. Check back shortly." },
  upgrades: { eyebrow: "Upgrades", title: "Upgrade with confidence.", intro: "Start with an account so your vehicle and purchase history stay together, then explore compatible EV packages and upgrades. After payment, compatible independent installers can claim the request.", empty: "Upgrades are coming soon. Check back shortly." },
} as const;

function DetailCopy({ value }: { value: string }) {
  return <>{value.trim().split(/\n\s*\n/).filter(Boolean).map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const bullets = lines.length > 0 && lines.every((line) => /^[*-]\s+/.test(line));
    return bullets ? <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^[*-]\s+/, "")}</li>)}</ul> : <p key={index}>{lines.join(" ")}</p>;
  })}</>;
}

export default function CatalogPage({ section = "all" }: { section?: CatalogSection }) {
  const copy = sectionCopy[section];
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    db.from("catalog_products").select("id,slug,name,description,long_description,price_cents,category:catalog_categories(name,slug),catalog_product_images(id,storage_path,alt_text,sort_order),product_vehicle_compatibility(vehicle:vehicle_catalog(make,model,model_year))").eq("active", true).order("price_cents").then(async ({ data, error }) => {
      if (error) return setMessage("Services and upgrades are temporarily unavailable.");
      const signedProducts = await Promise.all((data ?? []).map(async (product) => ({
        ...product,
        catalog_product_images: await Promise.all([...(product.catalog_product_images ?? [])].sort((left, right) => left.sort_order - right.sort_order).map(async (image) => ({
          ...image,
          url: (await db.storage.from("catalog-product-images").createSignedUrl(image.storage_path, 3600)).data?.signedUrl,
        }))),
        product_vehicle_compatibility: (product.product_vehicle_compatibility ?? []).map((compatibility) => ({
          ...compatibility,
          vehicle: Array.isArray(compatibility.vehicle) ? compatibility.vehicle[0] ?? null : compatibility.vehicle,
        })),
      })));
      setProducts(signedProducts as unknown as Product[]);
    });
  }, []);

  async function add(productId: string) {
    if (!isSupabaseConfigured) return setMessage("Services and upgrades require Supabase configuration.");
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) {
      window.dispatchEvent(new CustomEvent("volt-yard-open-auth", { detail: { mode: "sign-up", returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}` } }));
      return;
    }
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

  const visibleProducts = products.filter((product) => section === "all" || (section === "services" ? product.category?.slug === "services" : product.category?.slug !== "services"));
  const alternateSection = section === "services" ? { href: "/upgrades", label: "Browse upgrades" } : section === "upgrades" ? { href: "/services", label: "Browse services" } : null;

  return <main className="commerce wrap"><PageHeader className="commerce-head" eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} actions={<><ActionLink variant="secondary" href="/pricing">Explore membership and pricing</ActionLink>{alternateSection && <ActionLink variant="secondary" href={alternateSection.href}>{alternateSection.label}</ActionLink>}</>} />{message && <p className="form-message">{message}</p>}<section className="catalog-grid">{visibleProducts.map((product) => {
    const compatibility = product.product_vehicle_compatibility.map((row) => row.vehicle && `${row.vehicle.model_year} ${row.vehicle.make} ${row.vehicle.model}`).filter(Boolean);
    const categoryLabel = product.category?.slug === "services" ? "Services" : "Upgrades";
    const expanded = expandedProductId === product.id;
    const detailId = `catalog-product-${product.id}-details`;
    return <article className="catalog-card" key={product.id}><p className="eyebrow">{categoryLabel}</p><h2>{product.name}</h2><p>{product.description}</p><button className="catalog-details-toggle" type="button" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpandedProductId(expanded ? null : product.id)}>{expanded ? "Hide details" : "View details"}</button>{expanded && <div className="catalog-details" id={detailId}>{product.long_description && <div className="catalog-detail-copy"><DetailCopy value={product.long_description} /></div>}{product.catalog_product_images.filter((image) => image.url).length > 0 && <div className="catalog-gallery" aria-label={`${product.name} images`}>{product.catalog_product_images.filter((image) => image.url).map((image) => <span className="catalog-gallery-image" key={image.id}><Image src={image.url!} alt={image.alt_text} width={1200} height={900} unoptimized /></span>)}</div>}<small>{compatibility.length ? `Compatible: ${compatibility.join(", ")}` : "Compatible with eligible EVs"}</small><footer><strong>{money(product.price_cents)}</strong><Button onClick={() => add(product.id)}>Add to cart</Button></footer></div>}</article>;
  })}{!visibleProducts.length && !message && <p className="empty-copy">{copy.empty}</p>}</section>{alternateSection && <p className="catalog-section-link">Looking for something else? <Link href={alternateSection.href}>{alternateSection.label}</Link>.</p>}</main>;
}
