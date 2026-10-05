import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261004000005_localize_home_diagnose_panels.sql", import.meta.url), "utf8");

test("home diagnose and partner panels use localized authored copy", () => {
  assert.match(home, /className="hero-panels"/);
  assert.match(home, /t\("home\.diagnose_cta", "Try it out"\)/);
  assert.match(home, /t\("home\.diagnose_handoff", "Members save issue history; Premium adds priority context and expert-response options\."\)/);
  assert.match(home, /t\("home\.find_eyebrow", "Just need a shop\?"\)/);
  assert.match(home, /t\("home\.find_intro", "No pressure\. Search independent shops and service partners near you when you already know what you need\."\)/);

  for (const key of ["diagnose_eyebrow", "diagnose_title", "diagnose_intro", "diagnose_answers", "diagnose_expertise", "diagnose_handoff", "diagnose_cta", "diagnose_membership", "find_eyebrow", "find_title", "find_intro"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(migration, new RegExp(`\\('home\\.${key}', '${locale}',`));
    }
  }
});
