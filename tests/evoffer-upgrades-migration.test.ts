import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20261123000000_add_evoffer_top_seller_upgrades.sql", import.meta.url), "utf8");

test("EVOffer top sellers land in the upgrades catalog without an installer payout", () => {
  for (const slug of [
    "evoffer-model-3-electric-tailgate",
    "evoffer-model-y-electric-frunk",
    "evoffer-model-3-electric-frunk",
    "evoffer-model-3-sr-speaker-activation",
    "evoffer-model-3-y-ultra-bright-led",
    "evoffer-model-s-x-ultra-bright-led",
    "evoffer-model-x-electric-frunk",
    "evoffer-model-s-electric-frunk",
    "evoffer-model-3-y-ludicrous-style-sport-seats",
    "evoffer-model-3-y-hdmi-interface",
    "evoffer-model-3-y-tailgate-foot-activation",
    "evoffer-model-s-x-tailgate-foot-activation",
  ]) {
    assert.match(sql, new RegExp(slug));
  }
  assert.match(sql, /slug = 'upgrades'/);
  assert.match(sql, /installer_payout_cents,\s*\n\s*0,/);
  assert.doesNotMatch(sql, /https:\/\/evoffer\.com\/wp-content/);
});
