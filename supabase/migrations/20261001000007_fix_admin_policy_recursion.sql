create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Admins can manage shops" on public.shops;
drop policy if exists "Admins can manage reviews" on public.shop_reviews;

create policy "Admins can manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage shops" on public.shops for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage reviews" on public.shop_reviews for all using (public.is_admin()) with check (public.is_admin());
