import type { Metadata } from "next";
import { localePath, locales, type Locale } from "@/lib/i18n";

const metadataByLocale: Record<Locale, { title: string; description: string }> = {
  en: { title: "Amped Up Network | Independent EV ownership", description: "Find trusted independent EV help, community, and service partners." },
  de: { title: "Amped Up Network | Unabhangige EV-Unterstutzung", description: "Finden Sie unabhangige Hilfe, Community und Servicepartner fur Ihr EV." },
  fr: { title: "Amped Up Network | Accompagnement VE independant", description: "Trouvez de l'aide, une communaute et des partenaires VE independants." },
  es: { title: "Amped Up Network | Apoyo independiente para VE", description: "Encuentra ayuda, comunidad y socios de servicio independientes para VE." },
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
