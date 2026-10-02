-- Keep directory-card projections and filters tied to approved live data.
create policy "Public reads published shop certifications" on public.shop_certifications
  for select using (exists (
    select 1 from public.shops
    where shops.id = shop_certifications.shop_id and shops.is_published
  ));

drop function public.nearby_shops(double precision, double precision, integer);

create or replace function public.nearby_shops(
  search_latitude double precision,
  search_longitude double precision,
  radius_miles integer default 25,
  vehicle_make text default null,
  vehicle_model text default null,
  vehicle_year integer default null,
  repair_filter public.repair_type default null
)
returns table (
  id uuid, name text, city text, state text, distance_miles numeric, description text,
  makes text[], models text[], model_years integer[], services text[], certifications text[],
  average_rating numeric, review_count bigint
)
language sql stable set search_path = public as $$
  with origin as (
    select st_setsrid(st_makepoint(search_longitude, search_latitude), 4326)::geography as point
  )
  select shop.id, shop.name, shop.city, shop.state,
    round((st_distance(st_setsrid(st_makepoint(shop.longitude, shop.latitude), 4326)::geography, origin.point) / 1609.344)::numeric, 1),
    shop.description,
    coalesce((select array_agg(distinct vehicle.make order by vehicle.make) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(distinct vehicle.model order by vehicle.model) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(distinct vehicle.model_year order by vehicle.model_year) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(repair.repair_type::text order by repair.repair_type::text) from shop_repair_types repair where repair.shop_id = shop.id), '{}'),
    coalesce((select array_agg(certification.name order by certification.name) from shop_certifications assigned join certifications certification on certification.id = assigned.certification_id and certification.is_active where assigned.shop_id = shop.id), '{}'),
    reviews.average_rating, coalesce(reviews.review_count, 0)
  from shops shop cross join origin
  left join lateral (select round(avg(rating)::numeric, 1) as average_rating, count(*) as review_count from shop_reviews where shop_id = shop.id) reviews on true
  where shop.is_published and shop.latitude is not null
    and st_dwithin(st_setsrid(st_makepoint(shop.longitude, shop.latitude), 4326)::geography, origin.point, radius_miles * 1609.344)
    and ((vehicle_make is null and vehicle_model is null and vehicle_year is null) or exists (
      select 1 from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id
      where supported.shop_id = shop.id
        and (vehicle_make is null or vehicle.make = vehicle_make)
        and (vehicle_model is null or vehicle.model = vehicle_model)
        and (vehicle_year is null or vehicle.model_year = vehicle_year)
    ))
    and (repair_filter is null or exists (select 1 from shop_repair_types repair where repair.shop_id = shop.id and repair.repair_type = repair_filter))
  order by st_distance(st_setsrid(st_makepoint(shop.longitude, shop.latitude), 4326)::geography, origin.point);
$$;

create or replace function public.shops_by_location(
  location_query text,
  vehicle_make text default null,
  vehicle_model text default null,
  vehicle_year integer default null,
  repair_filter public.repair_type default null
)
returns table (
  id uuid, name text, city text, state text, distance_miles numeric, description text,
  makes text[], models text[], model_years integer[], services text[], certifications text[],
  average_rating numeric, review_count bigint
)
language sql stable set search_path = public as $$
  select shop.id, shop.name, shop.city, shop.state, null::numeric, shop.description,
    coalesce((select array_agg(distinct vehicle.make order by vehicle.make) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(distinct vehicle.model order by vehicle.model) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(distinct vehicle.model_year order by vehicle.model_year) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(repair.repair_type::text order by repair.repair_type::text) from shop_repair_types repair where repair.shop_id = shop.id), '{}'),
    coalesce((select array_agg(certification.name order by certification.name) from shop_certifications assigned join certifications certification on certification.id = assigned.certification_id and certification.is_active where assigned.shop_id = shop.id), '{}'),
    reviews.average_rating, coalesce(reviews.review_count, 0)
  from shops shop
  left join lateral (select round(avg(rating)::numeric, 1) as average_rating, count(*) as review_count from shop_reviews where shop_id = shop.id) reviews on true
  where shop.is_published
    and regexp_replace(lower(concat_ws(' ', shop.city, shop.state, shop.postal_code)), '[^a-z0-9]+', ' ', 'g')
      like '%' || regexp_replace(lower(trim(location_query)), '[^a-z0-9]+', ' ', 'g') || '%'
    and ((vehicle_make is null and vehicle_model is null and vehicle_year is null) or exists (
      select 1 from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id
      where supported.shop_id = shop.id
        and (vehicle_make is null or vehicle.make = vehicle_make)
        and (vehicle_model is null or vehicle.model = vehicle_model)
        and (vehicle_year is null or vehicle.model_year = vehicle_year)
    ))
    and (repair_filter is null or exists (select 1 from shop_repair_types repair where repair.shop_id = shop.id and repair.repair_type = repair_filter))
  order by shop.name;
$$;

-- Earlier approval functions created shops without copying these approved relations.
insert into public.shop_vehicles (shop_id, vehicle_id)
select request.shop_id, vehicle_id
from public.shop_change_requests request cross join lateral unnest(request.proposed_vehicle_ids) vehicle_id
where request.status = 'approved' and request.shop_id is not null
on conflict do nothing;

insert into public.shop_repair_types (shop_id, repair_type)
select request.shop_id, repair_type
from public.shop_change_requests request cross join lateral unnest(request.proposed_repair_types) repair_type
where request.status = 'approved' and request.shop_id is not null
on conflict do nothing;

insert into public.shop_certifications (shop_id, certification_id)
select request.shop_id, certification_id
from public.shop_change_requests request cross join lateral unnest(request.proposed_certification_ids) certification_id
where request.status = 'approved' and request.shop_id is not null
on conflict do nothing;
