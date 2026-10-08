import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("pricing and store sections have localized route wrappers", () => {
  for (const path of ["app/pricing/page.tsx", "app/[locale]/pricing/page.tsx", "app/services/page.tsx", "app/[locale]/services/page.tsx", "app/upgrades/page.tsx", "app/[locale]/upgrades/page.tsx"]) {
    assert.equal(existsSync(new URL(path, root)), true, `${path} is present`);
  }
  assert.match(read("app/pricing/page.tsx"), /<MembershipPlans\s*\/>/);
  assert.match(read("app/services/page.tsx"), /section="services"/);
  assert.match(read("app/upgrades/page.tsx"), /section="upgrades"/);
});

test("catalog sections retain the cart flow and return sign-ins to their current route", () => {
  const catalog = read("app/catalog/page.tsx");
  assert.match(catalog, /product\.category\?\.slug === "services"/);
  assert.match(catalog, /authRedirectUrl\(window\.location\.origin, window\.location\.pathname\)/);
  assert.match(catalog, /href: "\/upgrades"/);
  assert.match(catalog, /href: "\/services"/);
});

test("chrome exposes pricing, services, and upgrades while home prioritizes owner journeys", () => {
  assert.match(read("app/page.tsx"), /"\/upgrades"/);
  const chrome = read("app/site-chrome.tsx");
  assert.match(chrome, /localHref\("\/services"\)/);
  assert.match(chrome, /localHref\("\/upgrades"\)/);
  assert.match(chrome, /localHref\("\/pricing"\)/);
});
