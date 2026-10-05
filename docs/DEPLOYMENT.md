# Deployment Runbook

Volt Yard is deployed as a Next.js application on Vercel with Supabase as its backend. Migrations must be available before application code that depends on them.

## Release Procedure

1. Run the repository checks:

   ```sh
   npm run check:migrations
   npm test
   npm audit --omit=dev
   npm run build
   ```

2. Review the pending SQL, then compare local history with the linked non-production or production target before applying anything:

   ```sh
   supabase migration list --linked
   ```

   `npm run check:migrations` validates checked-in filename format and duplicate timestamps only. It cannot establish remote migration status. Apply pending migrations in timestamp order, confirm the resulting history, and verify PostgREST has refreshed its schema. Migrations that alter API-visible schema should issue `notify pgrst, 'reload schema';`; run the notification manually only when needed. The current latest checked-in migration is `20261004000006_update_home_try_cta.sql`.
3. In Vercel Production, set the required Supabase, app-origin, Google, and cron variables in `.env.example`. `YELP_API_KEY` is required only for Yelp imports. Stripe is an all-or-nothing integration: set its secret, webhook secret, and both Price IDs before enabling checkout or memberships. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin without a path or trailing slash. Run `npm run preflight:production` in a controlled environment with production-shaped values; it validates names and value formats only and does not contact any provider.
4. In Supabase **Auth > URL Configuration**, set **Site URL** to the exact `NEXT_PUBLIC_APP_URL`. Add `https://YOUR_PRODUCTION_DOMAIN/**` to **Redirect URLs**, plus `http://localhost:3000/**` for local development. Explicitly allow only approved preview origins if previews use authentication.
5. Deploy to a preview and exercise authentication, public directory search, image access, and a role-appropriate protected action. Promote only the approved production deployment.
6. Send a production magic link and confirm it returns to the production domain. If it returns to Site URL instead, verify the exact callback origin is present in Redirect URLs.

`npm run build` invokes `check:deployment`. In a Vercel production build it requires core platform configuration, rejects recognized server secrets named `NEXT_PUBLIC_*`, and rejects a partial Stripe configuration. CI runs the same preflight using non-secret fixture values.

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
| Membership plans | `STRIPE_MEMBER_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID` |
| Membership Billing Portal (optional) | `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` |

All values in this table are server-only. Do not place them in `NEXT_PUBLIC_*` variables, browser code, screenshots, logs, or repository files. Each integration returns an error rather than silently running without its required configuration.

## Stripe

1. Create a Stripe webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook`.
2. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
3. Store its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Keep the endpoint publicly reachable and do not introduce middleware that consumes the request body before signature verification.
5. Test a valid event and a duplicate event. The application records events in `stripe_event_ledger`, ignores already processed events, and returns HTTP 500 when processing fails so Stripe can retry.

6. Create recurring Stripe Prices for Member and Premium, and set their IDs in `STRIPE_MEMBER_PRICE_ID` and `STRIPE_PREMIUM_PRICE_ID`.
7. Optionally create a Billing Portal configuration that allows subscription cancellation and plan changes, then set `STRIPE_BILLING_PORTAL_CONFIGURATION_ID`. Without it, the application uses server-mediated plan changes and schedules cancellation at the current billing-period end.
8. Checkout and membership routes require a caller-provided `Idempotency-Key` header containing 16-128 URL-safe characters. The browser client supplies one for every Checkout request.

## Vercel And Google

1. Confirm the production domain is assigned, HTTPS is active, and Vercel Production environment variables are scoped to Production rather than Preview.
2. Confirm `vercel.json` still schedules `/api/catalog/sync` at the intended cadence. Invoke the protected route manually only with `CRON_SECRET`; verify the Vercel cron invocation after release.
3. Restrict `GOOGLE_MAPS_API_KEY` to the production domain/server workloads as appropriate, enable Geocoding API and Places API (New), and verify a location search and autocomplete request. Restrict and verify the Yelp key if partner imports will be used.
4. Do not put server-only values in Vercel build logs, preview variables, browser bundles, issue attachments, or release notes.

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

## Rollback

1. Stop promotion and disable affected Vercel routes or provider integrations when a security, payment, or data-integrity issue is detected.
2. Redeploy the last known-good Vercel production deployment. Confirm its environment-variable scope and build identifier before promoting it.
3. Do not roll back Supabase by editing or deleting migration history. Use a new corrective migration, or perform a reviewed database restore when the incident requires it.
4. For Stripe incidents, disable the affected webhook endpoint or payment Price in Stripe as appropriate, retain `stripe_event_ledger`, and reconcile any events received during the incident before re-enabling traffic.
5. Record the incident, affected release/build identifier, migrations, provider actions, data repair, and re-release verification.

## Current Operational Limits

- Payouts are recorded manually after external payment. No transfer is sent through Stripe Connect.
- Vehicle telemetry is not integrated; `external_context` is reserved for future use.
- Submitted shop images remain private by policy, but the current admin review page uses public image URLs. Validate/fix private preview behavior without making the bucket public.
- There is no checked-in local Supabase or seed configuration, so validate migrations and RLS in a non-production Supabase project before production.
