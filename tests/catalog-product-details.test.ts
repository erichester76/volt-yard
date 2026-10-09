import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

test("catalog product detail migration constrains private images and public visibility", async () => {
  const migration = await read("supabase/migrations/20261009000012_add_catalog_product_details.sql");
  assert.match(migration, /add column long_description text not null default ''/);
  assert.match(migration, /char_length\(long_description\) <= 12000/);
  assert.match(migration, /create table public\.catalog_product_images/);
  assert.match(migration, /storage_path text not null unique/);
  assert.match(migration, /char_length\(trim\(alt_text\)\) between 1 and 280/);
  assert.match(migration, /sort_order between 0 and 1000/);
  assert.match(migration, /product\.active[\s\S]*category\.active/);
  assert.match(migration, /'catalog-product-images',[\s\S]*false,[\s\S]*10485760/);
  assert.match(migration, /Admins upload catalog product image objects/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] in \(select id::text from public\.catalog_products\)/);
  assert.match(migration, /Admins delete catalog product image objects/);
  assert.match(migration, /notify pgrst, 'reload schema';/);
});

test("catalog details use signed image URLs, accessible expansion, and the existing sign-up cart gate", async () => {
  const catalog = await read("app/catalog/page.tsx");
  assert.match(catalog, /long_description/);
  assert.match(catalog, /catalog_product_images/);
  assert.match(catalog, /storage\.from\("catalog-product-images"\)\.createSignedUrl/);
  assert.doesNotMatch(catalog, /getPublicUrl/);
  assert.match(catalog, /aria-expanded=\{expanded\}/);
  assert.match(catalog, /aria-controls=\{detailId\}/);
  assert.match(catalog, /View details/);
  assert.match(catalog, /volt-yard-open-auth/);
  assert.match(catalog, /mode: "sign-up"/);
});
