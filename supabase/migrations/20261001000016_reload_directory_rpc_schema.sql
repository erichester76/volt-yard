-- Ensure PostgREST immediately sees the directory RPC signatures from the prior migration.
-- This is especially important when migrations are applied after the frontend deploy.
notify pgrst, 'reload schema';
