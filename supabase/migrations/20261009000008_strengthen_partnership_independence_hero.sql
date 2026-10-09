-- Put the independent-partner promise at the top of the partnership page.
insert into public.localized_content (content_key, locale, value) values
  ('partnership.title','en','Your brand. Your revenue. Your customer.'),
  ('partnership.title','de','Ihre Marke. Ihr Umsatz. Ihr Kunde.'),
  ('partnership.title','fr','Votre marque. Vos revenus. Votre client.'),
  ('partnership.title','es','Tu marca. Tus ingresos. Tu cliente.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
