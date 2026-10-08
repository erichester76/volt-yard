import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const themeScript = `
  var storedTheme;
  try {
    storedTheme = window.localStorage.getItem("volt-yard-theme");
  } catch (_) {}
  var theme = storedTheme === "dark" || storedTheme === "light"
    ? storedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
`;

export const metadata: Metadata = {
  title: "Amped Up Network | Independent EV ownership",
  description: "Find trusted independent EV help, community, and service partners."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-volt-yard-locale") ?? "en";
  return <html lang={locale} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>;
}
