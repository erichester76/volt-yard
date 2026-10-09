import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/partnership/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261009000000_add_partnership_landing.sql", import.meta.url), "utf8");
const commercialMigration = readFileSync(new URL("../supabase/migrations/20261009000001_add_partnership_program_details.sql", import.meta.url), "utf8");

test("partnership landing directs prospective partners into the reviewed portal workflow", () => {
  assert.match(page, /href="\/portal"/);
  assert.match(page, /We review/);
  assert.match(page, /before publishing it/);
  assert.match(page, /Connecting qualified clients to qualified shops/);

  for (const key of ["eyebrow", "title", "intro", "action", "steps_eyebrow", "steps_title", "step_apply", "step_apply_intro", "step_review", "step_review_intro", "step_participate", "step_participate_intro", "fit_eyebrow", "fit_title", "fit_intro"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(migration, new RegExp(`\\('partnership\\.${key}','${locale}',`));
    }
  }
});

test("partnership landing explains program levels and qualitative commercial terms", () => {
  assert.match(page, /Verified Specialty \/ Infrastructure/);
  assert.match(page, /Certified Partner/);
  assert.match(page, /Network Leader/);
  assert.match(page, /We do not promise lead volume, earnings, or certification/);
  assert.match(page, /automated transfers are not available/);

  for (const key of ["levels_eyebrow", "levels_title", "levels_intro", "level_specialist", "level_specialist_intro", "level_certified", "level_certified_intro", "level_leader", "level_leader_intro", "commercial_eyebrow", "commercial_title", "commercial_intro", "commercial_launch", "commercial_launch_intro", "commercial_ongoing", "commercial_ongoing_intro", "commercial_payout", "commercial_payout_intro"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(commercialMigration, new RegExp(`\\('partnership\\.${key}','${locale}',`));
    }
  }
});
