const production = process.argv.includes("--production") || process.env.VERCEL_ENV === "production";

if (!production) {
  console.log("Skipping production configuration preflight outside a production build.");
  process.exit(0);
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_MAPS_API_KEY",
  "CRON_SECRET",
];
const missing = required.filter((name) => !process.env[name]?.trim());
const stripeVariables = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_MEMBER_PRICE_ID", "STRIPE_PREMIUM_PRICE_ID"];
const configuredStripeVariables = stripeVariables.filter((name) => process.env[name]?.trim());
const incompleteStripeVariables = configuredStripeVariables.length ? stripeVariables.filter((name) => !process.env[name]?.trim()) : [];
const invalid = [];
const value = (name) => process.env[name]?.trim() ?? "";
const canonicalHttpsOrigin = (input) => {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && url.origin === input;
  } catch {
    return false;
  }
};

if (value("NEXT_PUBLIC_SUPABASE_URL") && !canonicalHttpsOrigin(value("NEXT_PUBLIC_SUPABASE_URL"))) invalid.push("NEXT_PUBLIC_SUPABASE_URL must be a canonical HTTPS origin.");
if (value("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") && !/^sb_publishable_\S+$/.test(value("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"))) invalid.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key.");
if (value("SUPABASE_SECRET_KEY") && !/^sb_secret_\S+$/.test(value("SUPABASE_SECRET_KEY"))) invalid.push("SUPABASE_SECRET_KEY must be a Supabase secret key.");
if (value("NEXT_PUBLIC_APP_URL") && !canonicalHttpsOrigin(value("NEXT_PUBLIC_APP_URL"))) invalid.push("NEXT_PUBLIC_APP_URL must be a canonical HTTPS origin with no path or trailing slash.");
if (value("GOOGLE_MAPS_API_KEY") && !/^AIza[A-Za-z0-9_-]{35}$/.test(value("GOOGLE_MAPS_API_KEY"))) invalid.push("GOOGLE_MAPS_API_KEY must have the expected Google Maps API key shape.");
if (value("CRON_SECRET") && (!/^\S+$/.test(value("CRON_SECRET")) || value("CRON_SECRET").length < 32)) invalid.push("CRON_SECRET must be a whitespace-free secret of at least 32 characters.");
if (value("STRIPE_SECRET_KEY") && !/^sk_(?:test|live)_\S+$/.test(value("STRIPE_SECRET_KEY"))) invalid.push("STRIPE_SECRET_KEY must be a Stripe test or live secret key.");
if (value("STRIPE_WEBHOOK_SECRET") && !/^whsec_\S+$/.test(value("STRIPE_WEBHOOK_SECRET"))) invalid.push("STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret.");
for (const name of ["STRIPE_MEMBER_PRICE_ID", "STRIPE_PREMIUM_PRICE_ID"]) {
  if (value(name) && !/^price_\S+$/.test(value(name))) invalid.push(`${name} must be a Stripe Price ID.`);
}

const exposedSecrets = Object.keys(process.env).filter((name) => /^NEXT_PUBLIC_.*(?:SECRET|PRIVATE|WEBHOOK|CRON|YELP|STRIPE)/i.test(name));
if (missing.length || incompleteStripeVariables.length || invalid.length || exposedSecrets.length) {
  if (missing.length) console.error(`Missing production environment variables: ${missing.join(", ")}`);
  if (incompleteStripeVariables.length) console.error(`Incomplete Stripe configuration: ${incompleteStripeVariables.join(", ")}`);
  for (const message of invalid) console.error(message);
  if (exposedSecrets.length) console.error(`Secret variables must not use NEXT_PUBLIC_: ${exposedSecrets.join(", ")}`);
  process.exit(1);
}

console.log("Production configuration shape preflight passed. Stripe and Yelp are optional; it does not verify provider credentials or live services.");
