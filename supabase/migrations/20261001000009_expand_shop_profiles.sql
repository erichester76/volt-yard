alter table public.shops
  add column email text,
  add column hours text,
  add column bay_count smallint check (bay_count >= 0),
  add column years_in_business smallint check (years_in_business >= 0),
  add column certifications text;
