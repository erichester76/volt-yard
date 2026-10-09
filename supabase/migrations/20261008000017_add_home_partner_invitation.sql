-- Invite relevant EV service and customization professionals into the network.
insert into public.localized_content (content_key, locale, value) values
  ('home.partner_eyebrow','en','Interested partners'),
  ('home.partner_eyebrow','de','Interessierte Partner'),
  ('home.partner_eyebrow','fr','Partenaires intéressés'),
  ('home.partner_eyebrow','es','Socios interesados'),
  ('home.partner_title','en','EV mechanic? Sparky? Wrap artist? Tint master?'),
  ('home.partner_title','de','EV-Mechaniker? Elektriker? Folierer? Scheibentöner?'),
  ('home.partner_title','fr','Mécanicien VE ? Électricien ? Poseur de covering ? Spécialiste du teintage ?'),
  ('home.partner_title','es','¿Mecánico de VE? ¿Electricista? ¿Artista de vinilos? ¿Experto en polarizado?'),
  ('home.partner_intro','en','Want to join in on the fun? Sign up to be a network member today.'),
  ('home.partner_intro','de','Möchten Sie dabei sein? Melden Sie sich noch heute als Netzwerkmitglied an.'),
  ('home.partner_intro','fr','Envie de participer ? Inscrivez-vous dès aujourd’hui comme membre du réseau.'),
  ('home.partner_intro','es','¿Quieres sumarte? Regístrate hoy como miembro de la red.'),
  ('home.partner_action','en','Become a network member'),
  ('home.partner_action','de','Netzwerkmitglied werden'),
  ('home.partner_action','fr','Devenir membre du réseau'),
  ('home.partner_action','es','Hazte miembro de la red')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
