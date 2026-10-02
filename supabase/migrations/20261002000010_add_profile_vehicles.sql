-- A customer's garage stores catalog references so saved vehicles always remain valid.
create table public.profile_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicle_catalog(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (owner_id, vehicle_id)
);

create index profile_vehicles_owner_idx on public.profile_vehicles (owner_id, created_at desc);

alter table public.profile_vehicles enable row level security;

create policy "Users manage their garage vehicles"
  on public.profile_vehicles for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

notify pgrst, 'reload schema';
