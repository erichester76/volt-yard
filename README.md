# Amped Up Network

Amped Up Network is a Next.js application for finding independent EV service partners and coordinating EV ownership help. It is an independent platform and certification brand, not Amped Up Electric Garage; the garage is a founding independent partner. The current MVP includes a searchable partner directory, administrator-reviewed partner profiles, a services catalog and Stripe Checkout integration, customer issue cases, memberships, a moderated community, expert-response opportunities, and partner work queues.

The product is backed by Supabase Auth, Postgres, Storage, and Row Level Security (RLS). Vercel is the checked-in deployment target.

## Product Scope

- Visitors can locate published partners by browser location or a server-backed Google Places city, ZIP, or address selection, then filter by vehicle, capability, partner type, and radius. Manual submit falls back to geocoding.
- Account holders can save vehicles, create issue cases, use issue pathways, and request a service-case snapshot.
- Partners submit profile changes and images for administrator approval. Only approved published profiles appear in the directory.
- Administrators review partner submissions, manage catalog and community data, moderate member contributions, assign demo membership tiers, and record expert payouts.
- Paid members can submit community topics and replies; Member and Premium users can vote. Premium users can create paid expert opportunities.
- The catalog supports carts and server-side Stripe Checkout order creation. A paid webhook converts the cart and offers matching requests to eligible published partners.

See [DESIGN.md](DESIGN.md) for journeys, information architecture, roles, and architecture boundaries. See [Commerce](docs/COMMERCE.md), [Memberships](docs/MEMBERSHIPS.md), [Deployment](docs/DEPLOYMENT.md), and [Release notes](docs/RELEASE_NOTES.md) for operational detail.

## Localization

Public pages are locale-prefixed: `/en`, `/de`, `/fr`, and `/es`. Requests to an unprefixed page redirect to the saved `volt-yard-locale` cookie or to the first supported browser language, falling back to English. The language control changes the cookie and retains the current route. Locale-prefixed routes are the indexable URLs; unprefixed URLs redirect and therefore are not competing canonical content.

Selected authored copy lives in `public.localized_content`, seeded by `20261003000002_add_localized_content.sql` and rebranded by `20261008000002_rebrand_localized_content_to_amped_up_network.sql`. Administrators edit and publish it at `/[locale]/admin/translations`; each locale route reads only published entries during server rendering and uses the embedded English fallback when a key is unpublished or unavailable. RLS permits public reads only for published entries and administrator-managed writes; trusted server work uses the service role. Content keys are stable contracts, not user-facing text. Locale-prefixed pages set their document language and publish locale-specific canonical and hreflang alternate metadata.

Localization is currently selective: it covers site navigation, all authored shared footer copy except the version/build identifier, the landing-page hero and pathway panels, and designated eyebrow/title copy on the issues, catalog, community, membership, partner portal, and admin pages. It does not yet translate the rest of the page UI, forms, validation and status messages, checkout/account flows, or other hard-coded interface text. It also intentionally does not translate user-generated community posts or issue cases, shop/product/category/capability records, user profile data, proper names, addresses, vehicle makes/models, warning codes, prices, dates supplied by users, or other technical identifiers. Dynamic records need their own editorial localization workflow before they can be translated safely.

## Prerequisites

- Node.js 24, matching CI.
- npm.
- A Supabase project with Email Auth enabled.
- A Google Cloud project with Geocoding API and Places API (New) enabled for location search and Google partner imports.
- Stripe test or live credentials for commerce and memberships.

The repository does not include a Supabase local-development configuration or seed file. Local application development normally uses a configured Supabase project; schema changes remain versioned SQL migrations.

## Local Development

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Create `.env.local` from `.env.example` and set at least:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Apply every file in `supabase/migrations/` to the target Supabase database in lexicographic timestamp order. Use the Supabase CLI against a linked project or the Supabase SQL editor. Do not apply migrations by copying application code into the database and do not reorder, edit, or delete an already-applied migration.

4. In Supabase Auth, enable Email and Email/password, enable email confirmation if desired, then open **Auth > URL Configuration**. Set **Site URL** to the canonical production HTTPS origin (not `localhost`), and add `http://localhost:3000/**` to **Redirect URLs** for local development. Add `https://YOUR_PRODUCTION_DOMAIN/**` before testing confirmation, password-reset, or magic-link email flows in production.

5. Start the app:

   ```sh
   npm run dev
   ```

The directory is visible only when the public Supabase variables are present. Server integrations fail closed when their own credentials are absent.

