-- Add a localized home path for people new to EV ownership.
insert into public.localized_content (content_key, locale, value) values
  ('home.path_new_owner','en','I''m a new EV owner'),
  ('home.path_new_owner','de','Ich bin neu im Besitz eines Elektroautos'),
  ('home.path_new_owner','fr','Je suis nouveau proprietaire d''un VE'),
  ('home.path_new_owner','es','Soy nuevo propietario de un VE'),
  ('home.path_new_owner_intro','en','Start with charging, maintenance, local support, and the practical habits that make EV ownership easier.'),
  ('home.path_new_owner_intro','de','Beginnen Sie mit Laden, Wartung, lokaler Hilfe und praktischen Gewohnheiten fuer einen leichteren Alltag mit dem Elektroauto.'),
  ('home.path_new_owner_intro','fr','Commencez par la recharge, l''entretien, l''aide locale et les habitudes pratiques qui facilitent la vie avec un VE.'),
  ('home.path_new_owner_intro','es','Comience con carga, mantenimiento, ayuda local y habitos practicos que facilitan la propiedad de un VE.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
