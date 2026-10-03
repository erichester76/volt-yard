# Deployment Runbook

Volt Yard is deployed as a Next.js application on Vercel with Supabase as its backend. Migrations must be available before application code that depends on them.

## Before Deployment

1. Review all pending files in `supabase/migrations/` and apply them to the target project in timestamp order. The current latest migration is `20261003000001_bound_directory_rpc_results.sql`.
2. Confirm PostgREST has refreshed its schema after the migration. Migrations that alter API-visible schema should issue `notify pgrst, 'reload schema';`; run the notification manually only when needed.
3. In Vercel production, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Immediately set `NEXT_PUBLIC_APP_URL` in Vercel Production to the canonical HTTPS origin without a path or trailing slash. This is the required reliable production configuration for Checkout return URLs and origin validation. As a constrained fallback, Vercel origins use `VERCEL_PROJECT_PRODUCTION_URL` when available and the exact `VERCEL_URL`; request Host and arbitrary origins are never trusted. Geocoding accepts the canonical origin and those exact Vercel origins.
5. In Supabase Auth, configure the production origin and applicable return URLs for confirmation, password reset, and email-link sign-in.
6. Run:

   ```sh
   npm test
   npm audit --omit=dev
   npm run build
   ```

`npm run build` invokes `check:deployment`. In a Vercel production build it requires the public Supabase values and fails when recognized server secrets use a `NEXT_PUBLIC_*` name. Preview and local builds skip that production-only gate.

## Server Integration Configuration

| Feature | Required configuration |
| --- | --- |
| Server-side Supabase actions | `SUPABASE_SECRET_KEY` |
| Text location search and autocomplete | `GOOGLE_MAPS_API_KEY` with Geocoding API and Places API (New) |
| Google partner import | `GOOGLE_MAPS_API_KEY` with Places API (New) |
| Yelp partner import | `YELP_API_KEY` |
| EPA vehicle synchronization and protected imports | `CRON_SECRET` |
| Service Checkout and memberships | `STRIPE_SECRET_KEY` |
| Stripe webhook verification | `STRIPE_WEBHOOK_SECRET` |

All values in this table are server-only. Do not place them in `NEXT_PUBLIC_*` variables, browser code, screenshots, logs, or repository files. Each integration returns an error rather than silently running without its required configuration.

## Stripe

1. Create a Stripe webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook`.
2. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
3. Store its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Keep the endpoint publicly reachable and do not introduce middleware that consumes the request body before signature verification.
5. Test a valid event and a duplicate event. The application records events in `stripe_event_ledger`, ignores already processed events, and returns HTTP 500 when processing fails so Stripe can retry.

Checkout and membership routes require a caller-provided `Idempotency-Key` header containing 16-128 URL-safe characters. The checked-in browser clients currently omit this header, so production checkout requires that client gap to be corrected and verified before it can be used.

## Scheduled And Manual Operations

- Vercel Cron invokes `GET /api/catalog/sync` at `06:00 UTC` on the first day of every month. It sends Vercel's cron authorization; configure `CRON_SECRET` consistently with the route's bearer-token requirement if invoking it manually.
- For manual catalog sync or partner import, send `Authorization: Bearer $CRON_SECRET`. The catalog route accepts a single `year` or `startYear`/`endYear` range. The import endpoint accepts Google, Yelp, or Overpass inputs, but its current payload omits required `partner_type_id`; correct and verify that path before operational use.
- Monitor EPA synchronization for function duration, memory, archive size, and source failures. The route permits a 25 MB ZIP, 150 MB CSV, and 60-second execution window.

## Release Checks

1. Verify public directory search and shop details return only published data.
2. Verify partner application approval and private image behavior.
3. Verify an authenticated customer, a paid member, a Premium member, a partner, and an administrator each see only their intended data/actions.
4. Verify Stripe webhook signature rejection, successful payment fulfillment, duplicate-event handling, and a duplicate checkout request with the same idempotency key.
5. Verify the footer version/build identifier is expected. It exposes only package semver and a validated truncated Git SHA from Vercel or GitHub, otherwise `local`.

## Current Operational Limits

- Payouts are recorded manually after external payment. No transfer is sent through Stripe Connect.
- Vehicle telemetry is not integrated; `external_context` is reserved for future use.
- Submitted shop images remain private by policy, but the current admin review page uses public image URLs. Validate/fix private preview behavior without making the bucket public.
- There is no checked-in local Supabase or seed configuration, so validate migrations and RLS in a non-production Supabase project before production.
