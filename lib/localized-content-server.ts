import { createClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n";

export function publishedLocalizedContent(rows: { content_key: string; value: string }[] | null): Record<string, string> {
  return Object.fromEntries((rows ?? []).map((item) => [item.content_key, item.value]));
}

export async function getPublishedLocalizedContent(locale: Locale): Promise<Record<string, string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return {};

  const db = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data } = await db.from("localized_content").select("content_key,value").eq("locale", locale).eq("is_published", true);
  return publishedLocalizedContent(data);
}
