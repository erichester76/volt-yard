alter table public.vehicle_catalog
  add column powertrain text check (powertrain in ('BEV', 'PHEV', 'HEV'));

create index vehicle_catalog_electrified_lookup_idx
  on public.vehicle_catalog (model_year, make, model, powertrain)
  where powertrain is not null;

-- The original NHTSA import cannot distinguish an EV from an ICE vehicle when
-- both share a model name. EPA records replace those entries with fuel data.
delete from public.vehicle_catalog where source = 'nhtsa';
