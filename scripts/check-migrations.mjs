import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const migrationsDirectory = resolve("supabase/migrations");
const filenames = (await readdir(migrationsDirectory)).filter((filename) => filename.endsWith(".sql"));
const migrationPattern = /^\d{14}_[a-z0-9_]+\.sql$/;
const invalid = filenames.filter((filename) => !migrationPattern.test(filename));
const prefixes = new Map();
for (const filename of filenames) {
  const prefix = filename.slice(0, 14);
  prefixes.set(prefix, [...(prefixes.get(prefix) ?? []), filename]);
}
const duplicatePrefixes = [...prefixes.entries()].filter(([, names]) => names.length > 1).map(([prefix]) => prefix);

if (!filenames.length || invalid.length || duplicatePrefixes.length) {
  if (!filenames.length) console.error("No Supabase migrations were found.");
  if (invalid.length) console.error(`Invalid migration filenames: ${invalid.join(", ")}`);
  if (duplicatePrefixes.length) console.error(`Duplicate migration timestamps: ${duplicatePrefixes.join(", ")}`);
  process.exit(1);
}

console.log(`Local migration history check passed (${filenames.length} files). Remote migration status must be checked with the linked target before release.`);
