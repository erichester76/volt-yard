-- Use a more personal lead-in for the homepage owner journeys.
insert into public.localized_content (content_key, locale, value) values
  ('home.paths_title','en','Tell us where to start. We''ll take notes and guide you.'),
  ('home.paths_title','de','Sagen Sie uns, wo Sie anfangen möchten. Wir halten die Details fest und begleiten Sie.'),
  ('home.paths_title','fr','Dites-nous par où commencer. Nous prendrons des notes et vous guiderons.'),
  ('home.paths_title','es','Dinos por dónde empezar. Tomaremos notas y te guiaremos.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
