# Agent And Contributor Guide

## Repository Conventions

- Use TypeScript and the existing Next.js App Router structure in `app/`. Keep browser components explicitly marked with `"use client"`; keep server credentials in route handlers or server-only modules.
- Use `@/` imports where the existing code does. Preserve the repository's strict TypeScript settings.
- Prefer focused changes. Do not add a dependency, compatibility layer, abstraction, or new product workflow without a concrete requirement.
- Follow the established UI vocabulary in `app/globals.css` and existing page patterns. Preserve responsive behavior and accessible labels, status messages, and keyboard-operable controls.
- Update the relevant primary documentation when changing behavior, environment requirements, migrations, deployment, commerce, memberships, or design boundaries.

## Data And Security

- Treat Supabase Postgres, RLS policies, Storage policies, and security-definer RPCs as part of the application authorization boundary. Do not replace an RPC or RLS-backed flow with a browser-side authorization check.
- Browser code uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SECRET_KEY`, Stripe keys, `CRON_SECRET`, and provider keys are server-only.
- Do not commit `.env`, `.env.local`, credentials, webhook payloads, production exports, or personally identifying test data.
- Validate route input at the boundary. Preserve existing limits, UUID validation, canonical-origin handling, authorization checks, and idempotency behavior.
- Verify Stripe webhook signatures from the raw request body. Keep webhook deduplication through `stripe_event_ledger`, and return non-2xx when fulfillment processing must be retried.
- Keep `shop-images` private. Published image access is through Storage signed URLs; do not make the bucket public or expose pending application images.
- Do not weaken headers in `next.config.ts`, RLS, grants, function `search_path`, or security-definer ownership checks without a reviewed security reason.

## Database Migrations

- Add one new, timestamp-prefixed SQL file under `supabase/migrations/` for every persistent schema, RLS, RPC, trigger, enum, or data migration change.
- Migrations are append-only after application. Do not edit, rename, reorder, or delete deployed migration files. Make corrective work a new migration.
- Design migrations for both new and populated environments. Include necessary backfills, compatible policy replacement, indexes, grants/revokes, and `notify pgrst, 'reload schema';` when API schema changes need it.
- Review public callable functions especially carefully: validate input bounds, set an explicit safe `search_path`, minimize projections, and grant only the necessary roles.
- Apply and verify migrations before code that requires them. Document migration dependencies in the PR and affected runbook.

## Branches And Pull Requests

- Start from updated `main` and use `feat/<issue>-summary`, `fix/<issue>-summary`, or `chore/<issue>-summary`.
- Keep a branch and PR focused on one outcome. Link its GitHub issue and use `.github/pull_request_template.md`.
- Describe user-visible behavior, schema/data effects, environment changes, rollout order, rollback or mitigation, and tests run.
- Do not merge until CI passes and required review is complete. Merging to `main` triggers a Vercel deployment.
- Use semantic versioning in `package.json`: patch for safe fixes, minor for backwards-compatible features, major for breaking contracts or workflows.

## Verification

Run before opening a PR:

```sh
npm test
npm run build
```

Also test the relevant authenticated role and failure path. For migration or authorization work, validate behavior against a disposable or non-production Supabase environment; unit tests alone do not validate RLS or SQL functions. For commerce work, test Stripe webhooks with the Stripe CLI and exercise duplicate requests using the same valid `Idempotency-Key`.

## Operational Constraints

- Payout records are administrative/manual only. Do not claim automated transfers or add Stripe Connect assumptions to product copy.
- Telemetry integrations are deferred; `external_context` is a placeholder and Tessie is not present.
- The Vercel EPA importer is bounded but runs in a serverless function. Preserve its authorization, size limits, and timeout awareness.
- The repository has no checked-in local Supabase configuration or seed data. Do not imply that `supabase start` is a supported local setup without adding and documenting that infrastructure.
