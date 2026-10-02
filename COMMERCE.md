# Commerce MVP setup

1. Apply `supabase/migrations/20261002000000_add_commerce.sql` and `supabase/migrations/20261002000001_replace_finder_fee_with_managed_fulfillment.sql` after the existing directory migrations.
2. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` from `.env.example` to the deployment environment. The two Stripe keys are server-only.
3. In Stripe, register `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then use its signing secret for `STRIPE_WEBHOOK_SECRET`.
4. For local webhook testing, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the printed signing secret.

Catalog pricing and the pre-negotiated installer payout are always loaded server-side from Supabase before creating Stripe Checkout. The customer pays the retail service price; the order, request, and installer job snapshot the retail amount, payout, and Volt Yard margin. A verified webhook marks the order paid, converts its cart, then offers each request to published shops compatible with its selected vehicle and service type. `accept_installer_job` is the only client-callable claim path; it locks the job, records the versioned managed service agreement, and records a pending payout obligation. Payouts are intentionally not sent through Stripe Connect. After an external/manual payout, an admin calls `record_installer_job_payout(job_id, payout_reference)` to record its reference and paid status without initiating a transfer.
