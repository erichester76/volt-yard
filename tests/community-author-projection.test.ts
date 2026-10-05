import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/20261004000004_extend_community_author_projection.sql", import.meta.url), "utf8");

test("community author projection exposes only public badges", () => {
  assert.match(migration, /profile\.membership_tier/);
  assert.match(migration, /partner_type\.name as specialty/);
  assert.match(migration, /shop\.is_published/);
  assert.match(migration, /revoke all on public\.community_author_profiles from public/);
  assert.doesNotMatch(migration, /profile\.(email|phone|address|license_number)/);
});
