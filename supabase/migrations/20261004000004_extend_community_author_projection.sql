-- Keep community author metadata limited to public-facing role labels.
create or replace view public.community_author_profiles
with (security_invoker = false) as
  select
    profile.id,
    nullif(trim(profile.full_name), '') as display_name,
    profile.membership_tier,
    partner.specialty as verified_partner_specialty
  from public.profiles profile
  left join lateral (
    select partner_type.name as specialty
    from public.shops shop
    join public.partner_types partner_type on partner_type.id = shop.partner_type_id
    where shop.owner_id = profile.id
      and shop.is_published
    order by shop.created_at, shop.id
    limit 1
  ) partner on true;

revoke all on public.community_author_profiles from public;
grant select on public.community_author_profiles to anon, authenticated;

notify pgrst, 'reload schema';
