-- Keep the localized hero promise aligned with the partnership landing page.
insert into public.localized_content (content_key, locale, value) values
  ('partnership.title','en','Your Brand. Our Community. Stronger Together.'),
  ('partnership.title','de','Ihre Marke. Unsere Community. Gemeinsam staerker.'),
  ('partnership.title','fr','Votre marque. Notre communaute. Plus forts ensemble.'),
  ('partnership.title','es','Tu marca. Nuestra comunidad. Mas fuertes juntos.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
