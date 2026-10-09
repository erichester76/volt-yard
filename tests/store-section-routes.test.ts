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

test("catalog sections retain the secure cart flow and make membership discoverable first", () => {
  const catalog = read("app/catalog/page.tsx");
  assert.match(catalog, /product\.category\?\.slug === "services"/);
  assert.match(catalog, /volt-yard-open-auth/);
  assert.match(catalog, /Explore membership and pricing/);
  assert.match(catalog, /href: "\/upgrades"/);
  assert.match(catalog, /href: "\/services"/);
});

test("pricing describes discounts as future benefits, not active ones", () => {
  const plans = read("app/membership-plans.tsx");
  assert.match(plans, /Future member discounts are planned and not yet available\./);
  assert.doesNotMatch(plans, /active member discounts/i);
});

test("chrome exposes services and upgrades while pricing stays in onboarding", () => {
  assert.match(read("app/page.tsx"), /"\/upgrades"/);
  const chrome = read("app/site-chrome.tsx");
  assert.match(chrome, /localHref\("\/services"\)/);
  assert.match(chrome, /localHref\("\/upgrades"\)/);
  assert.doesNotMatch(chrome, /localHref\("\/pricing"\)/);
});
