"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type Resource = { id: string; slug: string; title: string; summary: string; published_at: string | null; type: string };
const labels: Record<string, string> = { article: "Journal", video: "Video tutorial", release_note: "Release note" };

export default function ResourceIndex({ type, eyebrow, title, intro }: { type: "article" | "video" | "release_note"; eyebrow: string; title: string; intro: string }) {
  const [items, setItems] = useState<Resource[]>([]);
  const [status, setStatus] = useState("Loading published resources...");
  useEffect(() => {
    if (!isSupabaseConfigured) return setStatus("Resources are not configured.");
    createBrowserSupabaseClient().from("resources").select("id,slug,title,summary,published_at,type").eq("type", type).eq("is_published", true).order("published_at", { ascending: false }).then(({ data, error }) => {
      if (error) return setStatus("Resources could not be loaded.");
      setItems((data ?? []) as Resource[]); setStatus("");
    });
  }, [type]);
  return <main className="content-page wrap"><header className="content-head"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></header><p className="directory-status">{status}</p><section className="resource-grid">{items.map((item) => <article className="resource-card" key={item.id}><p className="eyebrow">{labels[item.type]} · {item.published_at ? new Date(item.published_at).toLocaleDateString() : "New"}</p><h2>{item.title}</h2><p>{item.summary}</p><Link href={`/library/${item.slug}`}>Read more <span>→</span></Link></article>)}</section>{!status && !items.length && <p className="empty-copy">Nothing published here yet.</p>}</main>;
}
