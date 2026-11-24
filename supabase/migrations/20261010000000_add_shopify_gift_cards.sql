-- Shopify is the system of record for gift-card balances. This table stores only
-- the private delivery token and Shopify identifiers needed to email and debit it.
create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  offer text not null default 'store-credit' check (offer = 'store-credit'),
  amount_cents integer not null check (amount_cents in (5000, 10000, 25000)),
  remaining_cents integer not null check (remaining_cents between 0 and 25000),
  membership_days integer not null default 30 check (membership_days = 30),
  currency text not null default 'usd' check (currency = 'usd'),
  purchaser_email text not null check (char_length(purchaser_email) between 3 and 320),
  delivery_mode text not null default 'buyer' check (delivery_mode in ('buyer', 'scheduled')),
  recipient_email text check (recipient_email is null or char_length(recipient_email) between 3 and 320),
  send_on date,
  link_sent_at timestamptz,
  buyer_notified_at timestamptz,
  delivery_token text not null unique check (char_length(delivery_token) between 32 and 128),
  constraint gift_cards_delivery_check check (
    (delivery_mode = 'buyer' and recipient_email is null and send_on is null)
    or (delivery_mode = 'scheduled' and recipient_email is not null and send_on is not null)
  ),
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

alter table public.membership_subscriptions drop constraint if exists membership_subscriptions_source_check;
alter table public.membership_subscriptions add constraint membership_subscriptions_source_check check (source in ('stripe', 'admin_demo', 'shopify_gift'));

notify pgrst, 'reload schema';
