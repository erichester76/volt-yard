import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20261004000000_harden_localized_content_privileges.sql", import.meta.url);

test("localized content privileges leave row authorization to RLS", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /alter table public\.localized_content enable row level security;/);
  assert.match(migration, /revoke all on table public\.localized_content from public;/);
  assert.match(migration, /revoke all on table public\.localized_content from anon;/);
  assert.match(migration, /revoke all on table public\.localized_content from authenticated;/);
  assert.match(migration, /revoke all on table public\.localized_content from service_role;/);
  assert.match(migration, /grant select on table public\.localized_content to anon;/);
  assert.match(migration, /grant select, insert, update, delete on table public\.localized_content to authenticated;/);
  assert.match(migration, /grant select, insert, update, delete on table public\.localized_content to service_role;/);
});
