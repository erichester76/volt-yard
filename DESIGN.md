# Volt Yard Design

## Product Intent

Volt Yard helps EV owners get from an observed problem to an appropriate form of help: learn, compare community experience, request paid expert input, find a local independent partner, or purchase a managed service. It also gives partners an approval-gated presence and a matched work queue.

The product does not diagnose vehicles automatically, book appointments, dispatch work, integrate vehicle telemetry, or transfer partner payouts.

## Information Architecture

| Area | Routes | Purpose |
| --- | --- | --- |
| Discovery | `/`, `/shops/[id]` | Search and inspect published EV partners. |
| Diagnosis | `/issues`, `/issues/[id]` | Create and continue a customer-owned issue case. |
| Learning | `/journal`, `/tutorials`, `/release-notes`, `/library/[slug]` | Display published editorial resources from Supabase. |
| Community | `/community`, `/community/[slug]` | Read published topics; paid members submit moderated contributions and vote. |
| Membership | `/membership`, `/profile` | View tier, subscribe, manage display name, and maintain a saved garage. |
| Commerce | `/catalog`, `/cart`, `/checkout/success` | Browse catalog, manage a cart, and begin Stripe Checkout. |
| Partner | `/portal`, `/installer/work`, `/expert-work` | Submit an approved partner profile, claim matched managed-service work, and respond to expert opportunities. |
| Administration | `/admin`, `/admin/catalog`, `/admin/community`, `/admin/memberships` | Review partners, manage catalog/community data, moderate contributions, and record administrative membership/payout actions. |

The header prioritizes Diagnose, Shops, Services & upgrades, and Community. Account navigation exposes role-appropriate destinations but server/database authorization remains authoritative.

## Roles And Access

| Role | Primary capabilities | Enforcement |
| --- | --- | --- |
| Visitor | Browse published partners, resources, catalog, and moderated community content. | Public RLS reads and bounded directory RPCs. |
| Customer | Authenticate, maintain a profile and garage, create issue cases, manage cart, purchase supported services. | Auth plus owner-scoped RLS and server-side checkout validation. |
| Member | Customer capabilities plus community submission and voting. | `membership_tier` checks in RLS/RPCs. |
| Premium | Member capabilities plus creating paid expert opportunities. | Premium RLS policy. |
| Partner/shop owner | Submit a profile for review, view assigned jobs, claim eligible managed-service jobs, claim expert work. | Owner-scoped RLS and security-definer claim RPCs. |
| Administrator | Approve/reject partner changes, manage catalog and community records, manage memberships and payout records. | `profiles.is_admin`, admin RLS policies, and administrative RPCs. |

Partner eligibility for managed-service claims additionally requires a published shop and non-expired insurance where an expiration is supplied.

## Key User Journeys

### Find A Partner

1. A visitor grants browser location or submits city, state, or ZIP.
2. Text locations go through `/api/geocode`; browser coordinates are used directly.
3. The home page calls the bounded `nearby_shops` RPC with filters and a maximum of 50 results.
4. Only published partners with coordinates can be returned. Visitors can open a public profile and use listed contact methods.

### Submit And Approve A Partner Profile

1. An authenticated owner completes `/portal`, selects partner type, capabilities, supported vehicles, credentials, and optional photos.
2. The portal uploads application images to the private `shop-images` bucket under the owner namespace and creates a pending `shop_change_requests` record.
3. An administrator reviews the request in `/admin` and invokes approve or reject RPCs.
4. Approval creates or updates the owner's shop and its approved relations, then publishes it. Direct owner writes do not publish the live profile.

### Diagnose An Issue

1. A signed-in customer selects a catalog vehicle, describes the symptoms, and creates an owned issue case.
2. The case preserves its vehicle tuple and can record pathway events for search, DIY, community, service, or expert help.
3. The customer may create one service-case snapshot or, with Premium membership, create a paid expert opportunity.
4. A shop owner can atomically claim an open expert opportunity and submit a response. The resulting payout job is recorded for administrator handling.

### Participate In Community

