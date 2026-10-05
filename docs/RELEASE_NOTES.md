# Release Notes

## 1.0.0 - First MVP release

Volt Yard 1.0.0 is the first MVP release of the EV service-partner directory and ownership-support application.

- Includes the searchable partner directory, account and vehicle profiles, issue cases, partner workflows, catalog checkout, memberships, community, and expert-work foundations.
- Uses Supabase Auth, Postgres, Storage, and RLS with Vercel as the deployment target.
- Adds release safeguards: production configuration preflight, local migration-history integrity checking, deterministic CI fixtures, and documented release and rollback procedures.

This release does not assert that any production provider, migration target, webhook, scheduler, DNS configuration, or credential has been validated. Complete the external checks in [Deployment](DEPLOYMENT.md) before promotion.
