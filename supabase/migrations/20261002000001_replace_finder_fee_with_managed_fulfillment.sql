-- Volt Yard sells the service to the customer and engages installers at a negotiated payout.
create type public.installer_payout_status as enum ('offered', 'pending', 'paid', 'void');

alter table public.catalog_products
  add column installer_payout_cents integer;

update public.catalog_products
set installer_payout_cents = greatest(0, round(price_cents * 0.90)::integer)
where installer_payout_cents is null;

alter table public.catalog_products
  alter column installer_payout_cents set not null,
  add constraint catalog_products_installer_payout_within_retail
    check (installer_payout_cents between 0 and price_cents);

alter table public.orders
  add column retail_service_amount_cents integer,
  add column installer_payout_amount_cents integer,
  add column platform_margin_cents integer;

update public.orders
set retail_service_amount_cents = amount_cents,
    installer_payout_amount_cents = 0,
    platform_margin_cents = amount_cents
where retail_service_amount_cents is null;

alter table public.orders
  alter column retail_service_amount_cents set not null,
  alter column installer_payout_amount_cents set not null,
  alter column platform_margin_cents set not null,
  add constraint orders_managed_fulfillment_amounts_check check (
    retail_service_amount_cents >= 0
    and installer_payout_amount_cents >= 0
    and platform_margin_cents = retail_service_amount_cents - installer_payout_amount_cents
  );

alter table public.service_requests
  add column quantity integer not null default 1 check (quantity between 1 and 10),
  add column retail_service_price_cents integer,
  add column installer_payout_cents integer,
  add column platform_margin_cents integer;

update public.service_requests request
set retail_service_price_cents = product.price_cents,
    installer_payout_cents = product.installer_payout_cents,
    platform_margin_cents = product.price_cents - product.installer_payout_cents
from public.catalog_products product
where product.id = request.product_id
  and request.retail_service_price_cents is null;

update public.orders orders
set installer_payout_amount_cents = totals.installer_payout_amount_cents,
    platform_margin_cents = orders.retail_service_amount_cents - totals.installer_payout_amount_cents
from (
  select order_id, sum(installer_payout_cents) as installer_payout_amount_cents
  from public.service_requests
  group by order_id
) totals
where totals.order_id = orders.id;

alter table public.service_requests
  alter column retail_service_price_cents set not null,
  alter column installer_payout_cents set not null,
  alter column platform_margin_cents set not null,
  add constraint service_requests_managed_fulfillment_amounts_check check (
    retail_service_price_cents >= 0
    and installer_payout_cents >= 0
    and platform_margin_cents = retail_service_price_cents - installer_payout_cents
  );

alter table public.installer_jobs
  add column retail_service_price_cents integer,
  add column platform_margin_cents integer,
  add column payout_status public.installer_payout_status not null default 'offered',
  add column payout_recorded_at timestamptz,
  add column payout_reference text,
  add column paid_at timestamptz;

-- Existing finder fees represented Volt Yard's retained amount. Preserve that economics
-- by deriving the installer payout from the catalog retail price available at migration time.
update public.installer_jobs job
set retail_service_price_cents = request.retail_service_price_cents,
    platform_margin_cents = least(request.retail_service_price_cents, greatest(0, job.finder_fee_cents)),
    payout_recorded_at = case when job.status = 'accepted' then job.accepted_at else null end
from public.service_requests request
where request.id = job.service_request_id
  and job.retail_service_price_cents is null;

alter table public.installer_jobs rename column finder_fee_cents to installer_payout_cents;

update public.installer_jobs
set installer_payout_cents = greatest(0, retail_service_price_cents - platform_margin_cents);

update public.installer_jobs
set payout_status = case
  when status = 'accepted' then 'pending'::public.installer_payout_status
  when status = 'withdrawn' then 'void'::public.installer_payout_status
  else 'offered'::public.installer_payout_status
end;

alter table public.installer_jobs
  alter column retail_service_price_cents set not null,
  alter column platform_margin_cents set not null,
  add constraint installer_jobs_managed_fulfillment_amounts_check check (
    installer_payout_cents >= 0
    and platform_margin_cents = retail_service_price_cents - installer_payout_cents
  );

alter table public.finder_fee_agreements rename to managed_service_agreements;
alter table public.managed_service_agreements rename column fee_cents to payout_cents;
drop policy if exists "Installers read their agreements" on public.managed_service_agreements;
create policy "Installers read their managed service agreements" on public.managed_service_agreements for select using (accepted_by = auth.uid());

create or replace function public.enqueue_paid_service_requests()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  update public.carts set status = 'converted' where id = new.cart_id;
  insert into public.installer_jobs (
    service_request_id, shop_id, retail_service_price_cents, installer_payout_cents, platform_margin_cents
  )
  select request.id, shop.id, request.retail_service_price_cents,
         request.installer_payout_cents, request.platform_margin_cents
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

create or replace function public.accept_installer_job(job_id uuid, agreement_version text)
returns boolean language plpgsql security definer set search_path = public as $$
declare job public.installer_jobs%rowtype;
begin
  if coalesce(trim(agreement_version), '') = '' then raise exception 'Managed service agreement version is required'; end if;
  select * into job from public.installer_jobs where id = job_id for update;
  if not found or job.status <> 'open' then return false; end if;
  if not exists (select 1 from public.shops where id = job.shop_id and owner_id = auth.uid()) then raise exception 'Not authorized to accept this job'; end if;
  if exists (select 1 from public.service_requests where id = job.service_request_id and accepted_shop_id is not null) then return false; end if;
  update public.installer_jobs
  set status = 'accepted', accepted_at = now(), payout_status = 'pending', payout_recorded_at = now()
  where id = job.id;
  update public.installer_jobs set status = 'withdrawn', payout_status = 'void'
  where service_request_id = job.service_request_id and id <> job.id and status = 'open';
  update public.service_requests set status = 'claimed', accepted_shop_id = job.shop_id where id = job.service_request_id;
  insert into public.managed_service_agreements (installer_job_id, shop_id, accepted_by, payout_cents, agreement_version)
  values (job.id, job.shop_id, auth.uid(), job.installer_payout_cents, agreement_version);
  return true;
end;
$$;

-- Finance records an external/manual payout here; this does not initiate a transfer.
create or replace function public.record_installer_job_payout(job_id uuid, payout_reference text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized to record a payout'; end if;
  update public.installer_jobs
  set payout_status = 'paid', payout_reference = nullif(trim(payout_reference), ''), paid_at = now()
  where id = job_id and status = 'accepted' and payout_status = 'pending';
  return found;
end;
$$;
revoke all on function public.record_installer_job_payout(uuid, text) from public;
grant execute on function public.record_installer_job_payout(uuid, text) to authenticated;

notify pgrst, 'reload schema';
