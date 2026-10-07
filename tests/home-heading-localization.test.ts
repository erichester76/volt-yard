import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const heading = readFileSync(new URL("../app/heading-accent.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261005000000_restore_home_mechanic_and_network_copy.sql", import.meta.url), "utf8");

test("home heading uses a translator-controlled accent token", () => {
  assert.match(home, /LocalizedHeadingAccent text=\{t\("home\.title", "Everything EV, \{\{accent\}\} together\."\)\} accent=\{t\("home\.title_accent", "all"\)\}/);
  assert.match(heading, /const marker = "\{\{accent\}\}"/);
  assert.match(heading, /if \(after === undefined\) return <>\{text\}<\/>/);
  assert.match(heading, /className="heading-accent heading-accent-italic"/);
  assert.match(migration, /\('home\.title_accent', 'en', 'all'\)/);
  assert.match(migration, /\('home\.title', 'fr', 'Tout pour votre VE, \{\{accent\}\} réuni\.'/);
});
