import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20261124000000_set_imported_upgrade_vehicle_fits.sql", import.meta.url), "utf8");

test("imported upgrades are limited to the documented Tesla years", () => {
  assert.match(sql, /product_vehicle_compatibility/);
  assert.match(sql, /vehicle.make = 'Tesla'/);
  assert.match(sql, /'ohmmu-b19-lithium-model-3', 'Model 3', 2017, 2022/);
  assert.match(sql, /'ohmmu-u1r-sodium-model-s', 'Model S', 2012, 2021/);
  assert.match(sql, /'evoffer-model-3-y-ultra-bright-led', 'Model Y', 2020, 2024/);
  assert.match(sql, /'evoffer-model-s-x-ultra-bright-led', 'Model X', 2016, 2020/);
  assert.match(sql, /'evoffer-model-3-y-2025-gear-stalk', 'Model Y', 2025, 2026/);
  assert.match(sql, /'evoffer-model-y-rear-seat-extension', 'Model Y', 2020, 2024/);
  assert.doesNotMatch(sql, /Cybertruck/);
  assert.doesNotMatch(sql, /https:\/\/evoffer\.com\/wp-content/);
});
