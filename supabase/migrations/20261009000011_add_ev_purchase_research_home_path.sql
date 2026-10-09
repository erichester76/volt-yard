-- Add a localized home path for people researching an EV purchase.
insert into public.localized_content (content_key, locale, value) values
  ('home.path_purchase','en','I''m researching an EV purchase'),
  ('home.path_purchase','de','Ich recherchiere den Kauf eines Elektroautos'),
  ('home.path_purchase','fr','Je recherche un achat de VE'),
  ('home.path_purchase','es','Estoy investigando la compra de un VE'),
  ('home.path_purchase_intro','en','Compare real ownership experience, charging realities, practical costs, and the questions worth asking before you buy.'),
  ('home.path_purchase_intro','de','Vergleichen Sie echte Erfahrungen, Ladealltag, praktische Kosten und die Fragen, die vor dem Kauf wichtig sind.'),
  ('home.path_purchase_intro','fr','Comparez les experiences reelles, la recharge, les couts pratiques et les questions utiles avant votre achat.'),
  ('home.path_purchase_intro','es','Compare experiencias reales, carga, costos practicos y las preguntas que conviene hacer antes de comprar.')
on conflict (content_key, locale) do update set value = excluded.value;

notify pgrst, 'reload schema';
