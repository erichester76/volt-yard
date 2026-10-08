-- Position the homepage around the complete EV ownership experience.
insert into public.localized_content (content_key, locale, value) values
  ('home.title','en','The EV ownership experience you''ve been looking for. {{accent}}'),
  ('home.title','de','Das EV-Besitzerlebnis, nach dem Sie gesucht haben. {{accent}}'),
  ('home.title','fr','L''expérience de propriétaire de VE que vous cherchiez. {{accent}}'),
  ('home.title','es','La experiencia de tener un VE que estabas buscando. {{accent}}'),
  ('home.title_accent','en','Finally.'),
  ('home.title_accent','de','Endlich.'),
  ('home.title_accent','fr','Enfin.'),
  ('home.title_accent','es','Por fin.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
