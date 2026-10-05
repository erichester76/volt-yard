"use client";

import Link, { type LinkProps } from "next/link";
import { localePath } from "@/lib/i18n";
import { useLocale } from "@/lib/localized-content";

type LocaleLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & { href: LinkProps["href"] };

export default function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();
  const localizedHref = typeof href === "string" && href.startsWith("/") ? localePath(locale, href) : href;
  return <Link href={localizedHref} {...props} />;
}
