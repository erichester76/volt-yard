-- Center the partnership landing page on independent partner ownership and revenue.
insert into public.localized_content (content_key, locale, value) values
  ('partnership.title','en','Your brand. Your shop. Your revenue.'),
  ('partnership.title','de','Ihre Marke. Ihr Betrieb. Ihr Umsatz.'),
  ('partnership.title','fr','Votre marque. Votre atelier. Vos revenus.'),
  ('partnership.title','es','Tu marca. Tu taller. Tus ingresos.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
