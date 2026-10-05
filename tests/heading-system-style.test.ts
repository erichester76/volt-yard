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
  assert.match(css, /--header-accent-background: #f3b2a2;/);
  assert.match(css, /--header-accent-foreground: #172723;/);
  assert.match(css, /\.page-header \.eyebrow \{[\s\S]*?background: var\(--header-accent-background\);[\s\S]*?color: var\(--header-accent-foreground\);/);
  assert.match(css, /\.button,[\s\S]*?font: var\(--action-font\);/);
});

test("dark theme accent tokens do not inherit the light salmon palette", () => {
  const dark = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(dark);

  assert.doesNotMatch(dark, /#(?:e96b4e|c95439|f3b2a2)\b/i);
  for (const token of ["--acid", "--orange", "--button-primary-background", "--header-accent-background"]) {
    assert.match(dark, new RegExp(`${token}: #d6ff35;`));
  }
});

test("home hero applies the shared primary and secondary heading roles", () => {
  assert.match(home, /className="heading-primary hero-action-heading hero-action-heading-primary"/);
  assert.match(home, /className="heading-secondary hero-action-heading hero-action-heading-secondary"/);
});
