"use client";
import Link from "@/app/locale-link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
type Resource = { title: string; body: string; type: string; video_url: string | null; published_at: string | null };
export default function LibraryItem({ params }: { params: Promise<{ slug: string }> }) {
  const [item, setItem] = useState<Resource | null>(null); const [status, setStatus] = useState("Loading...");
  useEffect(() => { void params.then(({ slug }) => { if (!isSupabaseConfigured) return setStatus("Resources are not configured."); createBrowserSupabaseClient().from("resources").select("title,body,type,video_url,published_at").eq("slug", slug).eq("is_published", true).maybeSingle().then(({ data, error }) => { setItem(data as Resource | null); setStatus(error || !data ? "This resource is unavailable." : ""); }); }); }, [params]);
  if (!item) return <main className="content-page wrap"><p>{status}</p></main>;
  return <main className="content-page wrap"><article className="reading"><p className="eyebrow">{item.type.replace("_", " ")} · {item.published_at && new Date(item.published_at).toLocaleDateString()}</p><h1>{item.title}</h1><p>{item.body}</p>{item.video_url && <a className="inline-cta" href={item.video_url} target="_blank" rel="noopener noreferrer">Watch tutorial ↗</a>}<Link href="/tutorials">More practical learning →</Link></article></main>;
}
