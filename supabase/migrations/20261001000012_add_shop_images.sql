insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-images', 'shop-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create table public.shop_images (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order smallint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index shop_images_one_primary_idx on public.shop_images (shop_id) where is_primary;
alter table public.shop_images enable row level security;
create policy "Public reads published shop images" on public.shop_images for select using (exists (select 1 from public.shops where shops.id = shop_images.shop_id and shops.is_published));
create policy "Owners manage their images" on public.shop_images for all using (exists (select 1 from public.shops where shops.id = shop_images.shop_id and shops.owner_id = auth.uid())) with check (exists (select 1 from public.shops where shops.id = shop_images.shop_id and shops.owner_id = auth.uid()));
create policy "Admins manage images" on public.shop_images for all using (public.is_admin()) with check (public.is_admin());

create policy "Owners upload shop images" on storage.objects for insert to authenticated with check (bucket_id = 'shop-images' and (storage.foldername(name))[1] in (select id::text from public.shops where owner_id = auth.uid()));
create policy "Public reads shop images" on storage.objects for select using (bucket_id = 'shop-images');
create policy "Owners delete shop images" on storage.objects for delete to authenticated using (bucket_id = 'shop-images' and (storage.foldername(name))[1] in (select id::text from public.shops where owner_id = auth.uid()));
