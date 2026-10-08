import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261008000003_localize_community_first_home.sql", import.meta.url), "utf8");

test("home introduces the support pathway and offers every owner route", () => {
  assert.match(home, /home\.intro/);
  assert.match(home, /className="hero-support-path"/);
  assert.match(home, /home\.journey_guided/);
  assert.match(home, /home\.journey_community/);
  assert.match(home, /home\.journey_expert/);
  assert.match(home, /home\.journey_service/);
  assert.match(home, /"\/issues"/);
  assert.match(home, /"\/tutorials"/);
  assert.match(home, /"\/pricing"/);
  assert.match(home, /"\/community"/);
  assert.match(home, /"\/upgrades"/);
  assert.match(home, /"\/shops"/);

  for (const key of ["journey_guided", "journey_community", "journey_expert", "journey_service", "path_issue", "path_maintenance", "path_membership", "path_community", "path_catalog", "path_shops"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(migration, new RegExp(`\\('home\\.${key}','${locale}',`));
    }
  }
});

test("home sends people from the hero directly to the owner pathways", () => {
  assert.doesNotMatch(home, /home-journey/);
  assert.match(home, /className="home-pathways"/);
});
