import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("home paired panels share title rhythm and action dimensions", () => {
  assert.match(home, /<div className="hero-panels">/);
  assert.match(home, /<section className="hero-panel diagnose-panel"/);
  assert.match(home, /<section className="hero-panel partner-panel partner-search"/);
  assert.match(home, /<h2 className="heading-secondary hero-action-heading hero-action-heading-secondary" id="diagnose-panel-title">/);
  assert.match(home, /<h2 className="hero-panel-title partner-panel-title" id="partner-panel-title">/);
  assert.match(home, /<Link className="hero-primary-action diagnose-action" href="\/issues">/);
  assert.match(home, /<Button className="hero-panel-action" type="submit"/);
  assert.match(css, /\.button,[\s\S]*?\.action-link \{[\s\S]*?min-height: 39px;[\s\S]*?padding: var\(--action-padding\);[\s\S]*?font: var\(--action-font\);/);
});