1. Anyone can read published or locked topics in active categories.
2. Member and Premium users submit topics and replies as `pending`.
3. An administrator publishes, hides, locks, or annotates contributions. Topics automatically pin at score `+10` unless an administrator overrides the pin state.
4. Member and Premium users vote through `community_set_vote`, which derives the voter from the authenticated session.
5. A topic can seed an issue case; the source topic and a service-case context snapshot are retained.

### Purchase And Fulfill A Managed Service

1. A signed-in customer adds active catalog products to a cart and may provide a vehicle, location, and notes.
2. The server validates the access token, cart ownership, product state, vehicle compatibility, bounded text, and idempotency key before atomically creating an order and service-request snapshots.
3. Stripe Checkout accepts payment. A verified, ledger-deduplicated webhook marks the order paid and converts the cart.
4. Database logic creates offers for compatible published partners. An eligible shop owner accepts the versioned managed-service agreement through `accept_installer_job`; the operation locks the job and withdraws competing offers.
5. Finance/admin records a completed external or manual installer payout. The system does not initiate the transfer.

The current cart UI does not send the required `Idempotency-Key`, so this journey cannot complete from the checked-in browser client until that gap is fixed.

## Design System

- **Voice:** practical, calm, direct, and EV-specific. The UI uses action-led language such as “Diagnose,” “Find a mechanic,” and “Submit for review.” Avoid implying a confirmed diagnosis, appointment, guaranteed match, or automated payout.
- **Visual language:** the existing `globals.css` defines the visual system. Reuse its typography, spacing, cards, eyebrow labels, inline calls to action, forms, status/error messaging, light/dark theme behavior, and responsive patterns rather than introducing a disconnected component system.
- **Interaction:** retain native form controls, visible loading/error states, accessible labels, and concise success messages. Destructive or workflow-changing actions require deliberate labeled buttons and should surface backend errors.
- **Content states:** distinguish unavailable configuration, empty catalog/community/directory results, pending moderation/review, and authorization failures. Do not substitute sample data for live failures.

## Architecture Boundaries

| Boundary | Responsibility |
| --- | --- |
| Next.js client pages | Presentation, browser auth session use, low-risk public/owner queries permitted by RLS, and user feedback. |
| Next.js route handlers | Server-only integrations: Google geocoding, EPA synchronization, provider imports, Stripe Checkout, webhook verification. Validate requests before external calls. |
| Supabase Auth | Email/password and email-link identity/session management. |
| Supabase Postgres | Core data, RLS authorization, immutable price/context snapshots, workflow triggers, and atomic security-definer RPCs. |
| Supabase Storage | Private partner application and published shop imagery served by signed URLs. |
| Stripe | Hosted payment/subscription Checkout and signed event delivery. Stripe is authoritative for Stripe subscription lifecycle events. |
| External data providers | EPA FuelEconomy vehicle catalog; Google geocoding/Places, Yelp, and Overpass only for authorized import/search paths. |
| Vercel | Next.js runtime, production deployment, and monthly vehicle-catalog cron. |

Do not move authorization decisions from database policy/RPCs into the client. Do not call Supabase with `SUPABASE_SECRET_KEY` from browser code. Do not allow external-provider responses to publish partner listings without the established review path.

## Deferred Items And Risks

- Tessie and all vehicle telemetry integrations are deferred. `external_context` intentionally remains a placeholder.
- Installer and expert payouts are bookkeeping workflows only; there is no Stripe Connect or automated money movement.
- The membership checkout UI has the same missing `Idempotency-Key` header as the service checkout UI, so its browser flow is also blocked by server validation.
- Partner imports are machine-authorized API operations with no import-management UI. Their current payload omits required `partner_type_id`, so the path needs correction and environment-level verification before use.
- Shop images are intentionally private, but the current admin review page requests public image URLs. Preserve the private bucket and correct the preview path rather than weakening Storage policy.
- The EPA import is constrained by Vercel duration and memory limits. A queue/worker is the appropriate future boundary if the source dataset outgrows those constraints.
- Current automated coverage is limited to validation and geocoding fail-closed cases. RLS, payment, webhook, and end-to-end role workflows require environment-level testing.
