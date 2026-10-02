create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Auth must remain available even if an optional profile row cannot be made.
  raise warning 'Could not create profile for auth user %: %', new.id, sqlerrm;
  return new;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant insert on public.profiles to supabase_auth_admin;
