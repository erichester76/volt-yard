# Vercel Deployment Checklist

1. Apply all `supabase/migrations` in timestamp order before deploying application code, including `20261003000001_bound_directory_rpc_results.sql`.
2. Production builds require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never expose secret, Stripe, cron, or provider keys as `NEXT_PUBLIC_*` variables.
3. Configure each server integration before using its route: `SUPABASE_SECRET_KEY` for admin routes, `CRON_SECRET` for scheduled/manual imports, `GOOGLE_MAPS_API_KEY` for geocoding and Google imports, `YELP_API_KEY` for Yelp imports, and both Stripe keys for checkout and webhooks. Missing integrations fail closed at runtime.
4. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin without a path or trailing slash for a custom domain or non-Vercel production deployment, then add it to Supabase Auth redirects and Stripe Checkout configuration. On Vercel production it may be omitted: Checkout derives `https://$VERCEL_URL` safely.
5. Register the Stripe events listed in `.env.example` at `/api/stripe/webhook`. Keep the endpoint publicly reachable. It returns HTTP 500 when fulfillment fails so Stripe retries from the durable event ledger.
6. Vercel Cron calls `/api/catalog/sync` using `CRON_SECRET`; manual import and sync calls require that same bearer secret.
7. Verify `shop-images` is private after the migration. Published images are read through short-lived signed URLs; application uploads remain private until approval.
8. Production builds run `npm run check:deployment` automatically. It fails only when required public Supabase configuration is missing or a recognized secret is named `NEXT_PUBLIC_*`. Preview and local builds skip this production-only gate.
9. Before releases run `npm test`, `npm audit --omit=dev`, `npm run build`, and a duplicate checkout request using the same `Idempotency-Key`.
10. The shared footer displays the package semver and a public build identifier. Vercel uses `VERCEL_GIT_COMMIT_SHA`; GitHub builds use `GITHUB_SHA`; other builds display `local`. Only a validated, truncated Git SHA is exposed to the browser.

The EPA ZIP importer has size limits and a timeout, but still uses a Vercel function. Monitor duration and memory; move ingestion to a queued worker if the source dataset grows. Installer and expert payouts are recording workflows only and do not initiate transfers.
