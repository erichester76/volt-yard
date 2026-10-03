# Vercel Deployment Checklist

1. Apply all `supabase/migrations` in timestamp order before deploying application code.
2. Set every variable in `.env.example` in Vercel. Never expose secret, Stripe, cron, or provider keys as `NEXT_PUBLIC_*` variables.
3. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin and add it to Supabase Auth redirects and Stripe Checkout configuration.
4. Register the Stripe events listed in `.env.example` at `/api/stripe/webhook`. Keep the endpoint publicly reachable. It returns HTTP 500 when fulfillment fails so Stripe retries from the durable event ledger.
5. Vercel Cron calls `/api/catalog/sync` using `CRON_SECRET`; manual import and sync calls require that same bearer secret.
6. Verify `shop-images` is private after the migration. Published images are read through short-lived signed URLs; application uploads remain private until approval.
7. Before releases run `npm audit --omit=dev`, `npm run build`, and a duplicate checkout request using the same `Idempotency-Key`.

The EPA ZIP importer has size limits and a timeout, but still uses a Vercel function. Monitor duration and memory; move ingestion to a queued worker if the source dataset grows. Installer and expert payouts are recording workflows only and do not initiate transfers.
