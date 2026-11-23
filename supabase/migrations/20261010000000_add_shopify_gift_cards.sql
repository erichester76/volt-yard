-- Shopify is the system of record for gift-card balances. This table stores only
-- the private delivery token and Shopify identifiers needed to email and debit it.
create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  offer text not null check (offer in ('membership', 'service-kit', 'upgrade-kit')),
  amount_cents integer not null check (amount_cents between 100 and 100000),
  currency text not null default 'usd' check (currency = 'usd'),
  purchaser_email text not null check (char_length(purchaser_email) between 3 and 320),
  delivery_token text not null unique check (char_length(delivery_token) between 32 and 128),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'claimed', 'applied', 'void')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  shopify_gift_card_id text unique,
  shopify_last4 text check (shopify_last4 is null or shopify_last4 ~ '^[A-Za-z0-9]{4}$'),
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  applied_at timestamptz,
  shopify_adjustment_id text,
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 128),
  created_at timestamptz not null default now()
);

alter table public.gift_cards enable row level security;
revoke all on table public.gift_cards from public;
revoke all on table public.gift_cards from anon;
revoke all on table public.gift_cards from authenticated;
revoke all on table public.gift_cards from service_role;
grant select, insert, update on table public.gift_cards to service_role;

notify pgrst, 'reload schema';
