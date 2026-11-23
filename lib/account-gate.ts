import { localePathname } from "@/lib/i18n";

const publicPaths = new Set(["/", "/catalog", "/community", "/ev-purchase-research", "/partnership", "/pricing", "/release-notes", "/journal", "/services", "/upgrades"]);

export function isGatedPath(path: string) {
  const pathname = new URL(path, "https://amped-up-network.local").pathname;
  const localPath = localePathname(pathname);
  return !publicPaths.has(localPath) && !localPath.startsWith("/community/") && !localPath.startsWith("/library/");
}

export function safeReturnTo(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  const url = new URL(path, "https://amped-up-network.local");
  return `${url.pathname}${url.search}${url.hash}`;
}
