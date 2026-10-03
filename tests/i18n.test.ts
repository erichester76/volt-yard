import assert from "node:assert/strict";
import test from "node:test";
import { localePath, negotiateLocale } from "../lib/i18n";

test("negotiates a supported browser language and falls back to English", () => {
  assert.equal(negotiateLocale("de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(negotiateLocale("it-IT,it;q=0.9"), "en");
  assert.equal(negotiateLocale("fr", "es"), "es");
});

test("builds locale-prefixed paths without duplicate slashes", () => {
  assert.equal(localePath("fr"), "/fr");
  assert.equal(localePath("es", "/community"), "/es/community");
});
