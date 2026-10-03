const production = process.env.VERCEL_ENV === "production";
if (!production) {
  console.log("Skipping production deployment configuration checks.");
  process.exit(0);
}

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "CRON_SECRET", "GOOGLE_MAPS_API_KEY", "YELP_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_APP_URL"];
const missing = required.filter((name) => !process.env[name]?.trim());
const exposedSecrets = Object.keys(process.env).filter((name) => /^NEXT_PUBLIC_.*(?:SECRET|PRIVATE|WEBHOOK|CRON|YELP)/.test(name));
let invalidAppUrl = false;
try { const url = new URL(process.env.NEXT_PUBLIC_APP_URL); invalidAppUrl = url.protocol !== "https:" || url.origin !== process.env.NEXT_PUBLIC_APP_URL; } catch { invalidAppUrl = true; }
if (missing.length || exposedSecrets.length || invalidAppUrl) {
  if (missing.length) console.error(`Missing production environment variables: ${missing.join(", ")}`);
  if (exposedSecrets.length) console.error(`Secret variables must not use NEXT_PUBLIC_: ${exposedSecrets.join(", ")}`);
  if (invalidAppUrl) console.error("NEXT_PUBLIC_APP_URL must be a canonical HTTPS origin without a path.");
  process.exit(1);
}
console.log("Production deployment configuration checks passed.");
