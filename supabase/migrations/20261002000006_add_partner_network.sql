-- Partners are a superset of mechanics. Types and capabilities are data so new
-- specialties can be added without changing matching or fulfillment code.
create table public.partner_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique check (char_length(trim(name)) between 2 and 80),
  requires_license boolean not null default false,
  requires_insurance boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique check (char_length(trim(name)) between 2 and 80),
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.service_capabilities (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique check (char_length(trim(name)) between 2 and 100),
  active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.partner_types (slug, name, requires_license, requires_insurance, sort_order) values
  ('mechanic', 'Mechanic', false, true, 10),
  ('electrician', 'Electrician', true, true, 20),
  ('wrap', 'Vehicle wrap specialist', false, true, 30),
  ('tint', 'Window tint specialist', false, true, 40),
  ('alignment', 'Alignment specialist', false, true, 50),
  ('tires', 'Tire specialist', false, true, 60),
  ('detailing', 'Detailing specialist', false, true, 70);
insert into public.service_categories (slug, name, sort_order) values
  ('mechanical', 'Mechanical service', 10), ('electrical', 'Electrical service', 20),
  ('appearance', 'Appearance', 30), ('wheels-tires', 'Wheels and tires', 40);
insert into public.service_capabilities (category_id, slug, name, sort_order)
select category.id, capability.slug, capability.name, capability.sort_order
from (values
  ('mechanical', 'alignment', 'Alignment', 10), ('mechanical', 'suspension', 'Suspension', 20),
  ('mechanical', 'brakes', 'Brakes', 30), ('mechanical', 'drive-unit', 'Drive unit', 40),
  ('mechanical', 'battery-pack', 'Battery pack', 50), ('mechanical', 'body-work', 'Body work', 60),
  ('mechanical', 'aftermarket-upgrades', 'Aftermarket upgrades', 70), ('mechanical', 'diagnostics', 'Diagnostics', 80),
  ('electrical', 'ev-electrical', 'EV electrical', 10), ('appearance', 'vehicle-wrap', 'Vehicle wrap', 10),
  ('appearance', 'window-tint', 'Window tint', 20), ('appearance', 'detailing', 'Detailing', 30),
  ('wheels-tires', 'tire-service', 'Tire service', 10)
) as capability(category_slug, slug, name, sort_order)
join public.service_categories category on category.slug = capability.category_slug;

alter table public.shops
  add column partner_type_id uuid references public.partner_types(id),
  add column license_number text,
  add column insurance_expires_on date,
  add column service_territory text;
update public.shops set partner_type_id = (select id from public.partner_types where slug = 'mechanic') where partner_type_id is null;
alter table public.shops alter column partner_type_id set not null;
create index shops_partner_type_idx on public.shops(partner_type_id) where is_published;

create table public.partner_capabilities (
  shop_id uuid not null references public.shops(id) on delete cascade,
  capability_id uuid not null references public.service_capabilities(id) on delete cascade,
  primary key (shop_id, capability_id)
);
insert into public.partner_capabilities (shop_id, capability_id)
select repair.shop_id, capability.id
from public.shop_repair_types repair
join public.service_capabilities capability on capability.slug = replace(repair.repair_type::text, '_', '-')
on conflict do nothing;
create index partner_capabilities_capability_idx on public.partner_capabilities(capability_id, shop_id);

alter table public.catalog_products add column required_capability_id uuid references public.service_capabilities(id);
update public.catalog_products product set required_capability_id = capability.id
from public.service_capabilities capability
where capability.slug = replace(product.service_type::text, '_', '-');

alter table public.shop_change_requests add column proposed_capability_ids uuid[] not null default '{}';

create or replace function public.approve_shop_change(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.shop_change_requests;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.shop_change_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'Pending request not found'; end if;
  if r.shop_id is null then select id into r.shop_id from public.shops where owner_id = r.owner_id order by created_at limit 1; end if;
  if r.shop_id is null then
    insert into public.shops (owner_id,name,address,city,state,phone,email,website,hours,bay_count,years_in_business,description,latitude,longitude,is_published,partner_type_id,license_number,insurance_expires_on,service_territory)
    values (r.owner_id,r.proposed_profile->>'name',r.proposed_profile->>'address',r.proposed_profile->>'city',r.proposed_profile->>'state',r.proposed_profile->>'phone',r.proposed_profile->>'email',r.proposed_profile->>'website',r.proposed_profile->>'hours',nullif(r.proposed_profile->>'bay_count','')::smallint,nullif(r.proposed_profile->>'years_in_business','')::smallint,r.proposed_profile->>'description',nullif(r.proposed_profile->>'latitude','')::double precision,nullif(r.proposed_profile->>'longitude','')::double precision,true,(r.proposed_profile->>'partner_type_id')::uuid,nullif(r.proposed_profile->>'license_number',''),nullif(r.proposed_profile->>'insurance_expires_on','')::date,nullif(r.proposed_profile->>'service_territory','')) returning id into r.shop_id;
  else
    update public.shops set name=r.proposed_profile->>'name',address=r.proposed_profile->>'address',city=r.proposed_profile->>'city',state=r.proposed_profile->>'state',phone=r.proposed_profile->>'phone',email=r.proposed_profile->>'email',website=r.proposed_profile->>'website',hours=r.proposed_profile->>'hours',bay_count=nullif(r.proposed_profile->>'bay_count','')::smallint,years_in_business=nullif(r.proposed_profile->>'years_in_business','')::smallint,description=r.proposed_profile->>'description',latitude=nullif(r.proposed_profile->>'latitude','')::double precision,longitude=nullif(r.proposed_profile->>'longitude','')::double precision,partner_type_id=(r.proposed_profile->>'partner_type_id')::uuid,license_number=nullif(r.proposed_profile->>'license_number',''),insurance_expires_on=nullif(r.proposed_profile->>'insurance_expires_on','')::date,service_territory=nullif(r.proposed_profile->>'service_territory','') where id=r.shop_id;
  end if;
  delete from public.shop_vehicles where shop_id = r.shop_id;
  insert into public.shop_vehicles (shop_id, vehicle_id) select r.shop_id, vehicle_id from unnest(r.proposed_vehicle_ids) vehicle_id;
  delete from public.shop_repair_types where shop_id = r.shop_id;
  insert into public.shop_repair_types (shop_id, repair_type) select r.shop_id, repair_type from unnest(r.proposed_repair_types) repair_type;
  delete from public.partner_capabilities where shop_id = r.shop_id;
  insert into public.partner_capabilities (shop_id, capability_id) select r.shop_id, capability_id from unnest(r.proposed_capability_ids) capability_id;
  delete from public.shop_certifications where shop_id = r.shop_id;
  insert into public.shop_certifications (shop_id, certification_id) select r.shop_id, certification_id from unnest(r.proposed_certification_ids) certification_id;
  delete from public.shop_images where shop_id = r.shop_id;
  insert into public.shop_images (shop_id, storage_path, alt_text, sort_order, is_primary) select r.shop_id, image.storage_path, image.alt_text, image.sort_order, image.is_primary from jsonb_to_recordset(r.proposed_images) as image(storage_path text, alt_text text, sort_order smallint, is_primary boolean);
  update public.shop_change_requests set shop_id=r.shop_id,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
end; $$;

-- Matching now uses a product capability. A partner without vehicle rows is not
-- vehicle-restricted, which supports non-mechanical specialties.
create or replace function public.enqueue_paid_service_requests()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  update public.carts set status = 'converted' where id = new.cart_id;
  insert into public.installer_jobs (service_request_id, shop_id, retail_service_price_cents, installer_payout_cents, platform_margin_cents)
  select request.id, partner.id, request.retail_service_price_cents, request.installer_payout_cents, request.platform_margin_cents
  from public.service_requests request join public.catalog_products product on product.id = request.product_id join public.shops partner on partner.is_published
  where request.order_id = new.id
    and (product.required_capability_id is null or exists (select 1 from public.partner_capabilities capability where capability.shop_id = partner.id and capability.capability_id = product.required_capability_id))
    and (request.vehicle_id is null or not exists (select 1 from public.shop_vehicles supported where supported.shop_id = partner.id) or exists (select 1 from public.shop_vehicles supported where supported.shop_id = partner.id and supported.vehicle_id = request.vehicle_id));
  insert into public.installer_notifications (installer_job_id, shop_id) select job.id, job.shop_id from public.installer_jobs job join public.service_requests request on request.id = job.service_request_id where request.order_id = new.id;
  return new;
end; $$;

drop function public.nearby_shops(double precision, double precision, integer, text, text, integer, public.repair_type);
drop function public.shops_by_location(text, text, text, integer, public.repair_type);
create function public.nearby_shops(search_latitude double precision, search_longitude double precision, radius_miles integer default 25, vehicle_make text default null, vehicle_model text default null, vehicle_year integer default null, capability_filter uuid default null, partner_type_filter uuid default null)
returns table (id uuid, name text, city text, state text, distance_miles numeric, description text, address text, website text, phone text, email text, hours text, service_territory text, partner_type text, makes text[], models text[], model_years integer[], services text[], certifications text[], average_rating numeric, review_count bigint) language sql stable set search_path = public as $$
  with origin as (select st_setsrid(st_makepoint(search_longitude, search_latitude), 4326)::geography as point)
  select shop.id, shop.name, shop.city, shop.state, round((st_distance(st_setsrid(st_makepoint(shop.longitude, shop.latitude),4326)::geography,origin.point)/1609.344)::numeric,1), shop.description, shop.address, shop.website, shop.phone, shop.email, shop.hours, shop.service_territory, type.name,
    coalesce((select array_agg(distinct vehicle.make order by vehicle.make) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id=supported.vehicle_id where supported.shop_id=shop.id),'{}'), coalesce((select array_agg(distinct vehicle.model order by vehicle.model) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id=supported.vehicle_id where supported.shop_id=shop.id),'{}'), coalesce((select array_agg(distinct vehicle.model_year order by vehicle.model_year) from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id=supported.vehicle_id where supported.shop_id=shop.id),'{}'), coalesce((select array_agg(capability.name order by capability.name) from partner_capabilities assigned join service_capabilities capability on capability.id=assigned.capability_id and capability.active where assigned.shop_id=shop.id),'{}'), coalesce((select array_agg(certification.name order by certification.name) from shop_certifications assigned join certifications certification on certification.id=assigned.certification_id and certification.is_active where assigned.shop_id=shop.id),'{}'), reviews.average_rating, coalesce(reviews.review_count,0)
  from shops shop join partner_types type on type.id=shop.partner_type_id cross join origin left join lateral (select round(avg(rating)::numeric,1) average_rating,count(*) review_count from shop_reviews where shop_id=shop.id) reviews on true
  where shop.is_published and shop.latitude is not null and st_dwithin(st_setsrid(st_makepoint(shop.longitude,shop.latitude),4326)::geography,origin.point,radius_miles*1609.344) and (partner_type_filter is null or shop.partner_type_id=partner_type_filter) and (capability_filter is null or exists (select 1 from partner_capabilities assigned where assigned.shop_id=shop.id and assigned.capability_id=capability_filter)) and ((vehicle_make is null and vehicle_model is null and vehicle_year is null) or not exists (select 1 from shop_vehicles supported where supported.shop_id=shop.id) or exists (select 1 from shop_vehicles supported join vehicle_catalog vehicle on vehicle.id=supported.vehicle_id where supported.shop_id=shop.id and (vehicle_make is null or vehicle.make=vehicle_make) and (vehicle_model is null or vehicle.model=vehicle_model) and (vehicle_year is null or vehicle.model_year=vehicle_year))) order by st_distance(st_setsrid(st_makepoint(shop.longitude,shop.latitude),4326)::geography,origin.point);
$$;
create function public.shops_by_location(location_query text, vehicle_make text default null, vehicle_model text default null, vehicle_year integer default null, capability_filter uuid default null, partner_type_filter uuid default null)
returns table (id uuid, name text, city text, state text, distance_miles numeric, description text, address text, website text, phone text, email text, hours text, service_territory text, partner_type text, makes text[], models text[], model_years integer[], services text[], certifications text[], average_rating numeric, review_count bigint) language sql stable set search_path = public as $$
  select * from public.nearby_shops(0, 0, 12451, vehicle_make, vehicle_model, vehicle_year, capability_filter, partner_type_filter) result where regexp_replace(lower(concat_ws(' ',result.city,result.state)), '[^a-z0-9]+', ' ', 'g') like '%' || regexp_replace(lower(trim(location_query)), '[^a-z0-9]+', ' ', 'g') || '%' order by result.name;
$$;

alter table public.partner_types enable row level security;
alter table public.service_categories enable row level security;
alter table public.service_capabilities enable row level security;
alter table public.partner_capabilities enable row level security;
create policy "Public reads active partner types" on public.partner_types for select using (active);
create policy "Public reads active service categories" on public.service_categories for select using (active);
create policy "Public reads active service capabilities" on public.service_capabilities for select using (active);
create policy "Public reads published partner capabilities" on public.partner_capabilities for select using (exists (select 1 from public.shops where shops.id=partner_capabilities.shop_id and shops.is_published));
create policy "Admins manage partner types" on public.partner_types for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage service categories" on public.service_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage service capabilities" on public.service_capabilities for all using (public.is_admin()) with check (public.is_admin());
create policy "Owners manage partner capabilities" on public.partner_capabilities for all using (exists (select 1 from public.shops where shops.id=partner_capabilities.shop_id and shops.owner_id=auth.uid())) with check (exists (select 1 from public.shops where shops.id=partner_capabilities.shop_id and shops.owner_id=auth.uid()));
notify pgrst, 'reload schema';
