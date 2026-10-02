-- Close MVP authorization gaps without expanding the product surface.
-- Tessie/telemetry remains intentionally represented only by external_context.

create or replace function public.update_my_profile(display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  update public.profiles
  set full_name = nullif(left(trim(display_name), 120), '')
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile(text) from public;
grant execute on function public.update_my_profile(text) to authenticated;

-- Community participation is a Member entitlement; reading remains public.
drop policy if exists "Members create community topics" on public.community_topics;
drop policy if exists "Members create community posts" on public.community_posts;
create policy "Paid members create community topics" on public.community_topics
for insert to authenticated with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and membership_tier in ('member', 'premium')
  )
);
create policy "Paid members create community posts" on public.community_posts
for insert to authenticated with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and membership_tier in ('member', 'premium')
  )
  and exists (
    select 1 from public.community_topics
    where id = topic_id and is_published
  )
);

-- Paid expert work is a Premium benefit, not merely a UI label.
drop policy if exists "Owners create expert opportunities" on public.expert_opportunities;
create policy "Premium owners create expert opportunities" on public.expert_opportunities
for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.issue_cases
    where id = case_id and owner_id = auth.uid()
  )
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and membership_tier = 'premium'
  )
);

-- Applications upload before a shop exists, so files are namespaced to the owner.
drop policy if exists "Owners upload shop images" on storage.objects;
drop policy if exists "Owners delete shop images" on storage.objects;
create policy "Owners upload shop application images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Owners delete shop application images" on storage.objects
for delete to authenticated using (
  bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
