# Memberships, Issues, And Expert Work

## Tiers

| Tier | Current application behavior |
| --- | --- |
| Free | Create issue cases, use issue pathways, save vehicles, and read community content. |
| Member | $9/month in the UI. Can submit moderated community topics/replies and vote. |
| Premium | $19/month in the UI. Includes Member capabilities and can create paid expert opportunities for owned issue cases. |

The marketing copy also describes persistent case history and priority service context. Authorization is implemented through `profiles.membership_tier` and related RLS/RPC checks; `membership_entitlements` exists in the schema but the current UI/workflows use the tier checks described above.

## Setup

1. Apply all migrations in timestamp order. The membership and issue schema begins in `20261002000005_add_memberships_and_issue_workflow.sql` and is hardened by later migrations.
2. Configure `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and an appropriate `NEXT_PUBLIC_APP_URL`.
3. Register `/api/stripe/webhook` for the Stripe events listed in `.env.example`.
4. Use `/admin/memberships` only for internal demo-tier overrides and recording expert payout records. Stripe webhook events remain the source of truth for Stripe-created and updated subscriptions.

## Membership Lifecycle

`POST /api/membership/checkout` creates a Stripe subscription Checkout Session for Member or Premium using server-defined monthly price data. Subscription event metadata identifies the requested tier and user. The verified webhook upserts `membership_subscriptions` and updates `profiles.membership_tier` to the paid tier only while the Stripe subscription is `active` or `trialing`; other statuses return the profile to Free.

The endpoint requires a valid bearer session and an `Idempotency-Key`. The checked-in membership page does not send the header, so its browser checkout action is currently rejected until the client is updated.

## Issue Workflow

1. A signed-in user selects a valid vehicle-catalog year/make/model, captures symptoms and optional warning codes, and creates an owned issue case at `/issues`.
2. The case detail page records navigation through search, DIY, and community pathways. It may create one service-case request that snapshots the complete case and optional source community topic.
3. A Premium owner can create an expert opportunity. Only a shop owner can claim it through an atomic RPC and submit an answer.
4. Answering creates an expert payout job. An administrator records payment manually; no transfer is initiated.

`external_context` is intentionally reserved for a future vehicle/telemetry integration. Tessie is not included.

## Community Workflow

- Public visitors read published and locked topics in active categories.
- Member and Premium users submit topics and replies as pending content.
- Administrators moderate contributions as published, hidden, or locked and can set a pin override. Otherwise topics pin automatically at score `+10`.
- Member and Premium users vote through the `community_set_vote` RPC. The RPC derives the voter from the authenticated session instead of trusting a client-provided user ID.

## Privacy And Authorization

RLS limits cases, subscriptions, garages, entitlements, service snapshots, and expert responses to their owners or assigned parties. Experts gain case access only after assignment. State-changing case, expert, community-vote, and service transitions use security-definer RPCs with authenticated ownership/role checks. Do not replace these with client-only checks or broad table permissions.
