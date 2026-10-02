import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "./site-chrome";

export const metadata: Metadata = {
  title: "Volt Yard | Independent EV service",
  description: "Find an independent EV mechanic near you."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><SiteChrome>{children}</SiteChrome></body></html>;
}
