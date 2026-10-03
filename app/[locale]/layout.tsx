import { notFound } from "next/navigation";
import LocaleLanguage from "@/app/locale-language";
import { isLocale, type Locale } from "@/lib/i18n";

export default function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  return <LocaleBoundary params={params}>{children}</LocaleBoundary>;
}

async function LocaleBoundary({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocaleLanguage locale={locale as Locale}>{children}</LocaleLanguage>;
}
