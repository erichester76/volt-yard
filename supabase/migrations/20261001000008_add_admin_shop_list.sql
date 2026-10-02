create or replace function public.admin_shops()
returns setof public.shops
language sql
stable
security definer
set search_path = public
as $$
  select * from public.shops
  where public.is_admin()
  order by is_published, name;
$$;
