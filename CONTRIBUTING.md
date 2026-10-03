# Contributing

## Workflow

1. Create or select a GitHub issue.
2. Branch from updated `main` using `feat/<issue>-summary`, `fix/<issue>-summary`, or `chore/<issue>-summary`.
3. Make focused changes and include migrations when database changes are required.
4. Run `npm test` and `npm run build`.
5. Open a pull request that links the issue and uses the PR template.
6. Merge only after CI passes and review is complete.

Never commit `.env` files, production secrets, or direct database credentials. Apply schema changes through versioned Supabase migrations, not application startup code.

## Releases

Use semantic versioning in `package.json`:

- Patch: fixes and small safe improvements
- Minor: backwards-compatible functionality
- Major: breaking workflows or contracts

Each merge to `main` creates a Vercel deployment. Apply corresponding Supabase migrations before or alongside the deployment according to the deployment checklist.
