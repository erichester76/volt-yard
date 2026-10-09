-- Clarify the partner-facing value proposition without making volume guarantees.
insert into public.localized_content (content_key, locale, value) values
  ('partnership.fit_title','en','Connecting qualified clients to qualified shops.'),
  ('partnership.fit_title','de','Qualifizierte Kunden mit qualifizierten Betrieben verbinden.'),
  ('partnership.fit_title','fr','Mettre en relation des clients qualifiés avec des ateliers qualifiés.'),
  ('partnership.fit_title','es','Conectamos clientes calificados con talleres calificados.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
