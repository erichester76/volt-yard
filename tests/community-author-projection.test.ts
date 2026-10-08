import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/20261008000001_replace_public_projection_views_with_bounded_rpcs.sql", import.meta.url), "utf8");

test("community author projection exposes only public badges", () => {
  assert.match(migration, /profile\.membership_tier/);
  assert.match(migration, /partner_type\.name::text as specialty/);
  assert.match(migration, /shop\.is_published/);
  assert.match(migration, /drop view if exists public\.community_author_profiles/);
  assert.match(migration, /create function public\.community_author_profiles_for_ids/);
  assert.match(migration, /cardinality\(author_ids\) between 1 and 250/);
  assert.match(migration, /grant execute on function public\.community_author_profiles_for_ids\(uuid\[\]\) to anon, authenticated/);
  assert.doesNotMatch(migration, /profile\.(email|phone|address|license_number)/);
});
