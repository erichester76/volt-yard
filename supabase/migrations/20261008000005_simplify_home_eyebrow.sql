-- Use a consumer-facing homepage eyebrow in every supported locale.
insert into public.localized_content (content_key, locale, value) values
  ('home.eyebrow','en','EV ownership, made easy.'),('home.eyebrow','de','EV-Besitz, leicht gemacht.'),('home.eyebrow','fr','La propriété d''un VE, simplifiée.'),('home.eyebrow','es','Tener un VE, más fácil.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
