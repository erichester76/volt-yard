import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20261123000001_add_ohmmu_tesla_12v_batteries.sql", import.meta.url), "utf8");

test("Ohmmu Tesla 12V batteries land in the upgrades catalog without an installer payout", () => {
  for (const slug of [
    "ohmmu-b19-lithium-model-3",
    "ohmmu-b19-sodium-model-3",
    "ohmmu-b19-lithium-model-y",
    "ohmmu-b19-sodium-model-y",
    "ohmmu-u1r-lithium-model-s",
    "ohmmu-u1r-sodium-model-s",
    "ohmmu-b19r-lithium-model-x",
    "ohmmu-b19r-sodium-model-x",
  ]) {
    assert.match(sql, new RegExp(slug));
  }
  assert.match(sql, /slug = 'upgrades'/);
  assert.match(sql, /47900/);
  assert.match(sql, /37900/);
  assert.match(sql, /installer_payout_cents/);
  assert.match(sql, /item\.price_cents,\n\s*0,/);
  assert.doesNotMatch(sql, /cdn\.shopify\.com/);
});
