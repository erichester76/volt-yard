-- Restore the mechanic-search pathway while framing the home hero around the full Volt Yard network.
insert into public.localized_content (content_key, locale, value) values
  ('home.eyebrow', 'en', 'The independent EV ownership network'),
  ('home.eyebrow', 'de', 'Das unabhängige EV-Netzwerk für Eigentümer'),
  ('home.eyebrow', 'fr', 'Le réseau indépendant des propriétaires de VE'),
  ('home.eyebrow', 'es', 'La red independiente para propietarios de VE'),
  ('home.title', 'en', 'Everything EV, {{accent}} together.'),
  ('home.title', 'de', 'Alles für Ihr EV, {{accent}} vereint.'),
  ('home.title', 'fr', 'Tout pour votre VE, {{accent}} réuni.'),
  ('home.title', 'es', 'Todo para tu VE, {{accent}} reunido.'),
  ('home.title_accent', 'en', 'all'),
  ('home.title_accent', 'de', 'an einem Ort'),
  ('home.title_accent', 'fr', 'au même endroit'),
  ('home.title_accent', 'es', 'en un solo lugar'),
  ('home.intro', 'en', 'Find trusted service, join a club of owners, trade real-world advice, and explore upgrades in one connected place.'),
  ('home.intro', 'de', 'Finden Sie vertrauenswürdigen Service, treten Sie einem Club von Eigentümern bei, tauschen Sie praktische Erfahrungen aus und entdecken Sie Upgrades an einem Ort.'),
  ('home.intro', 'fr', 'Trouvez un service fiable, rejoignez un club de propriétaires, échangez des conseils concrets et découvrez des améliorations au même endroit.'),
  ('home.intro', 'es', 'Encuentra servicio de confianza, únete a un club de propietarios, comparte consejos reales y descubre mejoras en un solo lugar.'),
  ('home.find_title', 'en', 'Find a mechanic if you already know what you need.'),
  ('home.find_title', 'de', 'Finden Sie einen Fachbetrieb, wenn Sie bereits wissen, was Sie brauchen.'),
  ('home.find_title', 'fr', 'Trouvez un mécanicien si vous savez déjà ce dont vous avez besoin.'),
  ('home.find_title', 'es', 'Encuentra un mecánico si ya sabes lo que necesitas.'),
  ('home.find_intro', 'en', 'Search trusted independent EV specialists near you.'),
  ('home.find_intro', 'de', 'Suchen Sie vertrauenswürdige unabhängige EV-Spezialisten in Ihrer Nähe.'),
  ('home.find_intro', 'fr', 'Recherchez des spécialistes VE indépendants et fiables près de chez vous.'),
  ('home.find_intro', 'es', 'Busca especialistas independientes de VE de confianza cerca de ti.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
