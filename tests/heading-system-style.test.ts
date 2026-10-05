import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("shared heading tokens retain primary, secondary, and accent roles", () => {
  for (const token of [
    "--heading-font-family",
    "--heading-font-weight",
    "--heading-primary-size",
    "--heading-secondary-size",
    "--heading-tertiary-size",
    "--heading-primary-color",
    "--heading-secondary-color",
    "--heading-accent-color",
  ]) assert.match(css, new RegExp(`${token}:`));

  assert.match(css, /h1 \{[\s\S]*?font-family: var\(--heading-font-family\);[\s\S]*?font-size: var\(--heading-primary-size\);[\s\S]*?color: var\(--heading-primary-color\);/);
  assert.match(css, /h2 \{ font-size: var\(--heading-secondary-size\); \}/);
  assert.match(css, /h3 \{ font-size: var\(--heading-tertiary-size\); \}/);
  assert.match(css, /\.heading-secondary \{ color: var\(--heading-secondary-color\); \}/);
  assert.match(css, /\.heading-accent \{[^}]*color: var\(--heading-accent-color\);/);
});

test("home hero applies the shared primary and secondary heading roles", () => {
  assert.match(home, /className="heading-primary hero-action-heading hero-action-heading-primary"/);
  assert.match(home, /className="heading-secondary hero-action-heading hero-action-heading-secondary"/);
  assert.match(css, /\.hero-action-heading-primary \{[^}]*color: var\(--heading-on-hero-color\); \}/);
  assert.match(css, /\.hero-action-heading-secondary \{ color: var\(--heading-secondary-on-hero-color\); \}/);
});
