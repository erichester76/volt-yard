"use client";

import Link from "@/app/locale-link";
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type Teaser = { id: string; slug: string; name: string; description: string; price_cents: number; section: "services" | "upgrades" };

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function CatalogTeaser({ title, intro, compact = false }: { title: string; intro?: string; compact?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Teaser[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    createBrowserSupabaseClient().from("catalog_products").select("id,slug,name,description,price_cents,category:catalog_categories(slug)").eq("active", true).order("name").limit(40).then(({ data }) => {
      const products = (data ?? []) as { id: string; slug: string; name: string; description: string; price_cents: number; category: { slug: string } | { slug: string }[] | null }[];
      const section = (product: (typeof products)[number]) => {
        const category = Array.isArray(product.category) ? product.category[0] : product.category;
        return category?.slug === "services" ? "services" : "upgrades";
      };
      const teasers = products.map((product) => ({ id: product.id, slug: product.slug, name: product.name, description: product.description, price_cents: product.price_cents, section: section(product) as Teaser["section"] }));
      const upgrades = teasers.filter((item) => item.section === "upgrades");
      setItems((upgrades.length ? upgrades : teasers).slice(0, 16));
    });
  }, []);

  if (!items.length) return null;
  return <section className={compact ? "catalog-teaser is-compact" : "catalog-teaser"} aria-label={title}>
    <div className="catalog-teaser-head">
      <div><h2>{title}</h2>{intro && <p>{intro}</p>}</div>
      <div className="catalog-teaser-controls">
        <button type="button" aria-label="Show previous items" onClick={() => scroller.current?.scrollBy({ left: compact ? -180 : -280, behavior: "smooth" })}>←</button>
        <button type="button" aria-label="Show next items" onClick={() => scroller.current?.scrollBy({ left: compact ? 180 : 280, behavior: "smooth" })}>→</button>
      </div>
    </div>
    <div className="catalog-teaser-track" ref={scroller}>
      {items.map((item) => <Link className="catalog-teaser-card" key={item.id} href={`/${item.section}?product=${encodeURIComponent(item.slug)}`}>
        {!compact && <p className="eyebrow">{item.section === "services" ? "Service" : "Upgrade"}</p>}
        <h3>{item.name}</h3>
        {!compact && <p>{item.description}</p>}
        <strong>{money(item.price_cents)}</strong>
      </Link>)}
    </div>
  </section>;
}
