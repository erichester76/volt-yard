-- Attach imported reseller upgrades to the Tesla years already in vehicle_catalog.
-- Year bounds follow the vendor fit notes. A partial model year is included because
-- the catalog has no build-date field. Installation is still not included.
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
      'evoffer-model-3-y-second-row-display',
      'Model 3/Y 8.6" Second-row Display',
      'Rear entertainment screen for Model 3 and Model Y. Resold from EVOffer. Listed at $369.',
      'Fits Tesla Model 3 and Model Y. Amped Up resells this EVOffer upgrade. Installation is not included, and fit depends on the vehicle.',
      36900
    ),
    (
      'evoffer-model-3-y-frunk-knock-kit',
      'Model 3/Y Frunk Knock Kit',
      'Knock-to-open kit for a Model 3 or Model Y front trunk. Resold from EVOffer. Listed at $89.',
      'Fits Tesla Model 3 and Model Y. Amped Up resells this EVOffer upgrade. Installation is not included.',
      8900
    ),
    (
      'evoffer-model-3-y-digital-rear-view-mirror',
      'Model 3/Y Digital Rear View Mirror',
      'Digital rear-view mirror for Model 3 and Model Y. Resold from EVOffer. Listed at $399.',
      'Fits Tesla Model 3 and Model Y. Amped Up resells this EVOffer upgrade. Installation is not included.',
      39900
    ),
    (
      'evoffer-model-3-y-heated-steering-module',
      'Model 3/Y Heated Steering Module',
      'Heated steering module for Model 3 and Model Y. Resold from EVOffer. Listed from $449.',
      'Configurations can cost more than the listed starting price. Amped Up resells this EVOffer upgrade. Installation is not included.',
      44900
    ),
    (
      'evoffer-model-3-y-highland-steering-wheel',
      'Model 3/Y Highland Style Steering Wheel',
      'Round Highland-style steering wheel for Model 3 and Model Y. Resold from EVOffer. Listed from $449.',
      'Configurations can cost more than the listed starting price. Amped Up resells this EVOffer upgrade. Installation is not included.',
      44900
    ),
    (
      'evoffer-model-3-y-instrument-cluster',
      'Model 3/Y 10.8" Instrument Cluster',
      'Instrument cluster with AirPlay and CarPlay for Model 3 and Model Y. Resold from EVOffer. Listed at $489.',
      'Fits Tesla Model 3 and Model Y. Amped Up resells this EVOffer upgrade. Installation is not included, and fit depends on the vehicle.',
      48900
    ),
    (
      'evoffer-model-3-y-oem-ambient-light',
      'Model 3/Y OEM Style Ambient Light',
      'Factory-style ambient lighting for Model 3 and Model Y. Resold from EVOffer. Listed at $299.',
      'Fits Tesla Model 3 and Model Y. Amped Up resells this EVOffer upgrade. Installation is not included.',
      29900
    ),
    (
      'evoffer-model-3-y-2025-gear-stalk',
      'Model 3/Y 2025+ Gear Stalk',
      'OEM-style gear stalk for 2025 and newer Model 3 and Model Y. Resold from EVOffer. Listed at $239.',
      'Not for earlier Model 3 or Model Y cars. Amped Up resells this EVOffer upgrade. Installation is not included.',
      23900
    ),
    (
      'evoffer-model-3-y-unmuted-audio',
      'Model 3/Y Unmuted Audio',
      'Speaker upgrade for Model 3 and Model Y. Resold from EVOffer. Listed from $599.',
      'The required variant depends on build date and audio system. Configurations can cost more than the starting price. Installation is not included.',
      59900
    ),
    (
      'evoffer-model-3-y-fusionlink',
      'Model 3/Y FusionLink',
      'CarPlay and Android Auto interface for the Model 3 or Model Y screen. Resold from EVOffer. Listed at $399.',
      'The required variant depends on the car computer and screen. Amped Up resells this EVOffer upgrade. Installation is not included.',
      39900
    ),
    (
      'evoffer-model-y-rear-seat-extension',
      'Model Y Rear Seat Extension',
      'Rear seat base extension for Model Y (2020-2024). Resold from EVOffer. Listed from $199.',
      'Not for 2025+ Model Y. Configurations can cost more than the starting price. Installation is not included.',
      19900
    ),
    (
      'evoffer-model-3-y-plaid-style-sport-seats',
      'Model 3/Y Plaid Style Sport Seats',
      'Plaid-style seat set for Model 3 and Model Y. Resold from EVOffer. Listed from $899.',
      'Configurations can cost more than the listed starting price. Amped Up resells this EVOffer upgrade. Installation is not included.',
      89900
    )
) as item(slug, name, description, long_description, price_cents)
join public.catalog_categories category on category.slug = 'upgrades'
left join public.service_capabilities capability on capability.slug = 'aftermarket-upgrades'
on conflict (slug) do nothing;

