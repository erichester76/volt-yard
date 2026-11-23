import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalog = readFileSync(new URL("../app/catalog/page.tsx", import.meta.url), "utf8");
const cart = readFileSync(new URL("../app/cart/page.tsx", import.meta.url), "utf8");
const community = readFileSync(new URL("../app/community/page.tsx", import.meta.url), "utf8");
const topic = readFileSync(new URL("../app/community/[slug]/page.tsx", import.meta.url), "utf8");

test("public catalog browsing keeps anonymous carts local and gates checkout", () => {
  assert.match(catalog, /catalog_products/);
  assert.match(catalog, /addGuestItem/);
  assert.match(cart, /requestAccount\("sign-up"/);
});

test("public community browsing sends anonymous writing and voting through sign-up", () => {
  assert.match(community, /async function startQuestion/);
  assert.match(community, /volt-yard-open-auth/);
  assert.match(topic, /requestAccount\("sign-up"\)/);
  assert.match(topic, /moderation_state: "pending"/);
});
