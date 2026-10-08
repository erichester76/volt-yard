-- Clarify the continuing guidance benefit of the homepage owner journeys.
insert into public.localized_content (content_key, locale, value) values
  ('home.paths_title','en','Tell us where to start. We''ll keep notes and guide you through next steps.'),
  ('home.paths_title','de','Sagen Sie uns, wo Sie anfangen möchten. Wir halten die Details fest und begleiten Sie durch die nächsten Schritte.'),
  ('home.paths_title','fr','Dites-nous par où commencer. Nous conserverons les notes et vous guiderons dans les prochaines étapes.'),
  ('home.paths_title','es','Dinos por dónde empezar. Guardaremos notas y te guiaremos en los siguientes pasos.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
