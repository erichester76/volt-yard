alter table public.shops
  alter column owner_id drop not null,
  add column source text,
  add column source_id text,
  add column imported_at timestamptz,
  add constraint shops_source_id_unique unique (source, source_id);

create index shops_unclaimed_import_idx on public.shops (source, imported_at)
  where owner_id is null;