## Environment Variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | application | Public Supabase URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | application | Browser-safe Supabase publishable key. |
| `SUPABASE_SECRET_KEY` | server-side catalog sync, imports, checkout, Stripe webhooks | Server-only Supabase secret key. |
| `NEXT_PUBLIC_APP_URL` | canonical production origin and server-side return URLs | Required Vercel production configuration. Set the canonical HTTPS origin, with no path or trailing slash; local default is `http://localhost:3000`. Browser auth always uses the current browser origin. |
| `GOOGLE_MAPS_API_KEY` | `/api/geocode`, `/api/places/autocomplete`; Google imports | Server-only. Enable Geocoding API and Places API (New). |
| `YELP_API_KEY` | Yelp imports | Server-only. |
| `CRON_SECRET` | catalog sync and partner imports | Sent as `Authorization: Bearer <secret>`. |
| `STRIPE_SECRET_KEY` | service and membership Checkout; webhook verification | Server-only. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Server-only endpoint signing secret. |
| `STRIPE_MEMBER_PRICE_ID` | Member membership Checkout and server-mediated changes | Server-only recurring Stripe Price ID. |
| `STRIPE_PREMIUM_PRICE_ID` | Premium membership Checkout and server-mediated changes | Server-only recurring Stripe Price ID. |
| `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` | optional membership self-service | Server-only Billing Portal configuration; enables plan changes and cancellation in Stripe. |

Never prefix server secrets with `NEXT_PUBLIC_`, commit `.env*` files, or expose a Supabase secret key to browser code.

## Database Migrations

`supabase/migrations/` is the schema history and must be treated as append-only once deployed. The latest migration is `20261008000002_rebrand_localized_content_to_amped_up_network.sql`; it updates existing editable public copy while preserving stable content keys and English fallbacks in the application.

Before applying to a shared environment:

1. Review the SQL and its RLS, trigger, RPC, and data-backfill effects.
2. Apply pending files in timestamp order with the same migration tool used by the environment.
3. Confirm the migration history and reload PostgREST schema when the migration does not already issue `notify pgrst, 'reload schema';`.
4. Deploy code that depends on the schema only after the schema is available.
5. Exercise the affected user journey with an appropriate authenticated role.

Do not use application startup to change schema. For a corrective change, add a new migration; do not rewrite migration history that may have been applied.

## Testing And Build

```sh
npm test
npm run check:migrations
npm run build
```

`npm test` runs Node tests for request validation and the geocoding route's fail-closed behavior. `npm run check:migrations` validates local migration filename integrity, not remote status. `npm run build` runs the deployment configuration check and `next build`. The production configuration preflight runs when `VERCEL_ENV=production`, or explicitly with `npm run preflight:production`; it requires core platform configuration, validates safe value shapes, rejects partial Stripe configuration, and rejects recognized secrets named `NEXT_PUBLIC_*`. Yelp and the complete Stripe group are optional. It does not validate credentials or live services.

CI runs migration integrity and production configuration preflight with non-secret fixture values, then `npm test` and `npm run build` on pull requests and pushes to `main`.

## Deployment

Vercel deploys this Next.js application. `vercel.json` schedules `GET /api/catalog/sync` monthly at `06:00 UTC` on the first day of the month. The route imports EPA FuelEconomy vehicle records for the current year and the preceding 19 years by default.

Follow [Deployment](docs/DEPLOYMENT.md) before a release. In short: apply migrations, configure Vercel and Supabase Auth origins, configure the Stripe webhook, validate production configuration, and run tests and a production build.

## Known MVP Limits And Risks

- Installer and expert payouts are recorded manually. No Stripe Connect transfer or other automated payout is implemented.
- `issue_cases.external_context` is reserved for a future vehicle or telemetry integration. Tessie is not integrated.
- The EPA importer runs in a Vercel function with a 60-second maximum duration and archive/CSV size limits. If the source grows or imports become unreliable, move ingestion to a queued worker.
- Catalog synchronization and partner import routes are authenticated machine endpoints; they have no administrator UI. The current import payload omits the required `partner_type_id`, so imports need correction and environment-level verification before they can be used as draft ingestion.
- The admin review page uses public image URLs even though `shop-images` is intentionally private. Submitted-image preview needs validation/correction without weakening the Storage policy.
- Tests cover selected validation and fail-closed paths only. They do not provide end-to-end coverage for Supabase RLS, Stripe webhooks, partner approval, or payment fulfillment.
