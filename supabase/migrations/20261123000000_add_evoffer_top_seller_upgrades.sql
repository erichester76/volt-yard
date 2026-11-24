-- Snapshot of EVOffer's popularity ranking on 2026-11-23. Amped Up resells these
-- upgrades. Prices are the current listed price, or the lowest listed price when
-- EVOffer sells configurations as a range. Installer payout stays 0 until a
-- fulfillment offer is configured. Descriptions are original summaries, not copied listings.
insert into public.catalog_categories (name, slug, description, sort_order)
select 'Upgrades', 'upgrades', 'Aftermarket EV upgrades.', 30
where not exists (
  select 1 from public.catalog_categories where slug = 'upgrades'
);

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
      'evoffer-model-3-electric-tailgate',
      'Model 3 Electric Tailgate',
      'Hands-free open and close for a Model 3 tailgate. Resold from EVOffer. Listed at $359.',
      'Fits Tesla Model 3. Amped Up resells this EVOffer top seller. Installation is not included, and fit depends on the vehicle.',
      35900
    ),
    (
      'evoffer-model-y-electric-frunk',
      'Model Y Electric Frunk',
      'Power open and close for a Model Y front trunk. Resold from EVOffer. Listed at $349.',
      'Fits Tesla Model Y. Amped Up resells this EVOffer top seller. Installation is not included.',
      34900
    ),
    (
      'evoffer-model-3-electric-frunk',
      'Model 3 Electric Frunk',
      'Power open and close for a Model 3 front trunk. Resold from EVOffer. Listed at $349.',
      'Fits Tesla Model 3. Amped Up resells this EVOffer top seller. Installation is not included.',
      34900
    ),
    (
      'evoffer-model-3-sr-speaker-activation',
      'Model 3 SR Speaker Activation',
      'Harness to activate inactive speakers on eligible Model 3 SR, SR+, and RWD cars. Resold from EVOffer. Listed at $69.',
      'Check the build date before ordering. Amped Up resells this EVOffer top seller. Installation is not included.',
      6900
    ),
    (
      'evoffer-model-3-y-ultra-bright-led',
      'Model 3/Y Ultra-bright LED',
      'Sold per LED for Model 3 (2017-2023) and Model Y (2020-2024). Resold from EVOffer. Listed at $9 each.',
      'Not for Model 3 2024+ or Model Y 2025+. Order one row per bulb. Amped Up resells this EVOffer top seller.',
      900
    ),
    (
      'evoffer-model-s-x-ultra-bright-led',
      'Model S/X Ultra-bright LED',
      'Sold per LED for Model S (2012-2020) and Model X (2015-2020). Resold from EVOffer. Listed at $9 each.',
      'Not for 2021+ Model S or Model X. Order one row per bulb. Amped Up resells this EVOffer top seller.',
      900
    ),
    (
      'evoffer-model-x-electric-frunk',
      'Model X Electric Frunk',
      'Power open and close for a Model X front trunk. Resold from EVOffer. Listed at $349.',
      'Fits Tesla Model X. Amped Up resells this EVOffer top seller. Installation is not included.',
      34900
    ),
    (
      'evoffer-model-s-electric-frunk',
      'Model S Electric Frunk',
      'Power open and close for a Model S front trunk. Resold from EVOffer. Listed at $349.',
      'Fits Tesla Model S. Amped Up resells this EVOffer top seller. Installation is not included.',
      34900
    ),
    (
      'evoffer-model-3-y-ludicrous-style-sport-seats',
      'Model 3/Y Ludicrous Style Performance Sport Seats',
      'Performance-style seat set for Model 3 and Model Y. Resold from EVOffer. Listed from $799.',
      'Configurations can cost more than the listed starting price. Amped Up resells this EVOffer top seller. Installation is not included.',
      79900
    ),
    (
      'evoffer-model-3-y-hdmi-interface',
      'Model 3/Y HDMI Interface',
      'HDMI input for the Model 3 or Model Y center screen. Resold from EVOffer. Listed at $399.',
      'Fits Tesla Model 3 and Model Y. Amped Up resells this EVOffer top seller. Installation is not included.',
      39900
    ),
    (
      'evoffer-model-3-y-tailgate-foot-activation',
      'Model 3/Y Tailgate Foot Activation',
      'Foot-activated tailgate for eligible Model 3 and Model Y cars. Resold from EVOffer. Listed from $149.',
      'Model 3 fit depends on model year and whether the car already has a power tailgate. Configurations can cost more than the starting price. Installation is not included.',
      14900
    ),
    (
      'evoffer-model-s-x-tailgate-foot-activation',
      'Model S/X Tailgate Foot Activation',
      'Plug-in foot-activated tailgate for Model S and Model X. Resold from EVOffer. Listed at $149.',
      'Fits Tesla Model S and Model X. Amped Up resells this EVOffer top seller. Installation is not included.',
      14900
    )
) as item(slug, name, description, long_description, price_cents)
join public.catalog_categories category on category.slug = 'upgrades'
left join public.service_capabilities capability on capability.slug = 'aftermarket-upgrades'
on conflict (slug) do nothing;
