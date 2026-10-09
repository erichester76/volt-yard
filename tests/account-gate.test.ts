import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isGatedPath, safeReturnTo } from "../lib/account-gate";

const chrome = readFileSync(new URL("../app/site-chrome.tsx", import.meta.url), "utf8");

test("gates feature routes while retaining public discovery and release content", () => {
  for (const path of ["/issues", "/en/tutorials", "/fr/community/topic", "/services", "/upgrades", "/catalog", "/shops", "/cart", "/checkout/success", "/profile", "/portal", "/expert-work", "/installer/work", "/admin", "/membership"]) {
    assert.equal(isGatedPath(path), true, `${path} is gated`);
  }
  for (const path of ["/", "/de", "/ev-purchase-research", "/fr/ev-purchase-research", "/partnership", "/fr/partnership", "/pricing", "/es/pricing", "/release-notes", "/journal", "/library/charging-basics"]) {
    assert.equal(isGatedPath(path), false, `${path} stays public`);
  }
});

test("retains only local return paths, including locale-prefixed paths", () => {
  assert.equal(safeReturnTo("/fr/issues?vehicle=ev#details"), "/fr/issues?vehicle=ev#details");
  assert.equal(safeReturnTo("https://attacker.example"), null);
  assert.equal(safeReturnTo("//attacker.example"), null);
});

test("chrome intercepts gated links and redirects direct visitors through the sign-up dialog", () => {
  assert.match(chrome, /onClickCapture=\{gateNavigation\}/);
  assert.match(chrome, /openAuth\("sign-up", `\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`\)/);
  assert.match(chrome, /router\.replace\(localePath\(locale, "\/"\)\)/);
  assert.match(chrome, /openAuth\("sign-up", intendedPath\)/);
  assert.match(chrome, /router\.push\(returnTo\)/);
  assert.match(chrome, /vehicle, problem and case, post, and purchase history/);
});
