insert into public.localized_content (content_key, locale, value) values
  ('home.try_cta', 'en', 'Try it out'),
  ('home.try_cta', 'de', 'Probieren Sie es aus'),
  ('home.try_cta', 'fr', 'Essayez-le'),
  ('home.try_cta', 'es', 'Pruébalo')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
