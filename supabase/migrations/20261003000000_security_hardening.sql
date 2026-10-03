-- Security hardening: all live shop changes pass through an admin-reviewed request,
-- commerce writes are transactional, and public directory reads use a narrow projection.

alter table public.orders add column if not exists checkout_idempotency_key text;
alter table public.orders add constraint orders_checkout_idempotency_key_format
  check (checkout_idempotency_key is null or checkout_idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$');
create unique index if not exists orders_user_checkout_idempotency_key_idx
  on public.orders (user_id, checkout_idempotency_key) where checkout_idempotency_key is not null;
create unique index if not exists orders_one_open_order_per_cart_idx
  on public.orders (cart_id) where status in ('pending_payment', 'paid');

create table if not exists public.stripe_event_ledger (
  event_id text primary key check (char_length(event_id) between 1 and 255),
  event_type text not null check (char_length(event_type) between 1 and 255),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_error text,
  payload jsonb not null
);
alter table public.stripe_event_ledger enable row level security;
create policy "Admins read Stripe event ledger" on public.stripe_event_ledger for select using (public.is_admin());

-- A request must only ever modify the applying owner's shop.  This protects against
-- a malformed or tampered request_id causing an admin review to mutate another shop.
create or replace function public.approve_shop_change(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.shop_change_requests;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.shop_change_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'Pending request not found'; end if;
  if r.shop_id is not null and not exists (select 1 from public.shops where id = r.shop_id and owner_id = r.owner_id) then
    raise exception 'Change request does not belong to its target shop';
  end if;
  if r.shop_id is null then select id into r.shop_id from public.shops where owner_id = r.owner_id order by created_at limit 1; end if;
  if r.shop_id is null then
    insert into public.shops (owner_id,name,address,city,state,phone,email,website,hours,bay_count,years_in_business,description,latitude,longitude,is_published,partner_type_id,license_number,insurance_expires_on,service_territory)
    values (r.owner_id,r.proposed_profile->>'name',r.proposed_profile->>'address',r.proposed_profile->>'city',r.proposed_profile->>'state',r.proposed_profile->>'phone',r.proposed_profile->>'email',r.proposed_profile->>'website',r.proposed_profile->>'hours',nullif(r.proposed_profile->>'bay_count','')::smallint,nullif(r.proposed_profile->>'years_in_business','')::smallint,r.proposed_profile->>'description',nullif(r.proposed_profile->>'latitude','')::double precision,nullif(r.proposed_profile->>'longitude','')::double precision,true,(r.proposed_profile->>'partner_type_id')::uuid,nullif(r.proposed_profile->>'license_number',''),nullif(r.proposed_profile->>'insurance_expires_on','')::date,nullif(r.proposed_profile->>'service_territory','')) returning id into r.shop_id;
  else
    update public.shops set name=r.proposed_profile->>'name',address=r.proposed_profile->>'address',city=r.proposed_profile->>'city',state=r.proposed_profile->>'state',phone=r.proposed_profile->>'phone',email=r.proposed_profile->>'email',website=r.proposed_profile->>'website',hours=r.proposed_profile->>'hours',bay_count=nullif(r.proposed_profile->>'bay_count','')::smallint,years_in_business=nullif(r.proposed_profile->>'years_in_business','')::smallint,description=r.proposed_profile->>'description',latitude=nullif(r.proposed_profile->>'latitude','')::double precision,longitude=nullif(r.proposed_profile->>'longitude','')::double precision,partner_type_id=(r.proposed_profile->>'partner_type_id')::uuid,license_number=nullif(r.proposed_profile->>'license_number',''),insurance_expires_on=nullif(r.proposed_profile->>'insurance_expires_on','')::date,service_territory=nullif(r.proposed_profile->>'service_territory','') where id=r.shop_id and owner_id=r.owner_id;
    if not found then raise exception 'Shop ownership changed during review'; end if;
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
  insert into public.shop_images (shop_id, storage_path, alt_text, sort_order, is_primary) select r.shop_id, image.storage_path, left(image.alt_text, 240), greatest(0, least(image.sort_order, 100)), image.is_primary from jsonb_to_recordset(r.proposed_images) as image(storage_path text, alt_text text, sort_order smallint, is_primary boolean);
  update public.shop_change_requests set shop_id=r.shop_id,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
end; $$;

drop policy if exists "Owners can manage their shops" on public.shops;
create policy "Owners read their shops" on public.shops for select using (owner_id = auth.uid());

-- Never expose ownership, insurance, licensing, or internal workflow fields to the directory.
drop policy if exists "Public can read published shops" on public.shops;
create or replace view public.public_shop_profiles with (security_invoker = false) as
  select shop.id, shop.name, shop.address, shop.city, shop.state, shop.postal_code, shop.phone, shop.website, shop.description, shop.hours,
    shop.bay_count, shop.years_in_business, shop.latitude, shop.longitude, shop.service_territory, shop.partner_type_id, type.name as partner_type_name, shop.created_at, shop.updated_at
  from public.shops shop join public.partner_types type on type.id = shop.partner_type_id where shop.is_published;
revoke all on public.public_shop_profiles from public;
grant select on public.public_shop_profiles to anon, authenticated;
alter function public.nearby_shops(double precision, double precision, integer, text, text, integer, uuid, uuid) security definer;
alter function public.shops_by_location(text, text, text, integer, uuid, uuid) security definer;

-- Pending application images remain private. Published images are readable through
-- authenticated/anonymous Storage signed URLs only when their shop is published.
update storage.buckets set public = false where id = 'shop-images';
drop policy if exists "Public reads shop images" on storage.objects;
create policy "Public reads published shop images" on storage.objects for select using (
  bucket_id = 'shop-images' and (storage.foldername(name))[1] in (
    select id::text from public.shops where is_published
  )
);

-- Only an approved published shop with an active insurance date can claim paid work.
create or replace function public.accept_installer_job(job_id uuid, agreement_version text)
returns boolean language plpgsql security definer set search_path = public as $$
declare job public.installer_jobs%rowtype;
begin
  if char_length(trim(coalesce(agreement_version, ''))) not between 1 and 120 then raise exception 'Managed service agreement version is required'; end if;
  select * into job from public.installer_jobs where id = job_id for update;
  if not found or job.status <> 'open' then return false; end if;
  if not exists (select 1 from public.shops where id = job.shop_id and owner_id = auth.uid() and is_published and (insurance_expires_on is null or insurance_expires_on >= current_date)) then raise exception 'Not authorized to accept this job'; end if;
  if exists (select 1 from public.service_requests where id = job.service_request_id and accepted_shop_id is not null) then return false; end if;
  update public.installer_jobs set status = 'accepted', accepted_at = now(), payout_status = 'pending', payout_recorded_at = now() where id = job.id;
  update public.installer_jobs set status = 'withdrawn', payout_status = 'void' where service_request_id = job.service_request_id and id <> job.id and status = 'open';
  update public.service_requests set status = 'claimed', accepted_shop_id = job.shop_id where id = job.service_request_id;
  insert into public.managed_service_agreements (installer_job_id, shop_id, accepted_by, payout_cents, agreement_version) values (job.id, job.shop_id, auth.uid(), job.installer_payout_cents, trim(agreement_version));
  return true;
end; $$;

create or replace function public.create_checkout_order(p_cart_id uuid, p_vehicle_id uuid, p_location_text text, p_notes text, p_idempotency_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare order_id uuid; cart public.carts%rowtype; total integer; payout integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then raise exception 'Invalid idempotency key'; end if;
  if char_length(coalesce(p_location_text, '')) > 200 or char_length(coalesce(p_notes, '')) > 2000 then raise exception 'Input exceeds allowed length'; end if;
  select id into order_id from public.orders where user_id = auth.uid() and checkout_idempotency_key = p_idempotency_key;
  if order_id is not null then return order_id; end if;
  select * into cart from public.carts where id = p_cart_id and user_id = auth.uid() and status = 'active' for update;
  if not found then raise exception 'Active cart not found'; end if;
  if p_vehicle_id is not null and not exists (select 1 from public.vehicle_catalog where id = p_vehicle_id) then raise exception 'Invalid vehicle'; end if;
  if not exists (select 1 from public.cart_items i join public.catalog_products p on p.id=i.product_id and p.active where i.cart_id=cart.id) then raise exception 'Cart has no available items'; end if;
  if exists (select 1 from public.cart_items i where i.cart_id=cart.id and p_vehicle_id is not null and exists (select 1 from public.product_vehicle_compatibility c where c.product_id=i.product_id) and not exists (select 1 from public.product_vehicle_compatibility c where c.product_id=i.product_id and c.vehicle_id=p_vehicle_id)) then raise exception 'Product is not compatible with vehicle'; end if;
  select sum(i.quantity * p.price_cents), sum(i.quantity * p.installer_payout_cents) into total, payout from public.cart_items i join public.catalog_products p on p.id=i.product_id and p.active where i.cart_id=cart.id;
  insert into public.orders (user_id,cart_id,amount_cents,retail_service_amount_cents,installer_payout_amount_cents,platform_margin_cents,checkout_idempotency_key) values (auth.uid(),cart.id,total,total,payout,total-payout,p_idempotency_key) returning id into order_id;
  insert into public.service_requests (order_id,cart_item_id,product_id,customer_id,vehicle_id,location_text,notes,quantity,retail_service_price_cents,installer_payout_cents,platform_margin_cents)
  select order_id,i.id,i.product_id,auth.uid(),p_vehicle_id,nullif(trim(p_location_text),''),nullif(trim(p_notes),''),i.quantity,i.quantity*p.price_cents,i.quantity*p.installer_payout_cents,i.quantity*(p.price_cents-p.installer_payout_cents) from public.cart_items i join public.catalog_products p on p.id=i.product_id and p.active where i.cart_id=cart.id;
  return order_id;
end; $$;
revoke all on function public.create_checkout_order(uuid,uuid,text,text,text) from public;
grant execute on function public.create_checkout_order(uuid,uuid,text,text,text) to authenticated;

alter type public.membership_status add value if not exists 'incomplete';
alter type public.membership_status add value if not exists 'incomplete_expired';
alter type public.membership_status add value if not exists 'unpaid';
alter type public.membership_status add value if not exists 'paused';

notify pgrst, 'reload schema';
