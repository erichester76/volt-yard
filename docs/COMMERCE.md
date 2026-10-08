# Commerce

## Scope

Amped Up Network sells active catalog services and upgrades through Stripe Checkout. It records retail price, installer payout, and platform margin snapshots when an order is created. After a verified payment webhook, compatible published partners receive work offers and one eligible partner may claim each request.

This is managed fulfillment, not a marketplace fee flow. Partner payouts are recorded manually and are not sent with Stripe Connect.

## Setup

1. Apply all Supabase migrations in timestamp order, including `20261003000000_security_hardening.sql` and `20261003000001_bound_directory_rpc_results.sql`.
2. Set server-only `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`.
3. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin for a custom domain or non-Vercel production deployment. Vercel production can derive an origin from `VERCEL_URL`.
4. Register `https://YOUR_DOMAIN/api/stripe/webhook` in Stripe for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, plus the subscription events listed in `.env.example` because this endpoint also processes memberships.
5. For local webhook testing, run:

   ```sh
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.

## Order And Fulfillment Flow

1. A signed-in customer creates an active cart and adds active catalog products.
2. `POST /api/checkout` authenticates the Supabase bearer token, validates the cart owner, selected vehicle compatibility, bounded location/notes fields, and an `Idempotency-Key` header.
3. `create_checkout_order` atomically creates the pending order and service-request snapshots. Product prices and payout values are read server-side.
4. The API creates or returns a Stripe Checkout Session. Stripe is the payment surface; card data never passes through the app.
5. A verified, ledger-deduplicated webhook marks a paid order paid. Database triggers convert the cart and create jobs for published partners whose capability and vehicle constraints match.
6. `accept_installer_job` locks the offer, verifies the claiming owner has an approved published shop and acceptable insurance status, stores the managed-service agreement version, and marks the payout obligation pending.
7. An administrator records an external/manual payout with `record_installer_job_payout(job_id, payout_reference)`. This updates the record only; it does not initiate a transfer.

## Catalog Administration

Administrators manage categories and products at `/admin/catalog`. A product has a retail price, an installer payout no greater than the retail price, an optional required capability, and optional vehicle compatibility rows. Empty vehicle compatibility means the product is not vehicle-restricted; matching still honors any selected vehicle and partner constraints.

Hide a product or category rather than relying on client-side visibility. Public catalog access is constrained by RLS to active products in active categories.

## Important Constraints

- Checkout requests require a unique 16-128 character URL-safe `Idempotency-Key`. Reusing a key for the same user returns the existing order rather than creating another one.
- The current `/cart` client does not send that required header. As checked in, browser-initiated service checkout is rejected until the client generates and sends it.
- Webhook processing returns retryable HTTP 500 on fulfillment errors and stores failure information in `stripe_event_ledger`.
- Do not expose Stripe or Supabase secret keys to the browser. Do not create orders or mark orders paid from client code.
- Service requests are not appointments. The current workflow offers eligible partners work; it does not implement scheduling or automated customer/partner messaging.
