-- Preserve the issue case's denormalized vehicle values while requiring a valid catalog tuple.
create or replace function public.validate_issue_case_vehicle()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.vehicle_year is null and new.vehicle_make is null and new.vehicle_model is null then
    return new;
  end if;

  if new.vehicle_year is null or new.vehicle_make is null or new.vehicle_model is null
    or not exists (
      select 1
      from public.vehicle_catalog
      where model_year = new.vehicle_year
        and make = new.vehicle_make
        and model = new.vehicle_model
    ) then
    raise exception 'Issue case vehicle must match a vehicle catalog entry';
  end if;

  return new;
end;
$$;

drop trigger if exists issue_cases_validate_vehicle on public.issue_cases;
create trigger issue_cases_validate_vehicle
  before insert or update of vehicle_year, vehicle_make, vehicle_model on public.issue_cases
  for each row execute procedure public.validate_issue_case_vehicle();
