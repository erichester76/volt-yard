import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chrome = readFileSync(new URL("../app/site-chrome.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261004000002_localize_shared_footer.sql", import.meta.url), "utf8");

test("shared footer copy uses localized content with English fallbacks", () => {
  assert.match(chrome, /t\("chrome\.footer\.tagline", "Independent EV service, connected\."\)/);
  assert.match(chrome, /aria-label=\{t\("chrome\.footer\.navigation", "Footer navigation"\)\}/);
  assert.match(chrome, /t\("chrome\.footer\.membership", "Membership"\)/);
  assert.match(chrome, /t\("chrome\.footer\.contact", "Contact"\)/);
  assert.match(chrome, /NEXT_PUBLIC_APP_VERSION \?\? "1\.0\.0"/);
  assert.match(chrome, /v\{appVersion\} \/ \{buildCommit\}/);
  assert.doesNotMatch(chrome, /t\("chrome\.footer\.version/);
});

test("footer translations are seeded for every supported locale", () => {
  for (const key of ["tagline", "navigation", "membership", "contact"]) {
    for (const locale of ["en", "de", "fr", "es"]) {
      assert.match(migration, new RegExp(`\\('chrome\\.footer\\.${key}', '${locale}',`));
    }
  }
  assert.match(migration, /on conflict \(content_key, locale\) do update set value = excluded\.value;/);
});
