-- Categories replace the catalog kind enum as the editable customer-facing taxonomy.
create table public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name),
  unique (slug)
);

create trigger catalog_categories_updated_at before update on public.catalog_categories
for each row execute procedure public.set_updated_at();

insert into public.catalog_categories (name, slug, description, sort_order) values
  ('Services', 'services', 'Individual EV service appointments.', 10),
  ('Packages', 'packages', 'Bundled EV care and ownership services.', 20);

alter table public.catalog_products add column category_id uuid references public.catalog_categories(id);

update public.catalog_products product
set category_id = category.id
from public.catalog_categories category
where category.slug = case product.kind
  when 'service' then 'services'
  when 'package' then 'packages'
end;

alter table public.catalog_products alter column category_id set not null;
create index catalog_products_category_id_idx on public.catalog_products(category_id);

alter table public.catalog_categories enable row level security;
create policy "Public reads active catalog categories" on public.catalog_categories
for select using (active);
create policy "Admins manage catalog categories" on public.catalog_categories
for all using (public.is_admin()) with check (public.is_admin());

-- New categories are intentionally independent of the legacy kind enum. Keep kind
-- nullable for historical records and installer matching compatibility.
alter table public.catalog_products alter column kind drop not null;

-- A hidden category also hides its items, while the separate admin policy retains
-- full visibility for catalog management.
drop policy if exists "Public reads active catalog" on public.catalog_products;
create policy "Public reads active catalog" on public.catalog_products for select using (
  active and exists (
    select 1 from public.catalog_categories category
    where category.id = catalog_products.category_id and category.active
  )
);

notify pgrst, 'reload schema';
