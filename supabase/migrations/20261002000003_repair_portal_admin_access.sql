-- Commerce introduced installer jobs, but not permission to read the request
-- embedded in each job. Keep the customer data visible only to the shop offered it.
create policy "Installers read assigned service requests" on public.service_requests
  for select using (exists (
    select 1
    from public.installer_jobs job
    join public.shops shop on shop.id = job.shop_id
    where job.service_request_id = service_requests.id
      and shop.owner_id = auth.uid()
  ));

-- Administrators need the same complete catalog visibility as their management UI,
-- including inactive categories and products. These policies are deliberately
-- additive to preserve customer and owner access paths.
create policy "Admins read commerce orders" on public.orders
  for select using (public.is_admin());
create policy "Admins read commerce service requests" on public.service_requests
  for select using (public.is_admin());
create policy "Admins read installer jobs" on public.installer_jobs
  for select using (public.is_admin());
create policy "Admins read installer notifications" on public.installer_notifications
  for select using (public.is_admin());
create policy "Admins read managed service agreements" on public.managed_service_agreements
  for select using (public.is_admin());

notify pgrst, 'reload schema';
