import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("home paired panels share title rhythm and action dimensions", () => {
  assert.match(home, /<div className="hero-action-panels">/);
  assert.match(home, /<h1 className="hero-panel-title">/);
  assert.match(home, /<h2 className="hero-panel-title">/);
  assert.match(home, /<ActionLink className="hero-panel-action" href="\/issues">\{t\("home\.try_cta", "Try it out"\)\}/);
  assert.match(home, /<Button className="hero-panel-action" type="submit"/);
  assert.match(css, /\.hero-panel-title \{[^}]*font-family: var\(--heading-font-family\);[^}]*font-size: var\(--heading-primary-size\);[^}]*line-height: var\(--heading-line-height\);/);
  assert.match(css, /\.button,[\s\S]*?\.action-link \{[\s\S]*?min-height: 39px;[\s\S]*?padding: var\(--action-padding\);[\s\S]*?font: var\(--action-font\);/);
});
