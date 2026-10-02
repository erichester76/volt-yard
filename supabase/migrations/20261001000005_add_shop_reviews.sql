create table public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

alter table public.shop_reviews enable row level security;
create policy "Public can read reviews for published shops" on public.shop_reviews for select using (exists (select 1 from public.shops where shops.id = shop_reviews.shop_id and shops.is_published));
create policy "Owners can read their shop reviews" on public.shop_reviews for select using (exists (select 1 from public.shops where shops.id = shop_reviews.shop_id and shops.owner_id = auth.uid()));
