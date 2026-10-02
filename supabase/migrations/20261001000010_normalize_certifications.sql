create table public.certifications (id uuid primary key default gen_random_uuid(), name text not null unique, category text not null, is_active boolean not null default true);
create table public.shop_certifications (shop_id uuid not null references public.shops(id) on delete cascade, certification_id uuid not null references public.certifications(id) on delete cascade, primary key (shop_id, certification_id));

insert into public.certifications (name, category) values
('ASE A6 Electrical/Electronic Systems','ASE'),('ASE A8 Engine Performance','ASE'),('ASE L3 Hybrid/Electric Vehicle Specialist','ASE'),('ASE xEV Electrical Safety','ASE'),('IMI EV Level 2','EV safety'),('IMI EV Level 3','EV safety'),('I-CAR EV/Hybrid Vehicle Training','Collision'),('High-voltage safety training','EV safety'),('Tesla service training','Manufacturer'),('Rivian service training','Manufacturer'),('GM EV service training','Manufacturer'),('Ford EV service training','Manufacturer'),('Hyundai/Kia EV service training','Manufacturer'),('Volkswagen/Audi EV service training','Manufacturer'),('BMW i service training','Manufacturer'),('Mercedes-Benz EQ service training','Manufacturer'),('Volvo/Polestar EV service training','Manufacturer'),('Nissan LEAF/ARIYA service training','Manufacturer') on conflict (name) do nothing;

insert into public.certifications (name, category) select distinct trim(value), 'Legacy' from public.shops cross join lateral string_to_table(coalesce(shops.certifications, ''), ',') value where trim(value) <> '' on conflict (name) do nothing;
insert into public.shop_certifications (shop_id, certification_id) select shops.id, certifications.id from public.shops cross join lateral string_to_table(coalesce(shops.certifications, ''), ',') value join public.certifications on certifications.name = trim(value) where trim(value) <> '' on conflict do nothing;

alter table public.certifications enable row level security;
alter table public.shop_certifications enable row level security;
create policy "Anyone can read active certifications" on public.certifications for select using (is_active);
create policy "Owners manage shop certifications" on public.shop_certifications for all using (exists (select 1 from public.shops where shops.id = shop_certifications.shop_id and shops.owner_id = auth.uid())) with check (exists (select 1 from public.shops where shops.id = shop_certifications.shop_id and shops.owner_id = auth.uid()));
create policy "Admins manage certification catalog" on public.certifications for all using (public.is_admin()) with check (public.is_admin());
