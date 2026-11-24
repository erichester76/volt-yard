-- Snapshot of Ohmmu Tesla 12V batteries on 2026-11-23. Amped Up resells these
-- upgrades. Prices are the listed price. Installer payout stays 0 until a
-- fulfillment offer is configured. Descriptions are original summaries, not copied listings.
-- These SKUs do not fit later Tesla 16V cars, including Highland, Juniper, refresh Model S/X, or Cybertruck.
insert into public.catalog_products (
  slug,
  name,
  description,
  long_description,
  kind,
  service_type,
  price_cents,
  installer_payout_cents,
  category_id,
  required_capability_id
)
select
  item.slug,
  item.name,
  item.description,
  item.long_description,
  'package',
  'aftermarket_upgrades',
  item.price_cents,
  0,
  category.id,
  capability.id
from (
  values
    (
      'ohmmu-b19-lithium-model-3',
      'Ohmmu B19 Lithium 12V for Model 3',
      'Drop-in lithium 12V battery for Tesla Model 3 (2017-2022.3). Resold from Ohmmu. Listed at $479.',
      'Fits Tesla Model 3 built through early 2022, not later 16V cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      47900
    ),
    (
      'ohmmu-b19-sodium-model-3',
      'Ohmmu B19 Sodium 12V for Model 3',
      'Drop-in sodium 12V battery for Tesla Model 3 (2017-2022.3). Resold from Ohmmu. Listed at $379.',
      'Fits Tesla Model 3 built through early 2022, not later 16V cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      37900
    ),
    (
      'ohmmu-b19-lithium-model-y',
      'Ohmmu B19 Lithium 12V for Model Y',
      'Drop-in lithium 12V battery for Tesla Model Y (2020-2022.3). Resold from Ohmmu. Listed at $479.',
      'Fits Tesla Model Y built through early 2022, not later 16V cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      47900
    ),
    (
      'ohmmu-b19-sodium-model-y',
      'Ohmmu B19 Sodium 12V for Model Y',
      'Drop-in sodium 12V battery for Tesla Model Y (2020-2022.3). Resold from Ohmmu. Listed at $379.',
      'Fits Tesla Model Y built through early 2022, not later 16V cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      37900
    ),
    (
      'ohmmu-u1r-lithium-model-s',
      'Ohmmu U1R Lithium 12V for Model S',
      'Drop-in lithium 12V battery for Tesla Model S (2012-2021.5). Resold from Ohmmu. Listed at $479.',
      'Fits pre-refresh Tesla Model S, not 2021+ refresh cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      47900
    ),
    (
      'ohmmu-u1r-sodium-model-s',
      'Ohmmu U1R Sodium 12V for Model S',
      'Drop-in sodium 12V battery for Tesla Model S (2012-2021.5). Resold from Ohmmu. Listed at $379.',
      'Fits pre-refresh Tesla Model S, not 2021+ refresh cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      37900
    ),
    (
      'ohmmu-b19r-lithium-model-x',
      'Ohmmu B19R Lithium 12V for Model X',
      'Drop-in lithium 12V battery for Tesla Model X (2016-2021). Resold from Ohmmu. Listed at $479.',
      'Fits pre-refresh Tesla Model X, not 2021+ refresh cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      47900
    ),
    (
      'ohmmu-b19r-sodium-model-x',
      'Ohmmu B19R Sodium 12V for Model X',
      'Drop-in sodium 12V battery for Tesla Model X (2016-2021). Resold from Ohmmu. Listed at $379.',
      'Fits pre-refresh Tesla Model X, not 2021+ refresh cars. Amped Up resells this Ohmmu battery. Installation is not included.',
      37900
    )
) as item(slug, name, description, long_description, price_cents)
join public.catalog_categories category on category.slug = 'upgrades'
left join public.service_capabilities capability on capability.slug = 'aftermarket-upgrades'
on conflict (slug) do nothing;