insert into public.product_vehicle_compatibility (product_id, vehicle_id)
select product.id, vehicle.id
from (
  values
    ('ohmmu-b19-lithium-model-3', 'Model 3', 2017, 2022),
    ('ohmmu-b19-sodium-model-3', 'Model 3', 2017, 2022),
    ('ohmmu-b19-lithium-model-y', 'Model Y', 2020, 2022),
    ('ohmmu-b19-sodium-model-y', 'Model Y', 2020, 2022),
    ('ohmmu-u1r-lithium-model-s', 'Model S', 2012, 2021),
    ('ohmmu-u1r-sodium-model-s', 'Model S', 2012, 2021),
    ('ohmmu-b19r-lithium-model-x', 'Model X', 2016, 2021),
    ('ohmmu-b19r-sodium-model-x', 'Model X', 2016, 2021),
    ('evoffer-model-3-electric-tailgate', 'Model 3', 2017, 2026),
    ('evoffer-model-3-electric-frunk', 'Model 3', 2017, 2026),
    ('evoffer-model-3-sr-speaker-activation', 'Model 3', 2017, 2026),
    ('evoffer-model-y-electric-frunk', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-ultra-bright-led', 'Model 3', 2017, 2023),
    ('evoffer-model-3-y-ultra-bright-led', 'Model Y', 2020, 2024),
    ('evoffer-model-s-x-ultra-bright-led', 'Model S', 2012, 2020),
    ('evoffer-model-s-x-ultra-bright-led', 'Model X', 2016, 2020),
    ('evoffer-model-s-electric-frunk', 'Model S', 2012, 2026),
    ('evoffer-model-x-electric-frunk', 'Model X', 2016, 2026),
    ('evoffer-model-3-y-ludicrous-style-sport-seats', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-ludicrous-style-sport-seats', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-hdmi-interface', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-hdmi-interface', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-tailgate-foot-activation', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-tailgate-foot-activation', 'Model Y', 2020, 2026),
    ('evoffer-model-s-x-tailgate-foot-activation', 'Model S', 2012, 2026),
    ('evoffer-model-s-x-tailgate-foot-activation', 'Model X', 2016, 2026),
    ('evoffer-model-3-y-second-row-display', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-second-row-display', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-frunk-knock-kit', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-frunk-knock-kit', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-digital-rear-view-mirror', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-digital-rear-view-mirror', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-heated-steering-module', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-heated-steering-module', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-highland-steering-wheel', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-highland-steering-wheel', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-instrument-cluster', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-instrument-cluster', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-oem-ambient-light', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-oem-ambient-light', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-2025-gear-stalk', 'Model 3', 2025, 2026),
    ('evoffer-model-3-y-2025-gear-stalk', 'Model Y', 2025, 2026),
    ('evoffer-model-3-y-unmuted-audio', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-unmuted-audio', 'Model Y', 2020, 2026),
    ('evoffer-model-3-y-fusionlink', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-fusionlink', 'Model Y', 2020, 2026),
    ('evoffer-model-y-rear-seat-extension', 'Model Y', 2020, 2024),
    ('evoffer-model-3-y-plaid-style-sport-seats', 'Model 3', 2017, 2026),
    ('evoffer-model-3-y-plaid-style-sport-seats', 'Model Y', 2020, 2026)
) as fit(slug, model, year_from, year_to)
join public.catalog_products product on product.slug = fit.slug
join public.vehicle_catalog vehicle
  on vehicle.make = 'Tesla'
 and vehicle.model = fit.model
 and vehicle.model_year between fit.year_from and fit.year_to
on conflict (product_id, vehicle_id) do nothing;
