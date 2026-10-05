-- Use an explicit token so translators choose the accented word without markup injection.
insert into public.localized_content (content_key, locale, value) values
  ('home.title_accent', 'en', 'Diagnose'),
  ('home.title_accent', 'de', 'Diagnostizieren'),
  ('home.title_accent', 'fr', 'Diagnostiquer'),
  ('home.title_accent', 'es', 'Diagnostica')
on conflict (content_key, locale) do nothing;

update public.localized_content
set value = case locale
  when 'en' then '{{accent}} an issue.'
  when 'de' then '{{accent}} Sie ein Problem.'
  when 'fr' then '{{accent}} un problème.'
  when 'es' then '{{accent}} un problema.'
end
where content_key = 'home.title'
  and (locale, value) in (
    ('en', 'Diagnose an issue.'),
    ('de', 'Ein Problem diagnostizieren.'),
    ('fr', 'Diagnostiquer un problème.'),
    ('es', 'Diagnostica un problema.')
  );

notify pgrst, 'reload schema';
