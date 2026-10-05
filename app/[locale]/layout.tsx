import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SiteChrome from "@/app/site-chrome";
import { LocalizedContentProvider } from "@/lib/localized-content";
import { getPublishedLocalizedContent } from "@/lib/localized-content-server";
import { localeMetadata } from "@/lib/locale-metadata";
import { isLocale, localePathname, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pathname = localePathname((await headers()).get("x-volt-yard-pathname") ?? `/${locale}`);
  return localeMetadata(locale, pathname);
}

export default function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  return <LocaleBoundary params={params}>{children}</LocaleBoundary>;
}

async function LocaleBoundary({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = await getPublishedLocalizedContent(locale);
  return <LocalizedContentProvider locale={locale as Locale} content={content}><SiteChrome>{children}</SiteChrome></LocalizedContentProvider>;
}
