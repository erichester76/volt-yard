"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { addGuestItem } from "@/lib/guest-cart";
import { fill, useLocale, useLocalizedContent } from "@/lib/localized-content";
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

function compatibilityLabel(product: Product, t: (key: string, fallback: string) => string) {
  const compatibility = product.product_vehicle_compatibility.map((row) => row.vehicle && `${row.vehicle.model_year} ${row.vehicle.make} ${row.vehicle.model}`).filter(Boolean);
  return compatibility.length ? fill(t("catalog.compatible", "Compatible: {vehicles}"), { vehicles: compatibility.join(", ") }) : t("catalog.compatible_generic", "Compatible with eligible EVs");
}

export default function CatalogPage({ section = "all" }: { section?: CatalogSection }) {
  const locale = useLocale();
  const t = useLocalizedContent(locale);
  const copy = {
    all: { eyebrow: t("catalog.eyebrow", "Store"), title: t("catalog.title", "Care, lined up."), intro: t("catalog.intro", sectionCopy.all.intro), empty: t("catalog.empty", sectionCopy.all.empty) },
    services: { eyebrow: t("catalog.services.eyebrow", "Services"), title: t("catalog.services.title", "Service, lined up."), intro: t("catalog.services.intro", sectionCopy.services.intro), empty: t("catalog.services.empty", sectionCopy.services.empty) },
    upgrades: { eyebrow: t("catalog.upgrades.eyebrow", "Upgrades"), title: t("catalog.upgrades.title", "Upgrade with confidence."), intro: t("catalog.upgrades.intro", sectionCopy.upgrades.intro), empty: t("catalog.upgrades.empty", sectionCopy.upgrades.empty) },
  }[section];
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    db.from("catalog_products").select("id,slug,name,description,long_description,price_cents,category:catalog_categories(name,slug),catalog_product_images(id,storage_path,alt_text,sort_order),product_vehicle_compatibility(vehicle:vehicle_catalog(make,model,model_year))").eq("active", true).order("price_cents").then(async ({ data, error }) => {
      if (error) return setMessage(t("catalog.unavailable", "Services and upgrades are temporarily unavailable."));
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
  }, [t]);

  useEffect(() => {
    if (!expandedProductId) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpandedProductId(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [expandedProductId]);

  async function add(productId: string) {
    if (!isSupabaseConfigured) return setMessage(t("catalog.needs_config", "Services and upgrades require Supabase configuration."));
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) {
      const product = products.find((entry) => entry.id === productId);
      addGuestItem({ productId, name: product?.name ?? "Service", priceCents: product?.price_cents ?? 0 });
      setMessage(t("catalog.added", "Added to your cart."));
      return;
    }
    let { data: cart } = await db.from("carts").select("id").eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
    if (!cart) {
      const created = await db.from("carts").insert({ user_id: auth.user.id }).select("id").single();
      if (created.error || !created.data) return setMessage(t("catalog.cart_failed", "Could not create your cart."));
      cart = created.data;
    }
    const { error } = await db.from("cart_items").upsert({ cart_id: cart.id, product_id: productId, quantity: 1 }, { onConflict: "cart_id,product_id" });
    setMessage(error ? error.message : t("catalog.added", "Added to your cart."));
    if (!error) window.dispatchEvent(new Event("volt-yard-cart-updated"));
  }

  const visibleProducts = products.filter((product) => section === "all" || (section === "services" ? product.category?.slug === "services" : product.category?.slug !== "services"));
  const alternateSection = section === "services" ? { href: "/upgrades", label: t("catalog.action.browse_upgrades", "Browse upgrades") } : section === "upgrades" ? { href: "/services", label: t("catalog.action.browse_services", "Browse services") } : null;
  const expandedProduct = visibleProducts.find((product) => product.id === expandedProductId) ?? null;
  const gallery = expandedProduct?.catalog_product_images.filter((image) => image.url) ?? [];
  const selectedImage = gallery.find((image) => image.id === selectedImageId) ?? gallery[0];

  function openProduct(product: Product) {
    setExpandedProductId(product.id);
    setSelectedImageId(product.catalog_product_images.find((image) => image.url)?.id ?? null);
  }

  return <main className="commerce wrap">
    <PageHeader className="commerce-head" eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} actions={<><ActionLink variant="secondary" href="/pricing">{t("catalog.action.membership", "Explore membership and pricing")}</ActionLink>{alternateSection && <ActionLink variant="secondary" href={alternateSection.href}>{alternateSection.label}</ActionLink>}</>} />
    {message && <p className="form-message">{message}</p>}
    <section className="catalog-grid">{visibleProducts.map((product) => {
      const categoryLabel = product.category?.slug === "services" ? t("catalog.label.services", "Services") : t("catalog.label.upgrades", "Upgrades");
      const detailId = `catalog-product-${product.id}-details`;
      const preview = product.catalog_product_images.find((image) => image.url);
      return <article className="catalog-card" key={product.id}>
        <button className="catalog-card-open" type="button" aria-haspopup="dialog" aria-controls={detailId} onClick={() => openProduct(product)}>
          {preview && <Image src={preview.url!} alt="" width={640} height={360} unoptimized />}
          <p className="eyebrow">{categoryLabel}</p>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
        </button>
        <footer><strong>{money(product.price_cents)}</strong><div className="catalog-card-actions"><Button variant="secondary" onClick={() => openProduct(product)}>{t("catalog.action.details", "View details")}</Button><Button onClick={() => add(product.id)}>{t("catalog.action.cart", "Add to cart")}</Button></div></footer>
      </article>;
    })}{!visibleProducts.length && !message && <p className="empty-copy">{copy.empty}</p>}</section>
    {expandedProduct && <div className="modal-backdrop" role="presentation" onClick={() => setExpandedProductId(null)}>
      <section className="catalog-detail-dialog" id={`catalog-product-${expandedProduct.id}-details`} role="dialog" aria-modal="true" aria-labelledby={`catalog-product-${expandedProduct.id}-title`} onClick={(event) => event.stopPropagation()}>
        <button className="close" type="button" aria-label={t("catalog.action.close", "Close product details")} onClick={() => setExpandedProductId(null)}>×</button>
        <div className="catalog-detail-layout">
          <div className="catalog-gallery" aria-label={`${expandedProduct.name} images`}>
            {selectedImage && <Image src={selectedImage.url!} alt={selectedImage.alt_text} width={1200} height={900} unoptimized />}
            {gallery.length > 1 && <div className="catalog-gallery-thumbs">{gallery.map((image) => <button className={image.id === selectedImage?.id ? "is-selected" : undefined} type="button" key={image.id} aria-label={image.alt_text} aria-pressed={image.id === selectedImage?.id} onClick={() => setSelectedImageId(image.id)}><Image src={image.url!} alt="" width={160} height={120} unoptimized /></button>)}</div>}
          </div>
          <div className="catalog-detail-copy">
            <p className="eyebrow">{expandedProduct.category?.slug === "services" ? t("catalog.label.services", "Services") : t("catalog.label.upgrades", "Upgrades")}</p>
            <h2 id={`catalog-product-${expandedProduct.id}-title`}>{expandedProduct.name}</h2>
            <p>{expandedProduct.description}</p>
            {expandedProduct.long_description && <DetailCopy value={expandedProduct.long_description} />}
            <small>{compatibilityLabel(expandedProduct, t)}</small>
            <footer><strong>{money(expandedProduct.price_cents)}</strong><Button onClick={() => add(expandedProduct.id)}>{t("catalog.action.cart", "Add to cart")}</Button></footer>
          </div>
        </div>
      </section>
    </div>}
  </main>;
}
