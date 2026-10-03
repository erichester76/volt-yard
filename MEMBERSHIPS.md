# Membership and issue workflow MVP

1. Apply `supabase/migrations/20261002000005_add_memberships_and_issue_workflow.sql` after the existing migrations.
2. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Set `NEXT_PUBLIC_APP_URL` for a custom domain or non-Vercel production deployment; Vercel production otherwise derives the deployment origin from `VERCEL_URL`. Register `/api/stripe/webhook` for the events listed in `.env.example`.
3. Stripe Checkout sends subscription metadata to `customer.subscription.created`/updated webhooks, which update `membership_subscriptions` and the profile tier. The admin page at `/admin/memberships` provides a demo/admin tier override and records manual expert payouts.
4. User workflow: `/membership`, `/issues`, `/issues/[id]`, `/community`, and `/expert-work`. A community thread can start an issue case via its action; the linked topic and complete case snapshot are retained when service is requested.
5. `external_context` is the intentionally empty placeholder for a future vehicle/telemetry integration. Tessie is not included.

RLS limits cases, subscriptions, entitlements, and service snapshots to their owner; shop owners can claim expert work and see only claimed case context. Admins manage memberships and payout records. State-changing expert and service transitions use security-definer RPCs with authenticated ownership checks.
