import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/partnership/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261009000000_add_partnership_landing.sql", import.meta.url), "utf8");

test("partnership landing directs prospective partners into the reviewed portal workflow", () => {
  assert.match(page, /href="\/portal"/);
  assert.match(page, /We review/);
  assert.match(page, /before publishing it/);

  for (const key of ["eyebrow", "title", "intro", "action", "steps_eyebrow", "steps_title", "step_apply", "step_apply_intro", "step_review", "step_review_intro", "step_participate", "step_participate_intro", "fit_eyebrow", "fit_title", "fit_intro"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(migration, new RegExp(`\\('partnership\\.${key}','${locale}',`));
    }
  }
});
