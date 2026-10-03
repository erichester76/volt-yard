"use client";

import { useEffect, useState } from "react";
import { AdminNavigation } from "@/app/portal-navigation";
import { locales, type Locale } from "@/lib/i18n";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type Translation = { content_key: string; locale: Locale; value: string; is_published: boolean };

export default function TranslationAdminPage() {
  const [rows, setRows] = useState<Translation[]>([]);
  const [locale, setLocale] = useState<Locale>("en");
  const [message, setMessage] = useState("Checking administrator access...");

  async function load() {
    if (!isSupabaseConfigured) return setMessage("Supabase is not configured.");
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return setMessage("Sign in as an administrator to edit translations.");
    const { data: profile } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle();
    if (!profile?.is_admin) return setMessage("Administrator access is required.");
    const { data, error } = await db.from("localized_content").select("content_key,locale,value,is_published").order("content_key").order("locale");
    if (error) return setMessage(error.message);
    setRows((data ?? []) as Translation[]);
    setMessage("");
  }

  useEffect(() => { void load(); }, []);

  async function save(row: Translation, form: FormData) {
    const value = String(form.get("value") ?? "").trim();
    if (!value) return setMessage("Translation text cannot be empty.");
    const { error } = await createBrowserSupabaseClient().from("localized_content").upsert({
      content_key: row.content_key, locale: row.locale, value, is_published: form.get("is_published") === "on",
    }, { onConflict: "content_key,locale" });
    if (error) return setMessage(error.message);
    setMessage(`Saved ${row.content_key} (${row.locale}).`);
    await load();
  }

  const visible = rows.filter((row) => row.locale === locale);
  return <main className="portal content-page wrap"><section className="portal-head"><p className="eyebrow">Content administration</p><h1>Translations.</h1><p>Edit shared, authored interface copy. Changes are live only when published.</p></section><AdminNavigation /><label>Locale<select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>{locales.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label>{message && <p className="form-message" role="status">{message}</p>}<section className="admin-list">{visible.map((row) => <form className="admin-shop" key={`${row.content_key}-${row.locale}`} action={(form) => void save(row, form)}><strong>{row.content_key}</strong><label>Text<textarea name="value" required maxLength={10000} defaultValue={row.value} /></label><label><input name="is_published" type="checkbox" defaultChecked={row.is_published} /> Published</label><button type="submit">Save translation</button></form>)}</section></main>;
}
