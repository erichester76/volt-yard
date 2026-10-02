create extension if not exists postgis;

alter table public.shops
  add column address text,
  add column latitude double precision,
  add column longitude double precision,
  add constraint shops_coordinates_pair check ((latitude is null) = (longitude is null)),
  add constraint shops_latitude_range check (latitude between -90 and 90),
  add constraint shops_longitude_range check (longitude between -180 and 180);

create index shops_coordinates_idx on public.shops using gist
  (st_setsrid(st_makepoint(longitude, latitude), 4326))
  where is_published and latitude is not null;

create or replace function public.nearby_shops(
  search_latitude double precision,
  search_longitude double precision,
  radius_miles integer default 25
)
returns table (
  id uuid,
  name text,
  city text,
  state text,
  distance_miles numeric,
  description text,
  makes text[],
  models text[],
  services text[]
)
language sql
stable
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(search_longitude, search_latitude), 4326)::geography as point
  )
  select
    shop.id,
    shop.name,
    shop.city,
    shop.state,
    round((st_distance(st_setsrid(st_makepoint(shop.longitude, shop.latitude), 4326)::geography, origin.point) / 1609.344)::numeric, 1),
    shop.description,
    coalesce((select array_agg(distinct vehicle.make order by vehicle.make) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(distinct vehicle.model order by vehicle.model) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id = supported.vehicle_id where supported.shop_id = shop.id), '{}'),
    coalesce((select array_agg(distinct repair.repair_type::text order by repair.repair_type::text) from shop_repair_types repair where repair.shop_id = shop.id), '{}')
  from shops shop cross join origin
  where shop.is_published
    and shop.latitude is not null
    and st_dwithin(st_setsrid(st_makepoint(shop.longitude, shop.latitude), 4326)::geography, origin.point, radius_miles * 1609.344)
  order by st_distance(st_setsrid(st_makepoint(shop.longitude, shop.latitude), 4326)::geography, origin.point);
$$;
