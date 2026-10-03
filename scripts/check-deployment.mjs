const production = process.env.VERCEL_ENV === "production";
if (!production) {
  console.log("Skipping production deployment configuration checks.");
  process.exit(0);
}

// Only browser configuration is needed to compile a production build. Server
// integrations are checked by the route handlers that use them.
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_APP_URL"];
const missing = required.filter((name) => !process.env[name]?.trim());
const exposedSecrets = Object.keys(process.env).filter((name) => /^NEXT_PUBLIC_.*(?:SECRET|PRIVATE|WEBHOOK|CRON|YELP)/.test(name));
let invalidAppUrl = false;
try {
  const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
  invalidAppUrl = appUrl.protocol !== "https:" || appUrl.origin !== process.env.NEXT_PUBLIC_APP_URL;
} catch {
  invalidAppUrl = !missing.includes("NEXT_PUBLIC_APP_URL");
}
if (missing.length || exposedSecrets.length || invalidAppUrl) {
  if (missing.length) console.error(`Missing production environment variables: ${missing.join(", ")}`);
  if (exposedSecrets.length) console.error(`Secret variables must not use NEXT_PUBLIC_: ${exposedSecrets.join(", ")}`);
  if (invalidAppUrl) console.error("NEXT_PUBLIC_APP_URL must be a canonical HTTPS origin with no path or trailing slash.");
  process.exit(1);
}
console.log("Production deployment configuration checks passed.");
