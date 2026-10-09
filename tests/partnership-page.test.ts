import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/partnership/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261009000007_refocus_partnership_marketing_page.sql", import.meta.url), "utf8");

test("partnership landing centers the independent business", () => {
  assert.match(page, /Your brand\. Your shop\. Your revenue/);
  assert.match(page, /Connecting qualified clients to qualified experts/);
  assert.match(page, /You keep the customer\. We keep the context/);
  assert.match(page, /Your customer relationship stays yours/);
  assert.match(page, /not a diagnosis or an automatic assignment/);
  assert.match(migration, /\('partnership\.title','en','Your brand\. Your shop\. Your revenue\.'/);
});

test("partnership landing sells shared-growth program value before its CTA", () => {
  assert.match(page, /marketing front door/);
  assert.match(page, /Tools and training that improve the handoff/);
  assert.match(page, /community that helps every member grow/);
  assert.match(page, /Fixed completed-booking fees apply only to verified qualifying work/);
  assert.match(page, /We do not promise lead volume, earnings, or certification/);
  assert.ok(page.lastIndexOf('href="/portal"') > page.indexOf("We do not promise lead volume, earnings, or certification"));
});

test("partnership landing presents circular, level-specific network seals", () => {
  assert.match(page, /function LevelBadge/);
  assert.match(page, /AMPED UP/);
  assert.match(page, /NETWORK/);
  assert.match(page, /VERIFIED/);
  assert.match(page, /CERTIFIED/);
  assert.match(page, /LEADER/);
  assert.match(page, /aria-hidden="true"/);
});
