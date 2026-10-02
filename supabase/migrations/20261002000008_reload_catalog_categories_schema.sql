-- A PGRST205 response after the category migration means the table was never
-- created or PostgREST has not consumed the prior migration's schema reload.
do $$
begin
  if to_regclass('public.catalog_categories') is null then
    raise exception
      'catalog_categories is missing; apply 20261002000002_add_catalog_categories.sql before reloading the PostgREST schema';
  end if;
end;
$$;

notify pgrst, 'reload schema';
