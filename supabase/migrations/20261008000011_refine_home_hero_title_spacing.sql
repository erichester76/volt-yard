-- Remove terminal punctuation and preserve the accent separation in every locale.
insert into public.localized_content (content_key, locale, value) values
  ('home.title','en','Find your solution, {{accent}}'),
  ('home.title','de','Finden Sie Ihre Lösung, {{accent}}'),
  ('home.title','fr','Trouvez votre solution, {{accent}}'),
  ('home.title','es','Encuentra tu solución, {{accent}}')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
