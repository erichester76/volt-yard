-- Combine the support-chain explanation into the homepage hero in every locale.
insert into public.localized_content (content_key, locale, value) values
  ('home.intro','en','From question to next step, all in one place. Amped Up Network helps you move from a guided issue to community knowledge, expert context, and, only when hands-on service is needed, the right mechanic network.'),
  ('home.intro','de','Von der Frage zum nächsten Schritt, alles an einem Ort. Amped Up Network führt Sie vom geführten Problem über Community-Wissen und Expertenkontext nur bei Bedarf zum passenden Werkstattnetzwerk.'),
  ('home.intro','fr','De la question à la prochaine étape, tout au même endroit. Amped Up Network vous accompagne d''un problème guidé aux connaissances de la communauté, au contexte expert et, si nécessaire, au bon réseau de mécaniciens.'),
  ('home.intro','es','De la pregunta al siguiente paso, todo en un solo lugar. Amped Up Network te lleva de un problema guiado al conocimiento de la comunidad, al contexto experto y, solo si hace falta servicio presencial, a la red de mecánicos adecuada.'),
  ('home.path_maintenance','en','Be proactive with maintenance'),('home.path_maintenance','de','Wartung aktiv angehen'),('home.path_maintenance','fr','Anticiper l''entretien'),('home.path_maintenance','es','Ser proactivo con el mantenimiento'),
  ('home.path_maintenance_intro','en','Use practical guides and community checklists to stay ahead.'),('home.path_maintenance_intro','de','Nutzen Sie praktische Anleitungen und Community-Checklisten, um vorauszuplanen.'),('home.path_maintenance_intro','fr','Utilisez des guides pratiques et des listes de la communauté pour anticiper.'),('home.path_maintenance_intro','es','Usa guías prácticas y listas de la comunidad para anticiparte.'),
  ('home.path_catalog','en','Enhance your ride'),('home.path_catalog','de','Ihr Fahrzeug aufwerten'),('home.path_catalog','fr','Améliorer votre véhicule'),('home.path_catalog','es','Mejora tu vehículo'),
  ('home.path_catalog_intro','en','Explore community favorites and compatible upgrades for your EV.'),('home.path_catalog_intro','de','Entdecken Sie Community-Favoriten und passende Upgrades für Ihr EV.'),('home.path_catalog_intro','fr','Découvrez les favoris de la communauté et des améliorations compatibles pour votre VE.'),('home.path_catalog_intro','es','Explora favoritos de la comunidad y mejoras compatibles para tu VE.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
