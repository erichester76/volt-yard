-- Table privileges permit the roles to reach RLS; policies remain the authorization boundary.
alter table public.localized_content enable row level security;

revoke all on table public.localized_content from public;
revoke all on table public.localized_content from anon;
revoke all on table public.localized_content from authenticated;
revoke all on table public.localized_content from service_role;

-- Anonymous visitors can only reach the published-read policy.
grant select on table public.localized_content to anon;

-- The admin management policy gates authenticated writes and unpublished reads.
grant select, insert, update, delete on table public.localized_content to authenticated;

-- Trusted server work uses the service role, which bypasses RLS by design.
grant select, insert, update, delete on table public.localized_content to service_role;

notify pgrst, 'reload schema';
