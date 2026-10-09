import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261008000003_localize_community_first_home.sql", import.meta.url), "utf8");
const partnerMigration = readFileSync(new URL("../supabase/migrations/20261008000017_add_home_partner_invitation.sql", import.meta.url), "utf8");
const newOwnerMigration = readFileSync(new URL("../supabase/migrations/20261009000010_add_new_owner_home_path.sql", import.meta.url), "utf8");

test("home introduces the support pathway and offers the five primary owner journeys", () => {
  assert.match(home, /home\.intro/);
  assert.match(home, /className="hero-support-path"/);
  assert.match(home, /home\.journey_guided/);
  assert.match(home, /home\.journey_community/);
  assert.match(home, /home\.journey_expert/);
  assert.match(home, /home\.journey_service/);
  assert.match(home, /"\/issues"/);
  assert.match(home, /"\/tutorials"/);
  assert.match(home, /"\/community"/);
  assert.match(home, /"\/upgrades"/);
  assert.match(home, /home\.path_new_owner/);
  assert.doesNotMatch(home, /"\/pricing"/);
  assert.doesNotMatch(home, /"\/shops"/);

  for (const key of ["journey_guided", "journey_community", "journey_expert", "journey_service", "path_issue", "path_maintenance", "path_community", "path_catalog"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(migration, new RegExp(`\\('home\\.${key}','${locale}',`));
    }
  }
  for (const key of ["path_new_owner", "path_new_owner_intro"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(newOwnerMigration, new RegExp(`\\('home\\.${key}','${locale}',`));
    }
  }
});

test("home sends people from the hero directly to the owner pathways", () => {
  assert.doesNotMatch(home, /home-journey/);
  assert.doesNotMatch(home, /home\.paths_eyebrow/);
  assert.match(home, /className="home-pathways"/);
  assert.match(home, /href="#owner-journeys"/);
  assert.match(home, /id="owner-journeys"/);
});

test("home invites relevant partners to join the network", () => {
  assert.match(home, /className="home-partner-invitation"/);
  assert.match(home, /href="\/partnership"/);

  for (const key of ["partner_eyebrow", "partner_title", "partner_intro", "partner_action"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(partnerMigration, new RegExp(`\\('home\\.${key}','${locale}',`));
    }
  }
});
