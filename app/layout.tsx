import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "./site-chrome";

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
  title: "Volt Yard | Independent EV service",
  description: "Find an independent EV mechanic near you."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><SiteChrome>{children}</SiteChrome></body></html>;
}
