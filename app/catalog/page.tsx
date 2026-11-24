"use client";

import Link from "@/app/locale-link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { requestAccount } from "@/lib/account-gate";
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

function compatibilityLabel(product: Product) {
  const compatibility = product.product_vehicle_compatibility.map((row) => row.vehicle && `${row.vehicle.model_year} ${row.vehicle.make} ${row.vehicle.model}`).filter(Boolean);
  return compatibility.length ? `Compatible: ${compatibility.join(", ")}` : "Compatible with eligible EVs";
}

export default function CatalogPage({ section = "all" }: { section?: CatalogSection }) {
  const copy = sectionCopy[section];
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    db.from("catalog_products").select("id,slug,name,description,long_description,price_cents,category:catalog_categories(name,slug),catalog_product_images(id,storage_path,alt_text,sort_order),product_vehicle_compatibility(vehicle:vehicle_catalog(make,model,model_year))").eq("active", true).order("name").limit(1000).then(async ({ data, error }) => {
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

  const closeProduct = useCallback(() => {
    setExpandedProductId(null);
    if (!searchParams.get("product")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("product");
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!expandedProductId) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeProduct();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeProduct, expandedProductId]);

  async function add(productId: string) {
    if (!isSupabaseConfigured) return setMessage("Services and upgrades require Supabase configuration.");
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) {
      requestAccount("sign-up");
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

  const sectionProducts = products.filter((product) => section === "all" || (section === "services" ? product.category?.slug === "services" : product.category?.slug !== "services"));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = sectionProducts.filter((product) => !normalizedQuery || `${product.name} ${product.description}`.toLowerCase().includes(normalizedQuery));
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const alternateSection = section === "services" ? { href: "/upgrades", label: "Browse upgrades" } : section === "upgrades" ? { href: "/services", label: "Browse services" } : null;
  const expandedProduct = sectionProducts.find((product) => product.id === expandedProductId) ?? null;
  const gallery = expandedProduct?.catalog_product_images.filter((image) => image.url) ?? [];
  const selectedImage = gallery.find((image) => image.id === selectedImageId) ?? gallery[0];

  function openProduct(product: Product) {
    setExpandedProductId(product.id);
    setSelectedImageId(product.catalog_product_images.find((image) => image.url)?.id ?? null);
  }

  useEffect(() => {
    const slug = searchParams.get("product");
    if (!slug) return;
    const match = sectionProducts.find((product) => product.slug === slug);
    if (match) setExpandedProductId(match.id);
  }, [searchParams, sectionProducts]);

  return <main className="commerce wrap">
    <PageHeader className="commerce-head" eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} actions={<><ActionLink variant="secondary" href="/pricing">Explore membership and pricing</ActionLink>{alternateSection && <ActionLink variant="secondary" href={alternateSection.href}>{alternateSection.label}</ActionLink>}</>} />
    {message && <p className="form-message">{message}</p>}
    <div className="catalog-tools">
      <label>Search<input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }} placeholder={section === "services" ? "Search services" : "Search upgrades"} /></label>
      <p>{filteredProducts.length} {section === "services" ? "services" : "upgrades"}</p>
    </div>
    <section className="catalog-grid">{visibleProducts.map((product) => {
      const categoryLabel = product.category?.slug === "services" ? "Services" : "Upgrades";
      const detailId = `catalog-product-${product.id}-details`;
      const preview = product.catalog_product_images.find((image) => image.url);
      return <article className="catalog-card" key={product.id}>
        <button className="catalog-card-open" type="button" aria-haspopup="dialog" aria-controls={detailId} onClick={() => openProduct(product)}>
          {preview && <Image src={preview.url!} alt="" width={640} height={360} unoptimized />}
          <p className="eyebrow">{categoryLabel}</p>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <span>View details</span>
        </button>
        <footer><strong>{money(product.price_cents)}</strong><Button onClick={() => add(product.id)}>Add to cart</Button></footer>
      </article>;
    })}{!filteredProducts.length && !message && <p className="empty-copy">{normalizedQuery ? "Nothing matches that search." : copy.empty}</p>}</section>
    {visibleProducts.length < filteredProducts.length && <p className="catalog-more"><button type="button" onClick={() => setVisibleCount((count) => count + 24)}>Show more</button></p>}
    {alternateSection && <p className="catalog-section-link">Looking for something else? <Link href={alternateSection.href}>{alternateSection.label}</Link>.</p>}
    {expandedProduct && <div className="modal-backdrop" role="presentation" onClick={closeProduct}>
      <section className="catalog-detail-dialog" id={`catalog-product-${expandedProduct.id}-details`} role="dialog" aria-modal="true" aria-labelledby={`catalog-product-${expandedProduct.id}-title`} onClick={(event) => event.stopPropagation()}>
        <button className="close" type="button" aria-label="Close product details" onClick={closeProduct}>×</button>
        <div className="catalog-detail-layout">
          <div className="catalog-gallery" aria-label={`${expandedProduct.name} images`}>
            {selectedImage && <Image src={selectedImage.url!} alt={selectedImage.alt_text} width={1200} height={900} unoptimized />}
            {gallery.length > 1 && <div className="catalog-gallery-thumbs">{gallery.map((image) => <button className={image.id === selectedImage?.id ? "is-selected" : undefined} type="button" key={image.id} aria-label={image.alt_text} aria-pressed={image.id === selectedImage?.id} onClick={() => setSelectedImageId(image.id)}><Image src={image.url!} alt="" width={160} height={120} unoptimized /></button>)}</div>}
          </div>
          <div className="catalog-detail-copy">
            <p className="eyebrow">{expandedProduct.category?.slug === "services" ? "Services" : "Upgrades"}</p>
            <h2 id={`catalog-product-${expandedProduct.id}-title`}>{expandedProduct.name}</h2>
            <p>{expandedProduct.description}</p>
            {expandedProduct.long_description && <DetailCopy value={expandedProduct.long_description} />}
            <small>{compatibilityLabel(expandedProduct)}</small>
            <footer><strong>{money(expandedProduct.price_cents)}</strong><Button onClick={() => add(expandedProduct.id)}>Add to cart</Button></footer>
          </div>
        </div>
      </section>
    </div>}
  </main>;
}
