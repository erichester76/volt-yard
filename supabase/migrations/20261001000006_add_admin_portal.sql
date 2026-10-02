alter table public.profiles add column is_admin boolean not null default false;

create policy "Users can read their own profile" on public.profiles for select using (id = auth.uid());
create policy "Admins can manage profiles" on public.profiles for all using (exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin));
create policy "Admins can manage shops" on public.shops for all using (exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin)) with check (exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin));
create policy "Admins can manage reviews" on public.shop_reviews for all using (exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin));
