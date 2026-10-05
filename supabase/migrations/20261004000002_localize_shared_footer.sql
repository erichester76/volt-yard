-- Shared footer copy is editable through the existing localized-content workflow.
insert into public.localized_content (content_key, locale, value) values
  ('chrome.footer.tagline', 'en', 'Independent EV service, connected.'),
  ('chrome.footer.tagline', 'de', 'Unabhängiger EV-Service, vernetzt.'),
  ('chrome.footer.tagline', 'fr', 'Le service VE indépendant, connecté.'),
  ('chrome.footer.tagline', 'es', 'Servicio independiente para VE, conectado.'),
  ('chrome.footer.navigation', 'en', 'Footer navigation'),
  ('chrome.footer.navigation', 'de', 'Fußzeilennavigation'),
  ('chrome.footer.navigation', 'fr', 'Navigation de pied de page'),
  ('chrome.footer.navigation', 'es', 'Navegación del pie de página'),
  ('chrome.footer.membership', 'en', 'Membership'),
  ('chrome.footer.membership', 'de', 'Mitgliedschaft'),
  ('chrome.footer.membership', 'fr', 'Abonnement'),
  ('chrome.footer.membership', 'es', 'Membresía'),
  ('chrome.footer.contact', 'en', 'Contact'),
  ('chrome.footer.contact', 'de', 'Kontakt'),
  ('chrome.footer.contact', 'fr', 'Contact'),
  ('chrome.footer.contact', 'es', 'Contacto')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
