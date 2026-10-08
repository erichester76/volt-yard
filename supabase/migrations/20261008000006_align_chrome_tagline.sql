-- Keep the localized shared chrome aligned with the homepage tagline.
insert into public.localized_content (content_key, locale, value) values
  ('chrome.footer.tagline','en','EV ownership, made easy.'),('chrome.footer.tagline','de','EV-Besitz, leicht gemacht.'),('chrome.footer.tagline','fr','La propriété d''un VE, simplifiée.'),('chrome.footer.tagline','es','Tener un VE, más fácil.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
