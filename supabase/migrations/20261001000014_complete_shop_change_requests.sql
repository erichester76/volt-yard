alter table public.shop_change_requests
  add column proposed_images jsonb not null default '[]'::jsonb;

drop policy if exists "Owners manage draft requests" on public.shop_change_requests;
create policy "Owners read their requests" on public.shop_change_requests for select using (owner_id = auth.uid());
create policy "Owners create pending requests" on public.shop_change_requests for insert with check (owner_id = auth.uid() and status = 'pending');
create policy "Owners update pending requests" on public.shop_change_requests for update using (owner_id = auth.uid() and status = 'pending') with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists "Owners upload shop images" on storage.objects;
create policy "Owners upload shop images" on storage.objects for insert to authenticated with check (
  bucket_id = 'shop-images' and (
    (storage.foldername(name))[1] = auth.uid()::text or
    (storage.foldername(name))[1] in (select id::text from public.shops where owner_id = auth.uid())
  )
);

create or replace function public.approve_shop_change(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.shop_change_requests;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.shop_change_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'Pending request not found'; end if;

  if r.shop_id is null then
    select id into r.shop_id from public.shops where owner_id = r.owner_id order by created_at limit 1;
  end if;

  if r.shop_id is null then
    insert into public.shops (owner_id,name,address,city,state,phone,email,website,hours,bay_count,years_in_business,certifications,description,latitude,longitude,is_published)
    values (r.owner_id,r.proposed_profile->>'name',r.proposed_profile->>'address',r.proposed_profile->>'city',r.proposed_profile->>'state',r.proposed_profile->>'phone',r.proposed_profile->>'email',r.proposed_profile->>'website',r.proposed_profile->>'hours',nullif(r.proposed_profile->>'bay_count','')::smallint,nullif(r.proposed_profile->>'years_in_business','')::smallint,null,r.proposed_profile->>'description',nullif(r.proposed_profile->>'latitude','')::double precision,nullif(r.proposed_profile->>'longitude','')::double precision,true)
    returning id into r.shop_id;
  else
    update public.shops set name=r.proposed_profile->>'name',address=r.proposed_profile->>'address',city=r.proposed_profile->>'city',state=r.proposed_profile->>'state',phone=r.proposed_profile->>'phone',email=r.proposed_profile->>'email',website=r.proposed_profile->>'website',hours=r.proposed_profile->>'hours',bay_count=nullif(r.proposed_profile->>'bay_count','')::smallint,years_in_business=nullif(r.proposed_profile->>'years_in_business','')::smallint,description=r.proposed_profile->>'description',latitude=nullif(r.proposed_profile->>'latitude','')::double precision,longitude=nullif(r.proposed_profile->>'longitude','')::double precision where id=r.shop_id;
  end if;

  delete from public.shop_vehicles where shop_id = r.shop_id;
  insert into public.shop_vehicles (shop_id, vehicle_id)
  select r.shop_id, vehicle_id from unnest(r.proposed_vehicle_ids) vehicle_id;
  delete from public.shop_repair_types where shop_id = r.shop_id;
  insert into public.shop_repair_types (shop_id, repair_type)
  select r.shop_id, repair_type from unnest(r.proposed_repair_types) repair_type;
  delete from public.shop_certifications where shop_id = r.shop_id;
  insert into public.shop_certifications (shop_id, certification_id)
  select r.shop_id, certification_id from unnest(r.proposed_certification_ids) certification_id;
  delete from public.shop_images where shop_id = r.shop_id;
  insert into public.shop_images (shop_id, storage_path, alt_text, sort_order, is_primary)
  select r.shop_id, image.storage_path, image.alt_text, image.sort_order, image.is_primary
  from jsonb_to_recordset(r.proposed_images) as image(storage_path text, alt_text text, sort_order smallint, is_primary boolean);

  update public.shop_change_requests set shop_id=r.shop_id,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
end;
$$;

create or replace function public.reject_shop_change(request_id uuid, note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.shop_change_requests set status='rejected', review_note=note, reviewed_by=auth.uid(), reviewed_at=now()
  where id=request_id and status='pending';
  if not found then raise exception 'Pending request not found'; end if;
end;
$$;
