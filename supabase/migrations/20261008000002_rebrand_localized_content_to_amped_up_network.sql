-- Rebrand editable public copy while preserving stable localized-content keys and policies.
update public.localized_content
set value = replace(value, 'Volt Yard', 'Amped Up Network')
where value like '%Volt Yard%';

-- The initial published release note predates localized editorial resources.
update public.resources
set
  title = replace(title, 'Volt Yard', 'Amped Up Network'),
  summary = replace(summary, 'Volt Yard', 'Amped Up Network'),
  body = replace(body, 'Volt Yard', 'Amped Up Network')
where title like '%Volt Yard%'
   or summary like '%Volt Yard%'
   or body like '%Volt Yard%';

insert into public.localized_content (content_key, locale, value) values
  ('chrome.footer.tagline', 'en', 'Independent EV ownership, connected.'),
  ('chrome.footer.tagline', 'de', 'Unabhängige EV-Unterstützung, vernetzt.'),
  ('chrome.footer.tagline', 'fr', 'Accompagnement VE indépendant, connecté.'),
  ('chrome.footer.tagline', 'es', 'Apoyo independiente para VE, conectado.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
