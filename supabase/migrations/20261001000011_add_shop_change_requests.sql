create type public.change_request_status as enum ('pending','approved','rejected');
create table public.shop_change_requests (
  id uuid primary key default gen_random_uuid(), shop_id uuid references public.shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  proposed_profile jsonb not null, proposed_vehicle_ids uuid[] not null default '{}', proposed_repair_types public.repair_type[] not null default '{}', proposed_certification_ids uuid[] not null default '{}',
  status public.change_request_status not null default 'pending', review_note text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.shop_change_requests enable row level security;
create policy "Owners manage draft requests" on public.shop_change_requests for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "Admins manage requests" on public.shop_change_requests for all using (public.is_admin()) with check (public.is_admin());
