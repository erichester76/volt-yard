-- Commerce is deliberately separate from the directory's existing shop profile flow.
alter table public.profiles add column if not exists is_installer boolean not null default false;

create type public.commerce_product_kind as enum ('package', 'service');
create type public.commerce_order_status as enum ('pending_payment', 'paid', 'cancelled');
create type public.service_request_status as enum ('awaiting_installer', 'claimed', 'scheduled', 'completed', 'cancelled');
create type public.installer_job_status as enum ('open', 'accepted', 'withdrawn');

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 140),
  description text not null,
  kind public.commerce_product_kind not null,
  service_type public.repair_type,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_vehicle_compatibility (
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  vehicle_id uuid not null references public.vehicle_catalog(id) on delete cascade,
  primary key (product_id, vehicle_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carts_one_active_per_user on public.carts(user_id) where status = 'active';

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id),
  quantity integer not null default 1 check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  cart_id uuid not null references public.carts(id),
  status public.commerce_order_status not null default 'pending_payment',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_cart_id_idx on public.orders(cart_id);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  cart_item_id uuid not null references public.cart_items(id),
  product_id uuid not null references public.catalog_products(id),
  customer_id uuid not null references auth.users(id),
  vehicle_id uuid references public.vehicle_catalog(id),
  location_text text,
  notes text,
  status public.service_request_status not null default 'awaiting_installer',
  accepted_shop_id uuid references public.shops(id),
  created_at timestamptz not null default now(),
  unique (order_id, cart_item_id)
);

create table public.installer_jobs (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  status public.installer_job_status not null default 'open',
  finder_fee_cents integer not null check (finder_fee_cents >= 0),
  notified_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (service_request_id, shop_id)
);

create table public.installer_notifications (
  id uuid primary key default gen_random_uuid(),
  installer_job_id uuid not null references public.installer_jobs(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  type text not null default 'service_request',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.finder_fee_agreements (
  id uuid primary key default gen_random_uuid(),
  installer_job_id uuid not null unique references public.installer_jobs(id) on delete cascade,
  shop_id uuid not null references public.shops(id),
  accepted_by uuid not null references auth.users(id),
  fee_cents integer not null check (fee_cents >= 0),
  agreement_version text not null,
  accepted_at timestamptz not null default now()
);

create trigger catalog_products_updated_at before update on public.catalog_products for each row execute procedure public.set_updated_at();
create trigger carts_updated_at before update on public.carts for each row execute procedure public.set_updated_at();

-- A paid order offers each compatible service request to published installers.
create or replace function public.enqueue_paid_service_requests()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  update public.carts set status = 'converted' where id = new.cart_id;
  insert into public.installer_jobs (service_request_id, shop_id, finder_fee_cents)
  select request.id, shop.id, greatest(0, round(product.price_cents * 0.10)::integer)
  from public.service_requests request
  join public.catalog_products product on product.id = request.product_id
  join public.shops shop on shop.is_published
  where request.order_id = new.id
    and (product.service_type is null or exists (
      select 1 from public.shop_repair_types repair
      where repair.shop_id = shop.id and repair.repair_type = product.service_type
    ))
    and (request.vehicle_id is null or exists (
      select 1 from public.shop_vehicles supported
      where supported.shop_id = shop.id and supported.vehicle_id = request.vehicle_id
    ));
  insert into public.installer_notifications (installer_job_id, shop_id)
  select job.id, job.shop_id from public.installer_jobs job
  join public.service_requests request on request.id = job.service_request_id
  where request.order_id = new.id;
  return new;
end;
$$;
create trigger orders_enqueue_paid_requests after update of status on public.orders for each row execute procedure public.enqueue_paid_service_requests();

-- This is the only client-callable claim path, preventing two shops from accepting a request.
create or replace function public.accept_installer_job(job_id uuid, agreement_version text)
returns boolean language plpgsql security definer set search_path = public as $$
declare job public.installer_jobs%rowtype;
begin
  if coalesce(trim(agreement_version), '') = '' then raise exception 'Finder-fee agreement version is required'; end if;
  select * into job from public.installer_jobs where id = job_id for update;
  if not found or job.status <> 'open' then return false; end if;
  if not exists (select 1 from public.shops where id = job.shop_id and owner_id = auth.uid()) then raise exception 'Not authorized to accept this job'; end if;
  if exists (select 1 from public.service_requests where id = job.service_request_id and accepted_shop_id is not null) then return false; end if;
  update public.installer_jobs set status = 'accepted', accepted_at = now() where id = job.id;
  update public.installer_jobs set status = 'withdrawn' where service_request_id = job.service_request_id and id <> job.id and status = 'open';
  update public.service_requests set status = 'claimed', accepted_shop_id = job.shop_id where id = job.service_request_id;
  insert into public.finder_fee_agreements (installer_job_id, shop_id, accepted_by, fee_cents, agreement_version)
  values (job.id, job.shop_id, auth.uid(), job.finder_fee_cents, agreement_version);
  return true;
end;
$$;
revoke all on function public.accept_installer_job(uuid, text) from public;
grant execute on function public.accept_installer_job(uuid, text) to authenticated;

alter table public.catalog_products enable row level security;
alter table public.product_vehicle_compatibility enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.service_requests enable row level security;
alter table public.installer_jobs enable row level security;
alter table public.installer_notifications enable row level security;
alter table public.finder_fee_agreements enable row level security;

create policy "Public reads active catalog" on public.catalog_products for select using (active);
create policy "Admins manage catalog" on public.catalog_products for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads product compatibility" on public.product_vehicle_compatibility for select using (true);
create policy "Admins manage product compatibility" on public.product_vehicle_compatibility for all using (public.is_admin()) with check (public.is_admin());
create policy "Customers manage their carts" on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Customers manage their cart items" on public.cart_items for all using (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid() and carts.status = 'active')) with check (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid() and carts.status = 'active'));
create policy "Customers read their orders" on public.orders for select using (user_id = auth.uid());
create policy "Customers read their service requests" on public.service_requests for select using (customer_id = auth.uid());
create policy "Installers read their jobs" on public.installer_jobs for select using (exists (select 1 from public.shops where shops.id = installer_jobs.shop_id and shops.owner_id = auth.uid()));
create policy "Installers read their notifications" on public.installer_notifications for select using (exists (select 1 from public.shops where shops.id = installer_notifications.shop_id and shops.owner_id = auth.uid()));
create policy "Installers read their agreements" on public.finder_fee_agreements for select using (accepted_by = auth.uid());

insert into public.catalog_products (slug, name, description, kind, service_type, price_cents) values
  ('pre-purchase-inspection', 'Pre-purchase inspection', 'A comprehensive EV health check before you buy, with a written report.', 'service', 'diagnostics', 24900),
  ('annual-ev-checkup', 'Yearly EV checkup', 'Annual inspection of brakes, tires, thermal systems, and charging hardware.', 'service', 'diagnostics', 17900),
  ('coolant-service', 'Coolant service', 'Thermal-system inspection and coolant service for eligible EVs.', 'service', 'battery_pack', 32900),
  ('low-voltage-ohmmu-upgrade', 'Low-voltage OHMMU upgrade', 'Install and configure a low-voltage battery monitoring upgrade.', 'service', 'aftermarket_upgrades', 44900),
  ('tesla-new-owner-kit', 'Tesla new owner kit', 'A practical first-year package: inspection, charging orientation, and essentials.', 'package', 'diagnostics', 29900);

notify pgrst, 'reload schema';
