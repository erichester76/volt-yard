"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

export default function LocaleLanguage({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <>{children}</>;
}
