-- State the fragmented-search problem the connected support path solves.
insert into public.localized_content (content_key, locale, value) values
  ('home.journey_title','en','Stop repeating yourself across social media, reseller sites, and repair shops.'),
  ('home.journey_title','de','Hören Sie auf, sich in sozialen Medien, bei Händlern und Werkstätten zu wiederholen.'),
  ('home.journey_title','fr','Ne vous répétez plus sur les réseaux sociaux, les sites de revendeurs et auprès des ateliers.'),
  ('home.journey_title','es','Deja de repetir lo mismo en redes sociales, sitios de revendedores y talleres.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
