-- Editable interface copy. Content keys are application contracts; values are safe public copy.
create table if not exists public.localized_content (
  content_key text not null check (content_key ~ '^[a-z0-9][a-z0-9._-]{0,119}$'),
  locale text not null check (locale in ('en', 'de', 'fr', 'es')),
  value text not null check (char_length(value) between 1 and 10000),
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (content_key, locale)
);

create index if not exists localized_content_locale_published_idx
  on public.localized_content (locale, content_key) where is_published;

alter table public.localized_content enable row level security;
create policy "Public reads published localized content" on public.localized_content
  for select using (is_published);
create policy "Admins manage localized content" on public.localized_content
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.set_localized_content_audit_fields()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end; $$;
drop trigger if exists localized_content_audit_fields on public.localized_content;
create trigger localized_content_audit_fields before insert or update on public.localized_content
  for each row execute function public.set_localized_content_audit_fields();

insert into public.localized_content (content_key, locale, value) values
  ('chrome.nav.diagnose','en','Diagnose'),('chrome.nav.diagnose','de','Diagnose'),('chrome.nav.diagnose','fr','Diagnostic'),('chrome.nav.diagnose','es','Diagnosticar'),
  ('chrome.nav.shops','en','Shops'),('chrome.nav.shops','de','Werkstätten'),('chrome.nav.shops','fr','Ateliers'),('chrome.nav.shops','es','Talleres'),
  ('chrome.nav.services','en','Services & upgrades'),('chrome.nav.services','de','Services & Upgrades'),('chrome.nav.services','fr','Services et améliorations'),('chrome.nav.services','es','Servicios y mejoras'),
  ('chrome.nav.community','en','Community'),('chrome.nav.community','de','Community'),('chrome.nav.community','fr','Communauté'),('chrome.nav.community','es','Comunidad'),
  ('chrome.action.cart','en','Cart'),('chrome.action.cart','de','Warenkorb'),('chrome.action.cart','fr','Panier'),('chrome.action.cart','es','Carrito'),
  ('chrome.action.profile','en','Profile'),('chrome.action.profile','de','Profil'),('chrome.action.profile','fr','Profil'),('chrome.action.profile','es','Perfil'),
  ('chrome.action.sign_in','en','Sign in'),('chrome.action.sign_in','de','Anmelden'),('chrome.action.sign_in','fr','Se connecter'),('chrome.action.sign_in','es','Iniciar sesión'),
  ('chrome.action.menu','en','Menu'),('chrome.action.menu','de','Menü'),('chrome.action.menu','fr','Menu'),('chrome.action.menu','es','Menú'),
  ('chrome.footer.tagline','en','Independent EV service, connected.'),('chrome.footer.tagline','de','Unabhängiger EV-Service, vernetzt.'),('chrome.footer.tagline','fr','Le service VE indépendant, connecté.'),('chrome.footer.tagline','es','Servicio independiente para VE, conectado.'),
  ('home.eyebrow','en','Let us get you help'),('home.eyebrow','de','Wir bringen Sie weiter'),('home.eyebrow','fr','Trouvons la bonne aide'),('home.eyebrow','es','Encontremos la ayuda adecuada'),
  ('home.title','en','Diagnose an issue.'),('home.title','de','Ein Problem diagnostizieren.'),('home.title','fr','Diagnostiquer un problème.'),('home.title','es','Diagnostica un problema.'),
  ('home.intro','en','Search proven solutions, tap into a knowledgeable EV community, or get a remote diagnosis from a mechanic. Visit a shop only if you need to.'),('home.intro','de','Finden Sie bewährte Lösungen, nutzen Sie die Erfahrung der EV-Community oder erhalten Sie eine Ferndiagnose von Fachleuten. Besuchen Sie eine Werkstatt nur, wenn es nötig ist.'),('home.intro','fr','Trouvez des solutions éprouvées, échangez avec une communauté VE experte ou obtenez un diagnostic à distance. Rendez-vous en atelier seulement si nécessaire.'),('home.intro','es','Encuentra soluciones probadas, consulta a una comunidad experta de VE u obtén un diagnóstico remoto. Visita un taller solo cuando sea necesario.'),
  ('home.diagnose_cta','en','Diagnose an issue'),('home.diagnose_cta','de','Problem diagnostizieren'),('home.diagnose_cta','fr','Diagnostiquer un problème'),('home.diagnose_cta','es','Diagnosticar un problema'),
  ('home.find_title','en','Find a mechanic if you already know what you need.'),('home.find_title','de','Finden Sie einen Fachbetrieb, wenn Sie bereits wissen, was Sie brauchen.'),('home.find_title','fr','Trouvez un mécanicien si vous savez déjà ce dont vous avez besoin.'),('home.find_title','es','Encuentra un mecánico si ya sabes lo que necesitas.'),
  ('issues.eyebrow','en','Guided issue workflow'),('issues.eyebrow','de','Geführter Problemablauf'),('issues.eyebrow','fr','Parcours de diagnostic guidé'),('issues.eyebrow','es','Flujo guiado de incidencias'),
  ('issues.title','en','Start with what your vehicle is telling you.'),('issues.title','de','Beginnen Sie mit den Signalen Ihres Fahrzeugs.'),('issues.title','fr','Commencez par ce que votre véhicule vous indique.'),('issues.title','es','Empieza por lo que tu vehículo te está indicando.'),
  ('catalog.eyebrow','en','Services & upgrades'),('catalog.eyebrow','de','Services & Upgrades'),('catalog.eyebrow','fr','Services et améliorations'),('catalog.eyebrow','es','Servicios y mejoras'),
  ('catalog.title','en','Care, lined up.'),('catalog.title','de','Service, der bereitsteht.'),('catalog.title','fr','L''entretien, bien organisé.'),('catalog.title','es','El cuidado, bien organizado.'),
  ('community.eyebrow','en','Volt Yard community'),('community.eyebrow','de','Volt-Yard-Community'),('community.eyebrow','fr','Communauté Volt Yard'),('community.eyebrow','es','Comunidad Volt Yard'),
  ('community.title','en','Ask owners who have been there.'),('community.title','de','Fragen Sie Besitzer mit Erfahrung.'),('community.title','fr','Échangez avec des propriétaires qui connaissent le sujet.'),('community.title','es','Pregunta a propietarios que ya han pasado por ello.'),
  ('membership.eyebrow','en','Memberships'),('membership.eyebrow','de','Mitgliedschaften'),('membership.eyebrow','fr','Abonnements'),('membership.eyebrow','es','Membresías'),
  ('membership.title','en','Choose the help you need.'),('membership.title','de','Wählen Sie die Unterstützung, die Sie brauchen.'),('membership.title','fr','Choisissez l''aide dont vous avez besoin.'),('membership.title','es','Elige la ayuda que necesitas.'),
  ('portal.title','en','Partner portal'),('portal.title','de','Partnerportal'),('portal.title','fr','Portail partenaires'),('portal.title','es','Portal de socios'),
  ('admin.title','en','Review submissions.'),('admin.title','de','Einreichungen prüfen.'),('admin.title','fr','Examiner les soumissions.'),('admin.title','es','Revisar envíos.')
on conflict (content_key, locale) do update set value = excluded.value;

revoke all on public.localized_content from public;
grant select on public.localized_content to anon, authenticated;
notify pgrst, 'reload schema';
