import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/ev-purchase-research/page.tsx", import.meta.url), "utf8");

test("purchase research sends prospective owners to real current resources", () => {
  assert.match(home, /"\/ev-purchase-research"/);
  assert.match(page, /Owner perspectives/);
  assert.match(page, /Practical guides/);
  assert.match(page, /Pre-purchase inspection/);
  assert.match(page, /New-owner essentials/);
  assert.match(page, /"\/community"/);
  assert.match(page, /"\/journal"/);
  assert.match(page, /"\/services"/);
  assert.match(page, /"\/upgrades"/);
});

test("purchase research does not present unbuilt vehicle reviews as available", () => {
  assert.match(page, /Vehicle reviews are not part of Amped Up yet/);
  assert.match(page, /Availability, compatibility, and next steps vary/);
});
