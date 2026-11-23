import { localePathname } from "@/lib/i18n";

const gatedPrefixes = ["/admin", "/checkout", "/expert-work", "/installer", "/portal", "/profile"];

export function isGatedPath(path: string) {
  const pathname = new URL(path, "https://amped-up-network.local").pathname;
  const localPath = localePathname(pathname);
  return gatedPrefixes.some((prefix) => localPath === prefix || localPath.startsWith(`${prefix}/`)) || /^\/issues\/[^/]+/.test(localPath);
}

export function safeReturnTo(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  const url = new URL(path, "https://amped-up-network.local");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function requestAccount(mode: "sign-in" | "sign-up" = "sign-up", returnTo?: string) {
  if (typeof window === "undefined") return;
  const nextPath = returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.dispatchEvent(new CustomEvent("volt-yard-open-auth", { detail: { mode, returnTo: nextPath } }));
}
