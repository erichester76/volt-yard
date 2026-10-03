"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Locale } from "@/lib/i18n";

export function useLocalizedContent(locale: Locale) {
  const [content, setContent] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    createBrowserSupabaseClient().from("localized_content").select("content_key,value").eq("locale", locale).eq("is_published", true)
      .then(({ data }) => { if (active) setContent(Object.fromEntries((data ?? []).map((item) => [item.content_key, item.value]))); });
    return () => { active = false; };
  }, [locale]);
  return (key: string, fallback: string) => content[key] ?? fallback;
}
