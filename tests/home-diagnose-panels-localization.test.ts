import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const diagnoseMigration = readFileSync(new URL("../supabase/migrations/20261004000005_localize_home_diagnose_panels.sql", import.meta.url), "utf8");
const homeMigration = readFileSync(new URL("../supabase/migrations/20261005000000_restore_home_mechanic_and_network_copy.sql", import.meta.url), "utf8");

test("home diagnose and partner panels use localized authored copy", () => {
  assert.match(home, /className="hero-panels"/);
  assert.match(home, /t\("home\.diagnose_cta", "Try it out"\)/);
  assert.match(home, /t\("home\.diagnose_handoff", "Members save issue history; Premium adds priority context and expert-response options\."\)/);
  assert.match(home, /t\("home\.find_title", "Find a mechanic if you already know what you need\."\)/);
  assert.match(home, /t\("home\.find_intro", "Search trusted independent EV specialists near you\."\)/);

  for (const key of ["diagnose_eyebrow", "diagnose_title", "diagnose_intro", "diagnose_answers", "diagnose_expertise", "diagnose_handoff", "diagnose_cta", "diagnose_membership"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(diagnoseMigration, new RegExp(`\\('home\\.${key}', '${locale}',`));
    }
  }
  for (const key of ["find_title", "find_intro"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(homeMigration, new RegExp(`\\('home\\.${key}', '${locale}',`));
    }
  }
});
