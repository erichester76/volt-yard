-- Move the partner value proposition into the hero and introduce the unified program narrative.
insert into public.localized_content (content_key, locale, value) values
  ('partnership.title','en','Connecting qualified clients to qualified shops.'),
  ('partnership.title','de','Qualifizierte Kunden mit qualifizierten Betrieben verbinden.'),
  ('partnership.title','fr','Mettre en relation des clients qualifiés avec des ateliers qualifiés.'),
  ('partnership.title','es','Conectamos clientes calificados con talleres calificados.'),
  ('partnership.intro','en','A reviewed referral and advisory network for EV repair, electrical, appearance, and aftermarket specialists.'),
  ('partnership.intro','de','Ein geprüftes Empfehlungs- und Beratungsnetzwerk für Spezialisten für EV-Reparatur, Elektrik, Fahrzeugoptik und Aftermarket.'),
  ('partnership.intro','fr','Un réseau de recommandation et de conseil vérifié pour les spécialistes de la réparation, de l''électricité, de l''esthétique et de l''après-vente des VE.'),
  ('partnership.intro','es','Una red revisada de referencias y asesoría para especialistas en reparación, electricidad, estética y posventa de VE.'),
  ('partnership.program_eyebrow','en','How the program works'),
  ('partnership.program_eyebrow','de','So funktioniert das Programm'),
  ('partnership.program_eyebrow','fr','Comment fonctionne le programme'),
  ('partnership.program_eyebrow','es','Cómo funciona el programa'),
  ('partnership.program_title','en','Build a trusted local presence, then grow with the network.'),
  ('partnership.program_title','de','Bauen Sie eine vertrauenswürdige lokale Präsenz auf und wachsen Sie dann mit dem Netzwerk.'),
  ('partnership.program_title','fr','Construisez une présence locale de confiance, puis grandissez avec le réseau.'),
  ('partnership.program_title','es','Construye una presencia local confiable y luego crece con la red.'),
  ('partnership.program_intro','en','The program brings together practical marketing support, a clear review path, and commercial terms that are understood before you join.'),
  ('partnership.program_intro','de','Das Programm verbindet praktische Marketingunterstützung, einen klaren Prüfpfad und kommerzielle Bedingungen, die vor dem Beitritt verstanden werden.'),
  ('partnership.program_intro','fr','Le programme réunit un soutien marketing pratique, un parcours d''examen clair et des conditions commerciales comprises avant votre adhésion.'),
  ('partnership.program_intro','es','El programa reúne apoyo práctico de marketing, una ruta clara de revisión y términos comerciales que se comprenden antes de unirte.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
