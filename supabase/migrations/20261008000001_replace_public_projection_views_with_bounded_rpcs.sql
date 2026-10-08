-- Replace exposed SECURITY DEFINER views with bounded RPCs that expose the
-- same intentionally public projections without table-level browser access.
drop view if exists public.community_author_profiles;
drop view if exists public.public_shop_profiles;

create function public.community_author_profiles_for_ids(author_ids uuid[])
returns table (id uuid, display_name text, membership_tier public.membership_tier, verified_partner_specialty text)
language sql stable security definer set search_path = pg_catalog, public as $$
  select
    profile.id,
    nullif(trim(profile.full_name), ''),
    profile.membership_tier,
    partner.specialty
  from public.profiles profile
  left join lateral (
    select partner_type.name::text as specialty
    from public.shops shop
    join public.partner_types partner_type on partner_type.id = shop.partner_type_id
    where shop.owner_id = profile.id and shop.is_published
    order by shop.created_at, shop.id
    limit 1
  ) partner on true
  where profile.id = any(author_ids)
    and cardinality(author_ids) between 1 and 250;
$$;

create function public.public_shop_profile(shop_id uuid)
returns table (
  id uuid,
  name text,
  address text,
  city text,
  state text,
  phone text,
  website text,
  hours text,
  description text,
  bay_count smallint,
  years_in_business smallint,
  service_territory text,
  partner_type_name text
)
language sql stable security definer set search_path = pg_catalog, public as $$
  select
    shop.id,
    shop.name::text,
    shop.address::text,
    shop.city::text,
    shop.state::text,
    shop.phone::text,
    shop.website::text,
    shop.hours::text,
    shop.description::text,
    shop.bay_count,
    shop.years_in_business,
    shop.service_territory::text,
    partner_type.name::text
  from public.shops shop
  join public.partner_types partner_type on partner_type.id = shop.partner_type_id
  where shop.id = shop_id and shop.is_published;
$$;

revoke all on function public.community_author_profiles_for_ids(uuid[]) from public;
revoke all on function public.public_shop_profile(uuid) from public;
grant execute on function public.community_author_profiles_for_ids(uuid[]) to anon, authenticated;
grant execute on function public.public_shop_profile(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
