-- Retain the Stripe customer before Checkout completes so repeat requests use
-- the same customer and can inspect its current subscription.
create table public.membership_billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_checkout_session_id text unique,
  checkout_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.membership_billing_customers (user_id, stripe_customer_id)
select user_id, stripe_customer_id
from public.membership_subscriptions
where stripe_customer_id is not null
on conflict (user_id) do update set stripe_customer_id = excluded.stripe_customer_id;

create trigger membership_billing_customers_updated_at before update on public.membership_billing_customers for each row execute procedure public.set_updated_at();
alter table public.membership_billing_customers enable row level security;
notify pgrst, 'reload schema';
