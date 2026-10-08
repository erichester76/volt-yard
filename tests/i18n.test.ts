import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { config, proxy } from "../proxy";
import { localeFromPath, localePath, localePathname, negotiateLocale } from "../lib/i18n";
import { localeMetadata } from "../lib/locale-metadata";
import { publishedLocalizedContent } from "../lib/localized-content-server";

test("negotiates a supported browser language and falls back to English", () => {
  assert.equal(negotiateLocale("de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(negotiateLocale("it-IT,it;q=0.9"), "en");
  assert.equal(negotiateLocale("fr", "es"), "es");
});

test("builds locale-prefixed paths without duplicate slashes", () => {
  assert.equal(localePath("fr"), "/fr");
  assert.equal(localePath("es", "/community"), "/es/community");
  assert.equal(localePath("de", "/issues?source_topic=abc#reply"), "/de/issues?source_topic=abc#reply");
  assert.equal(localePathname("/fr/community/topic"), "/community/topic");
});

test("redirects bare paths using the saved locale before browser negotiation", () => {
  const cookieRequest = new NextRequest("https://voltyard.test/issues", { headers: { cookie: "volt-yard-locale=es", "accept-language": "de-DE,de;q=0.9" } });
  assert.equal(proxy(cookieRequest).headers.get("location"), "https://voltyard.test/es/issues");

  const browserRequest = new NextRequest("https://voltyard.test/catalog", { headers: { "accept-language": "fr-CA,fr;q=0.9" } });
  assert.equal(proxy(browserRequest).headers.get("location"), "https://voltyard.test/fr/catalog");
});

test("passes locale context through prefixed navigation requests", () => {
  const response = proxy(new NextRequest("https://voltyard.test/de/issues"));
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
});

test("excludes static images from locale routing", () => {
  assert.match(config.matcher[0], /images/);
});

test("preserves route navigation details while adding or reading locales", () => {
  assert.equal(localePath("de", "catalog?sort=price#details"), "/de/catalog?sort=price#details");
  assert.equal(localeFromPath("/fr/community/topic"), "fr");
  assert.equal(localeFromPath("/unknown/community"), "en");
  const response = proxy(new NextRequest("https://voltyard.test/cart?cancelled=1", { headers: { "accept-language": "es" } }));
  assert.equal(response.headers.get("location"), "https://voltyard.test/es/cart?cancelled=1");
});

test("builds locale-specific canonical and hreflang metadata", () => {
  const metadata = localeMetadata("fr", "/issues");
  assert.equal(metadata.title, "Amped Up Network | Accompagnement VE independant");
  assert.deepEqual(metadata.alternates, {
    canonical: "/fr/issues",
    languages: { en: "/en/issues", de: "/de/issues", fr: "/fr/issues", es: "/es/issues" },
  });
});

test("maps only server-fetched published content into authored copy", () => {
  assert.deepEqual(publishedLocalizedContent([{ content_key: "chrome.nav.diagnose", value: "Diagnostic" }]), { "chrome.nav.diagnose": "Diagnostic" });
  assert.deepEqual(publishedLocalizedContent(null), {});
});
