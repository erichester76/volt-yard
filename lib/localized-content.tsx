"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n";
import interfaceCopy from "@/lib/interface-copy.json";

type LocalizedContent = Record<string, string>;
const LocalizedContentContext = createContext<{ locale: Locale; content: LocalizedContent }>({ locale: "en", content: {} });

export function LocalizedContentProvider({ locale, content, children }: { locale: Locale; content: LocalizedContent; children: React.ReactNode }) {
  return <LocalizedContentContext.Provider value={{ locale, content }}>{children}</LocalizedContentContext.Provider>;
}

export function useLocale() {
  return useContext(LocalizedContentContext).locale;
}

export function useLocalizedContent(locale: Locale) {
  const { locale: resolvedLocale, content } = useContext(LocalizedContentContext);
  // The locale is supplied by the server route; retain this parameter for call-site clarity.
  const values = resolvedLocale === locale ? content : {};
  const builtIn = (interfaceCopy as Record<string, Record<string, string>>)[resolvedLocale] ?? {};
  return (key: string, fallback: string) => values[key] ?? builtIn[key] ?? fallback;
}

export function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}
