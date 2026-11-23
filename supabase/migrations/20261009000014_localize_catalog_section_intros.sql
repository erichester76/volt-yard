-- Localize the subtitle under services and upgrades titles.
insert into public.localized_content (content_key, locale, value) values
  ('catalog.services.intro','en','Start with an account so your vehicle and purchase history stay together, then explore hands-on EV service. After payment, compatible independent installers can claim the request.'),
  ('catalog.services.intro','de','Erstellen Sie ein Konto, damit Fahrzeug und Kaufhistorie zusammenbleiben, und entdecken Sie dann praktische EV-Services. Nach der Zahlung können passende unabhängige Installateure die Anfrage übernehmen.'),
  ('catalog.services.intro','fr','Créez un compte pour garder votre véhicule et votre historique d''achat ensemble, puis explorez le service VE sur place. Après le paiement, des installateurs indépendants compatibles peuvent prendre la demande.'),
  ('catalog.services.intro','es','Empieza con una cuenta para que tu vehículo y tu historial de compras permanezcan juntos, y luego explora el servicio presencial para VE. Después del pago, instaladores independientes compatibles pueden reclamar la solicitud.'),
  ('catalog.services.empty','en','Services are coming soon. Check back shortly.'),
  ('catalog.services.empty','de','Services folgen in Kürze. Schauen Sie bald wieder vorbei.'),
  ('catalog.services.empty','fr','Les services arrivent bientôt. Revenez sous peu.'),
  ('catalog.services.empty','es','Los servicios llegarán pronto. Vuelve a consultar en breve.'),
  ('catalog.upgrades.intro','en','Start with an account so your vehicle and purchase history stay together, then explore compatible EV packages and upgrades. After payment, compatible independent installers can claim the request.'),
  ('catalog.upgrades.intro','de','Erstellen Sie ein Konto, damit Fahrzeug und Kaufhistorie zusammenbleiben, und entdecken Sie dann passende EV-Pakete und Upgrades. Nach der Zahlung können passende unabhängige Installateure die Anfrage übernehmen.'),
  ('catalog.upgrades.intro','fr','Créez un compte pour garder votre véhicule et votre historique d''achat ensemble, puis explorez les forfaits et améliorations VE compatibles. Après le paiement, des installateurs indépendants compatibles peuvent prendre la demande.'),
  ('catalog.upgrades.intro','es','Empieza con una cuenta para que tu vehículo y tu historial de compras permanezcan juntos, y luego explora paquetes y mejoras compatibles para VE. Después del pago, instaladores independientes compatibles pueden reclamar la solicitud.'),
  ('catalog.upgrades.empty','en','Upgrades are coming soon. Check back shortly.'),
  ('catalog.upgrades.empty','de','Upgrades folgen in Kürze. Schauen Sie bald wieder vorbei.'),
  ('catalog.upgrades.empty','fr','Les améliorations arrivent bientôt. Revenez sous peu.'),
  ('catalog.upgrades.empty','es','Las mejoras llegarán pronto. Vuelve a consultar en breve.'),
  ('catalog.intro','en','Start with an account so your vehicle and purchase history stay together, then explore services and upgrades. After payment, compatible independent installers can claim the request.'),
  ('catalog.intro','de','Erstellen Sie ein Konto, damit Fahrzeug und Kaufhistorie zusammenbleiben, und entdecken Sie dann Services und Upgrades. Nach der Zahlung können passende unabhängige Installateure die Anfrage übernehmen.'),
  ('catalog.intro','fr','Créez un compte pour garder votre véhicule et votre historique d''achat ensemble, puis explorez les services et améliorations. Après le paiement, des installateurs indépendants compatibles peuvent prendre la demande.'),
  ('catalog.intro','es','Empieza con una cuenta para que tu vehículo y tu historial de compras permanezcan juntos, y luego explora servicios y mejoras. Después del pago, instaladores independientes compatibles pueden reclamar la solicitud.'),
  ('catalog.empty','en','Services and upgrades are coming soon. Check back shortly.'),
  ('catalog.empty','de','Services und Upgrades folgen in Kürze. Schauen Sie bald wieder vorbei.'),
  ('catalog.empty','fr','Les services et améliorations arrivent bientôt. Revenez sous peu.'),
  ('catalog.empty','es','Los servicios y las mejoras llegarán pronto. Vuelve a consultar en breve.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
