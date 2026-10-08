import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const shops = readFileSync(new URL("../app/shops/page.tsx", import.meta.url), "utf8");
const chrome = readFileSync(new URL("../app/site-chrome.tsx", import.meta.url), "utf8");

test("home pathways lead directly to the standalone shops search", () => {
  assert.doesNotMatch(home, /home-journey-steps/);
  assert.match(home, /className="home-pathway-grid"/);
  assert.match(shops, /export default function ShopsPage/);
  assert.match(shops, /<form className="search" onSubmit=\{search\}>/);
  assert.match(shops, /createSignedUrl\(image\.storage_path, 3600\)/);
  assert.match(shops, /aria-autocomplete="list"/);
  assert.match(chrome, /href=\{localHref\("\/shops"\)\}/);
  assert.match(css, /\.button,[\s\S]*?\.action-link \{[\s\S]*?min-height: 39px;[\s\S]*?padding: var\(--action-padding\);[\s\S]*?font: var\(--action-font\);/);
});
