-- Product detail content and imagery remain private at rest and are exposed only
-- for products that are currently visible in an active category.
alter table public.catalog_products
  add column long_description text not null default ''
  check (char_length(long_description) <= 12000);

create table public.catalog_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  alt_text text not null check (char_length(trim(alt_text)) between 1 and 280),
  sort_order smallint not null default 0 check (sort_order between 0 and 1000),
  created_at timestamptz not null default now()
);

create index catalog_product_images_product_order_idx
  on public.catalog_product_images (product_id, sort_order, created_at);

alter table public.catalog_product_images enable row level security;

create policy "Public reads active catalog product images"
  on public.catalog_product_images for select using (
    exists (
      select 1
      from public.catalog_products product
      join public.catalog_categories category on category.id = product.category_id
      where product.id = catalog_product_images.product_id
        and product.active
        and category.active
    )
  );

create policy "Admins manage catalog product images"
  on public.catalog_product_images for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-product-images',
  'catalog-product-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads active catalog product image objects"
  on storage.objects for select using (
    bucket_id = 'catalog-product-images'
    and exists (
      select 1
      from public.catalog_product_images image
      join public.catalog_products product on product.id = image.product_id
      join public.catalog_categories category on category.id = product.category_id
      where image.storage_path = storage.objects.name
        and product.active
        and category.active
    )
  );

create policy "Admins upload catalog product image objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalog-product-images'
    and public.is_admin()
    and (storage.foldername(name))[1] in (select id::text from public.catalog_products)
  );

create policy "Admins delete catalog product image objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'catalog-product-images' and public.is_admin());

notify pgrst, 'reload schema';
