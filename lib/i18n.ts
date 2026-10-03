export const locales = ["en", "de", "fr", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && locales.includes(value as Locale);
}

export function negotiateLocale(acceptLanguage: string | null, saved?: string): Locale {
  if (isLocale(saved)) return saved;
  for (const entry of acceptLanguage?.split(",") ?? []) {
    const language = entry.trim().split(";")[0]?.toLowerCase().split("-")[0];
    if (isLocale(language)) return language;
  }
  return defaultLocale;
}

export function localePath(locale: Locale, path = "/"): string {
  return `/${locale}${path === "/" ? "" : path.startsWith("/") ? path : `/${path}`}`;
}

export function localeFromPath(pathname: string): Locale {
  const locale = pathname.split("/")[1];
  return isLocale(locale) ? locale : defaultLocale;
}
