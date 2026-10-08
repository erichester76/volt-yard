-- Refine the community-first homepage promise in every supported locale.
insert into public.localized_content (content_key, locale, value) values
  ('home.title','en','Find your solution, {{accent}}.'),('home.title','de','Finden Sie Ihre Lösung, {{accent}}.'),('home.title','fr','Trouvez votre solution, {{accent}}.'),('home.title','es','Encuentra tu solución, {{accent}}.'),
  ('home.title_accent','en','faster'),('home.title_accent','de','schneller'),('home.title_accent','fr','plus vite'),('home.title_accent','es','más rápido'),
  ('home.journey_title','en','From question to next step, all in one place.'),('home.journey_title','de','Von der Frage zum nächsten Schritt, alles an einem Ort.'),('home.journey_title','fr','De la question à la prochaine étape, tout au même endroit.'),('home.journey_title','es','De la pregunta al siguiente paso, todo en un solo lugar.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
