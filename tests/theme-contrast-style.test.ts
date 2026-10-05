import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function declaration(block: string, name: string) {
  return block.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
}

function contrast(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("primary buttons and community card links retain theme contrast", () => {
  const light = css.match(/:root \{([\s\S]*?)\n\}/)?.[1];
  const dark = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(light);
  assert.ok(dark);

  for (const theme of [light, dark]) {
    const background = declaration(theme, "--button-primary-background");
    const foreground = declaration(theme, "--button-primary-foreground");
    assert.ok(background);
    assert.ok(foreground);
    assert.ok(contrast(foreground, background) >= 4.5);
  }

  assert.equal(declaration(light, "--button-primary-background"), declaration(light, "--acid"));
  assert.equal(declaration(dark, "--button-primary-background"), declaration(dark, "--acid"));

  assert.match(css, /\.catalog-card button \{[^}]*background: var\(--button-primary-background\);[^}]*color: var\(--button-primary-foreground\);/);
  assert.match(css, /\.topic-card-footer a,/);
  assert.match(css, /\.topic-card-footer a,[\s\S]*?color: var\(--community-card-link\);/);
});

test("primary and secondary button tokens are explicit and accessible in each theme", () => {
  const light = css.match(/:root \{([\s\S]*?)\n\}/)?.[1];
  const dark = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(light);
  assert.ok(dark);

  for (const theme of [light, dark]) {
    const background = declaration(theme, "--button-secondary-background");
    const foreground = declaration(theme, "--button-secondary-foreground");
    assert.ok(background);
    assert.ok(foreground);
    assert.ok(contrast(foreground, background) >= 4.5);
  }

  assert.match(css, /\.heading-accent \{[^}]*font-family: "Playfair Display"[^}]*color: var\(--heading-accent-color\);/);
  assert.match(css, /\.heading-accent-italic \{[^}]*font-style: italic;/);
  assert.match(css, /\.search-button \{[^}]*background: var\(--button-primary-background\);[^}]*color: var\(--button-primary-foreground\);/);
  assert.match(css, /\.inline-cta\.secondary-action \{[^}]*background: var\(--button-secondary-background\);[^}]*color: var\(--button-secondary-foreground\);/);
});

test("the homepage Diagnose CTA uses its explicit accessible theme tokens", () => {
  const light = css.match(/:root \{([\s\S]*?)\n\}/)?.[1];
  const dark = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(light);
  assert.ok(dark);

  for (const theme of [light, dark]) {
    const background = declaration(theme, "--diagnose-cta-background");
    const foreground = declaration(theme, "--diagnose-cta-foreground");
    assert.ok(background);
    assert.ok(foreground);
    assert.ok(contrast(foreground, background) >= 4.5);
  }

  assert.match(css, /\.hero-actions \.diagnose-action \{[^}]*background: var\(--diagnose-cta-background\);[^}]*color: var\(--diagnose-cta-foreground\);/);
});
