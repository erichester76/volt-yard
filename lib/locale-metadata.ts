import type { Metadata } from "next";
import { localePath, locales, type Locale } from "@/lib/i18n";

const metadataByLocale: Record<Locale, { title: string; description: string }> = {
  en: { title: "Volt Yard | Independent EV service", description: "Find an independent EV mechanic near you." },
  de: { title: "Volt Yard | Unabhangiger EV-Service", description: "Finden Sie eine unabhangige EV-Werkstatt in Ihrer Nahe." },
  fr: { title: "Volt Yard | Service VE independant", description: "Trouvez un mecanicien VE independant pres de chez vous." },
  es: { title: "Volt Yard | Servicio independiente de VE", description: "Encuentra un mecanico independiente de VE cerca de ti." },
};

export function localeMetadata(locale: Locale, pathname: string): Metadata {
  return {
    ...metadataByLocale[locale],
    alternates: {
      canonical: localePath(locale, pathname),
      languages: Object.fromEntries(locales.map((item) => [item, localePath(item, pathname)])),
    },
  };
}
