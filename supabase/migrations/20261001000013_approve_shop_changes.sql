create or replace function public.approve_shop_change(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.shop_change_requests;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.shop_change_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'Pending request not found'; end if;
  if r.shop_id is null then
    insert into public.shops (owner_id,name,address,city,state,phone,email,website,hours,bay_count,years_in_business,certifications,description,is_published)
    values (r.owner_id,r.proposed_profile->>'name',r.proposed_profile->>'address',r.proposed_profile->>'city',r.proposed_profile->>'state',r.proposed_profile->>'phone',r.proposed_profile->>'email',r.proposed_profile->>'website',r.proposed_profile->>'hours',nullif(r.proposed_profile->>'bay_count','')::smallint,nullif(r.proposed_profile->>'years_in_business','')::smallint,null,r.proposed_profile->>'description',true)
    returning id into r.shop_id;
  else
    update public.shops set name=r.proposed_profile->>'name',address=r.proposed_profile->>'address',city=r.proposed_profile->>'city',state=r.proposed_profile->>'state',phone=r.proposed_profile->>'phone',email=r.proposed_profile->>'email',website=r.proposed_profile->>'website',hours=r.proposed_profile->>'hours',bay_count=nullif(r.proposed_profile->>'bay_count','')::smallint,years_in_business=nullif(r.proposed_profile->>'years_in_business','')::smallint,description=r.proposed_profile->>'description' where id=r.shop_id;
  end if;
  update public.shop_change_requests set shop_id=r.shop_id,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
end;
$$;
