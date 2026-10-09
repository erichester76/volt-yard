-- Shorten the homepage promise while retaining the localized emphasis treatment.
insert into public.localized_content (content_key, locale, value) values
  ('home.title','en','Everything EV, in one place. {{accent}}'),
  ('home.title','de','Alles rund um EVs an einem Ort. {{accent}}'),
  ('home.title','fr','Tout pour les VE, au même endroit. {{accent}}'),
  ('home.title','es','Todo sobre VE, en un solo lugar. {{accent}}'),
  ('home.title_accent','en','Finally.'),
  ('home.title_accent','de','Endlich.'),
  ('home.title_accent','fr','Enfin.'),
  ('home.title_accent','es','Por fin.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
