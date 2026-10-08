import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const primitives = readFileSync(new URL("../app/page-primitives.tsx", import.meta.url), "utf8");

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

test("authored page headers and actions use shared semantic primitives", () => {
  assert.match(primitives, /export function PageHeader/);
  assert.match(primitives, /export function Eyebrow/);
  assert.match(primitives, /export function Button/);
  assert.match(primitives, /export function ActionLink/);
  assert.match(css, /--header-accent-background: #ffb800;/);
  assert.match(css, /--header-accent-foreground: #141414;/);
  assert.match(css, /\.page-header \.eyebrow \{[\s\S]*?background: var\(--header-accent-background\);[\s\S]*?color: var\(--header-accent-foreground\);/);
  assert.match(css, /\.button,[\s\S]*?font: var\(--action-font\);/);
});

test("dark theme accent tokens use the Amped Up safety palette", () => {
  const dark = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(dark);

  assert.doesNotMatch(dark, /#(?:e96b4e|c95439|f3b2a2)\b/i);
  assert.match(dark, /--acid: #ffcb32;/);
  assert.match(dark, /--orange: #ff8333;/);
  assert.match(dark, /--button-primary-background: #ff8333;/);
  assert.match(dark, /--header-accent-background: #ffcb32;/);
});

test("home hero applies the shared primary heading role", () => {
  assert.match(home, /className="heading-primary hero-action-heading hero-action-heading-primary"/);
  assert.match(home, /<h2>\{t\("home\.paths_title"/);
});
