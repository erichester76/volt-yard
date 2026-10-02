create extension if not exists pgcrypto;

create type public.repair_type as enum (
  'alignment', 'suspension', 'brakes', 'drive_unit', 'battery_pack', 'body_work', 'aftermarket_upgrades', 'diagnostics'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  city text not null,
  state text,
  postal_code text,
  phone text,
  website text,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_catalog (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'nhtsa',
  source_id text not null,
  model_year integer not null check (model_year between 1990 and 2100),
  make text not null,
  model text not null,
  is_electric boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create index vehicle_catalog_lookup_idx on public.vehicle_catalog (model_year, make, model);
create index shops_location_idx on public.shops (state, city) where is_published;

create table public.shop_vehicles (
  shop_id uuid not null references public.shops(id) on delete cascade,
  vehicle_id uuid not null references public.vehicle_catalog(id) on delete cascade,
  primary key (shop_id, vehicle_id)
);

create table public.shop_repair_types (
  shop_id uuid not null references public.shops(id) on delete cascade,
  repair_type public.repair_type not null,
  primary key (shop_id, repair_type)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shops_updated_at before update on public.shops for each row execute procedure public.set_updated_at();
create trigger vehicle_catalog_updated_at before update on public.vehicle_catalog for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.vehicle_catalog enable row level security;
alter table public.shop_vehicles enable row level security;
alter table public.shop_repair_types enable row level security;

create policy "Public can read published shops" on public.shops for select using (is_published);
create policy "Owners can manage their shops" on public.shops for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Public can read vehicles" on public.vehicle_catalog for select using (true);
create policy "Public can read published shop vehicles" on public.shop_vehicles for select using (exists (select 1 from public.shops where shops.id = shop_vehicles.shop_id and shops.is_published));
create policy "Owners manage their shop vehicles" on public.shop_vehicles for all using (exists (select 1 from public.shops where shops.id = shop_vehicles.shop_id and shops.owner_id = auth.uid())) with check (exists (select 1 from public.shops where shops.id = shop_vehicles.shop_id and shops.owner_id = auth.uid()));
create policy "Public can read published shop repair types" on public.shop_repair_types for select using (exists (select 1 from public.shops where shops.id = shop_repair_types.shop_id and shops.is_published));
create policy "Owners manage their shop repair types" on public.shop_repair_types for all using (exists (select 1 from public.shops where shops.id = shop_repair_types.shop_id and shops.owner_id = auth.uid())) with check (exists (select 1 from public.shops where shops.id = shop_repair_types.shop_id and shops.owner_id = auth.uid()));
