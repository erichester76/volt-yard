-- Make the partner independence and community-led marketing model explicit.
insert into public.localized_content (content_key, locale, value) values
  ('partnership.case_title','en','Your brand. Your shop. A stronger front door.'),
  ('partnership.case_title','de','Ihre Marke. Ihr Betrieb. Eine stärkere Eingangstür.'),
  ('partnership.case_title','fr','Votre marque. Votre atelier. Une meilleure porte d''entrée.'),
  ('partnership.case_title','es','Tu marca. Tu taller. Una puerta de entrada más fuerte.'),
  ('partnership.case_intro','en','Amped Up Network is not a franchise. You retain your brand, pricing, operations, customer relationship, and the work you choose to take on. We are a referral and advisory network: a front door that helps owners understand who is a fit and advocates for clear, qualified partner choices.'),
  ('partnership.case_intro','de','Amped Up Network ist kein Franchise. Sie behalten Ihre Marke, Preise, Abläufe, Kundenbeziehung und die Arbeit, die Sie übernehmen möchten. Wir sind ein Empfehlungs- und Beratungsnetzwerk: eine Eingangstür, die Eigentümern hilft zu verstehen, wer passt, und sich für klare, qualifizierte Partnerentscheidungen einsetzt.'),
  ('partnership.case_intro','fr','Amped Up Network n''est pas une franchise. Vous conservez votre marque, vos prix, vos opérations, votre relation client et le travail que vous choisissez d''accepter. Nous sommes un réseau de recommandation et de conseil : une porte d''entrée qui aide les propriétaires à comprendre qui convient et défend des choix de partenaires clairs et qualifiés.'),
  ('partnership.case_intro','es','Amped Up Network no es una franquicia. Conservas tu marca, precios, operaciones, relación con el cliente y el trabajo que eliges asumir. Somos una red de referencias y asesoría: una puerta de entrada que ayuda a los propietarios a entender quién encaja y defiende elecciones claras de socios calificados.'),
  ('partnership.benefit_reputation','en','Market yourself by participating'),
  ('partnership.benefit_reputation','de','Vermarkten Sie sich durch Teilnahme'),
  ('partnership.benefit_reputation','fr','Faites votre promotion en participant'),
  ('partnership.benefit_reputation','es','Promociónate participando'),
  ('partnership.benefit_reputation_intro','en','Show your actual scope, credentials, supported vehicles, and verified outcomes. Share useful expertise in the community, support education and events, and build a reputation beyond a generic directory listing.'),
  ('partnership.benefit_reputation_intro','de','Zeigen Sie Ihren tatsächlichen Umfang, Ihre Nachweise, unterstützte Fahrzeuge und verifizierte Ergebnisse. Teilen Sie hilfreiche Expertise in der Community, unterstützen Sie Bildung und Veranstaltungen und bauen Sie einen Ruf auf, der über einen allgemeinen Verzeichniseintrag hinausgeht.'),
  ('partnership.benefit_reputation_intro','fr','Montrez votre véritable périmètre, vos qualifications, les véhicules pris en charge et les résultats vérifiés. Partagez une expertise utile dans la communauté, soutenez l''éducation et les événements, et construisez une réputation au-delà d''une fiche d''annuaire générique.'),
  ('partnership.benefit_reputation_intro','es','Muestra tu alcance real, credenciales, vehículos compatibles y resultados verificados. Comparte experiencia útil en la comunidad, apoya la educación y eventos, y construye una reputación más allá de un listado genérico.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
