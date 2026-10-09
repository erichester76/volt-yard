import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/partnership/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261009000008_strengthen_partnership_independence_hero.sql", import.meta.url), "utf8");

test("partnership landing defines the EV visibility problem for independent specialists", () => {
  assert.match(page, /Your brand\. Your revenue\. Your customer/);
  assert.match(page, /Your EV capability may be real\. Your visibility probably is not/);
  assert.match(page, /electrician looking for charger installs/);
  assert.match(page, /wrap shop ready to work on Cybertrucks/);
  assert.match(page, /established ICE shop building a serious EV practice/);
  assert.match(page, /People look for their own answers before they look for a vendor/);
  assert.match(page, /ask AI tools/);
  assert.match(page, /Be found/);
  assert.match(page, /You keep the customer\. We organize the details/);
  assert.match(page, /You retain your brand, pricing, operations, customer relationship/);
  assert.match(page, /not a remote diagnosis or an automatic assignment/);
  assert.ok(page.indexOf('href="/portal"') < page.indexOf("Your EV capability may be real"));
  assert.match(migration, /\('partnership\.title','en','Your brand\. Your revenue\. Your customer\.'/);
});

test("partnership landing sells the shared-growth model before its CTA", () => {
  assert.match(page, /not a franchise/);
  assert.match(page, /do not take a percentage of your sale/);
  assert.match(page, /launch marketing, social content, local events, owner education, paid advertising/);
  assert.match(page, /Future permissioned Connected Garage data/);
  assert.match(page, /We do not promise lead volume, earnings, or certification/);
  assert.match(page, /We make the standard clear, then help you meet it/);
  assert.match(page, /Certification is not something a business buys/);
  assert.match(page, /What we review/);
  assert.match(page, /What we build with you/);
  assert.ok(page.lastIndexOf('href="/portal"') > page.indexOf("We do not promise lead volume, earnings, or certification"));
});

test("partnership landing presents circular, level-specific network seals", () => {
  assert.match(page, /function LevelBadge/);
  assert.match(page, /AMPED UP/);
  assert.match(page, /VERIFIED/);
  assert.match(page, /CERTIFIED/);
  assert.match(page, /LEADER/);
  assert.match(page, /aria-hidden="true"/);
  assert.match(page, /AMPED UP/);
  assert.ok(page.indexOf("A network that creates demand") < page.indexOf('className="partnership-seal-row"'));
});
