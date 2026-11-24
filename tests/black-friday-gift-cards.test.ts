import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("Black Friday and new-owner landings stay public and do not replace home", () => {
  for (const path of ["app/black-friday/page.tsx", "app/[locale]/black-friday/page.tsx", "app/new-ev-owner/page.tsx", "app/[locale]/new-ev-owner/page.tsx", "app/gift/[token]/page.tsx", "app/[locale]/gift/[token]/page.tsx"]) {
    assert.equal(existsSync(new URL(path, root)), true, path);
  }
  const home = read("app/page.tsx");
  const landing = read("app/black-friday/page.tsx");
  const owner = read("app/new-ev-owner/page.tsx");
  assert.doesNotMatch(home, /\/black-friday/);
  assert.match(landing, /do not need an account/);
  assert.match(landing, /Send the gift link on a date/);
  assert.match(landing, /not sent to the recipient at checkout/);
  assert.match(landing, /any service or upgrade/);
  assert.match(landing, /giftMembershipDays/);
  assert.match(owner, /not part of Amped Up yet/);
  assert.doesNotMatch(owner, /we will automatically match|book your appointment now|read our vehicle reviews/i);
});

test("gift purchase does not require a buyer account and does not log Shopify card codes", () => {
  const checkout = read("app/api/gift-cards/checkout/route.ts");
  const shopify = read("lib/shopify-gift-cards.ts");
  const webhook = read("app/api/stripe/webhook/route.ts");
  assert.doesNotMatch(checkout, /bearerToken/);
  assert.match(checkout, /shopify_gift_card/);
  assert.match(checkout, /idempotencyKey/);
  assert.doesNotMatch(shopify, /console\.(log|info|debug)/);
  assert.match(webhook, /purpose !== "shopify_gift_card"|giftCardWebhookUpdate/);
  assert.match(read("supabase/migrations/20261010000000_add_shopify_gift_cards.sql"), /revoke all on table public\.gift_cards from anon/);
});
