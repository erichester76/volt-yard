"use client";

import Link from "@/app/locale-link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { PageHeader } from "@/app/page-primitives";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

type Resource = { id: string; slug: string; title: string; summary: string; published_at: string | null; type: string };
export default function ResourceIndex({ type, eyebrow, title, intro }: { type: "article" | "video" | "release_note"; eyebrow: string; title: string; intro: string }) {
  const locale = useLocale();
  const t = useLocalizedContent(locale);
  const heading = {
    article: [t("journal.eyebrow", eyebrow), t("journal.title", title), t("journal.intro", intro)],
    video: [t("tutorials.eyebrow", eyebrow), t("tutorials.title", title), t("tutorials.intro", intro)],
    release_note: [t("release.eyebrow", eyebrow), t("release.title", title), t("release.intro", intro)],
  }[type];
  const typeLabel = {
    article: t("resources.article", "Journal"),
    video: t("resources.video", "Video tutorial"),
    release_note: t("resources.release", "Release note"),
  }[type];
  const [items, setItems] = useState<Resource[]>([]);
  const [status, setStatus] = useState(t("resources.loading", "Loading published resources..."));
  useEffect(() => {
    if (!isSupabaseConfigured) return setStatus(t("resources.not_configured", "Resources are not configured."));
    createBrowserSupabaseClient().from("resources").select("id,slug,title,summary,published_at,type").eq("type", type).eq("is_published", true).order("published_at", { ascending: false }).then(({ data, error }) => {
      if (error) return setStatus(t("resources.failed", "Resources could not be loaded."));
      setItems((data ?? []) as Resource[]); setStatus("");
    });
  }, [t, type]);
  return <main className="content-page wrap"><PageHeader className="content-head" eyebrow={heading[0]} title={heading[1]} intro={heading[2]} /><p className="directory-status">{status}</p><section className="resource-grid">{items.map((item) => <article className="resource-card" key={item.id}><p className="eyebrow">{typeLabel} · {item.published_at ? new Date(item.published_at).toLocaleDateString(locale) : t("resources.new", "New")}</p><h2>{item.title}</h2><p>{item.summary}</p><Link href={`/library/${item.slug}`}>{t("resources.read", "Read more")} <span>→</span></Link></article>)}</section>{!status && !items.length && <p className="empty-copy">{t("resources.empty", "Nothing published here yet.")}</p>}</main>;
}
