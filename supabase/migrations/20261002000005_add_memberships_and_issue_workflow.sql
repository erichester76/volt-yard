-- Membership and guided issue workflow. Tessie is intentionally not connected;
-- vehicle telemetry can be attached later through issue_cases.external_context.
create type public.membership_tier as enum ('free', 'member', 'premium');
create type public.membership_status as enum ('active', 'trialing', 'past_due', 'cancelled');
create type public.issue_case_status as enum ('open', 'monitoring', 'service_requested', 'resolved', 'closed');
create type public.expert_opportunity_status as enum ('open', 'claimed', 'answered', 'cancelled');

alter table public.profiles add column if not exists membership_tier public.membership_tier not null default 'free';

create table public.membership_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  tier public.membership_tier not null check (tier <> 'free'),
  status public.membership_status not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  source text not null default 'admin_demo' check (source in ('stripe', 'admin_demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.membership_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('case_history', 'community_posting', 'expert_response', 'priority_service')),
  granted_by text not null default 'tier' check (granted_by in ('tier', 'admin')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create table public.issue_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_topic_id uuid references public.community_topics(id) on delete set null,
  title text not null check (char_length(title) between 4 and 180),
  vehicle_year integer check (vehicle_year between 1990 and 2100),
  vehicle_make text, vehicle_model text, vehicle_notes text,
  symptoms text not null check (char_length(symptoms) between 10 and 10000),
  warning_codes text, media_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(media_urls) = 'array'),
  external_context jsonb not null default '{}'::jsonb, -- reserved for future integrations
  status public.issue_case_status not null default 'open',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.issue_pathway_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.issue_cases(id) on delete cascade,
  pathway text not null check (pathway in ('search', 'diy', 'community', 'service', 'expert')),
  detail text, created_at timestamptz not null default now()
);
create table public.case_service_requests (
  id uuid primary key default gen_random_uuid(), case_id uuid not null unique references public.issue_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_topic_id uuid references public.community_topics(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted', 'matched', 'closed')),
  context_snapshot jsonb not null, created_at timestamptz not null default now()
);
create table public.expert_opportunities (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.issue_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status public.expert_opportunity_status not null default 'open', expert_id uuid references auth.users(id),
  payout_cents integer not null default 2500 check (payout_cents >= 0),
  created_at timestamptz not null default now(), claimed_at timestamptz, answered_at timestamptz
);
create table public.expert_responses (
  id uuid primary key default gen_random_uuid(), opportunity_id uuid not null unique references public.expert_opportunities(id) on delete cascade,
  expert_id uuid not null references auth.users(id), body text not null check (char_length(body) between 20 and 10000),
  created_at timestamptz not null default now()
);
create table public.expert_payout_jobs (
  id uuid primary key default gen_random_uuid(), opportunity_id uuid not null unique references public.expert_opportunities(id) on delete cascade,
  expert_id uuid not null references auth.users(id), amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'void')), payout_reference text, created_at timestamptz not null default now(), paid_at timestamptz
);
create index issue_cases_owner_idx on public.issue_cases(owner_id, updated_at desc);
create index expert_opportunities_status_idx on public.expert_opportunities(status, created_at);
create trigger membership_subscriptions_updated_at before update on public.membership_subscriptions for each row execute procedure public.set_updated_at();
create trigger issue_cases_updated_at before update on public.issue_cases for each row execute procedure public.set_updated_at();

create or replace function public.claim_expert_opportunity(opportunity_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare opportunity public.expert_opportunities%rowtype;
begin
  if not exists (select 1 from public.shops where owner_id = auth.uid()) then raise exception 'Only verified mechanic accounts can claim expert work'; end if;
  select * into opportunity from public.expert_opportunities where id = opportunity_id for update;
  if not found or opportunity.status <> 'open' then return false; end if;
  update public.expert_opportunities set status = 'claimed', expert_id = auth.uid(), claimed_at = now() where id = opportunity.id;
  insert into public.expert_payout_jobs (opportunity_id, expert_id, amount_cents) values (opportunity.id, auth.uid(), opportunity.payout_cents);
  return true;
end; $$;
create or replace function public.create_case_service_request(case_id uuid, source_topic_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (select 1 from public.issue_cases where id = case_id and owner_id = auth.uid()) then raise exception 'Not authorized'; end if;
  insert into public.case_service_requests (case_id, owner_id, source_topic_id, context_snapshot)
  select c.id, c.owner_id, source_topic_id, jsonb_build_object('case', to_jsonb(c), 'topic_id', source_topic_id)
  from public.issue_cases c where c.id = case_id
  on conflict (case_id) do update set source_topic_id = excluded.source_topic_id, context_snapshot = excluded.context_snapshot
  returning id into new_id;
  update public.issue_cases set status = 'service_requested' where id = case_id;
  insert into public.issue_pathway_events (case_id, pathway, detail) values (case_id, 'service', 'Service request created');
  return new_id;
end; $$;
create or replace function public.submit_expert_response(opportunity_id uuid, response_body text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if char_length(trim(response_body)) < 20 then raise exception 'Response must be at least 20 characters'; end if;
  update public.expert_opportunities set status = 'answered', answered_at = now()
  where id = opportunity_id and expert_id = auth.uid() and status = 'claimed';
  if not found then raise exception 'Not authorized to answer this opportunity'; end if;
  insert into public.expert_responses (opportunity_id, expert_id, body) values (opportunity_id, auth.uid(), trim(response_body));
  return true;
end; $$;
revoke all on function public.claim_expert_opportunity(uuid) from public;
revoke all on function public.create_case_service_request(uuid, uuid) from public;
revoke all on function public.submit_expert_response(uuid, text) from public;
grant execute on function public.claim_expert_opportunity(uuid) to authenticated;
grant execute on function public.create_case_service_request(uuid, uuid) to authenticated;
grant execute on function public.submit_expert_response(uuid, text) to authenticated;

alter table public.membership_subscriptions enable row level security;
alter table public.membership_entitlements enable row level security;
alter table public.issue_cases enable row level security;
alter table public.issue_pathway_events enable row level security;
alter table public.case_service_requests enable row level security;
alter table public.expert_opportunities enable row level security;
alter table public.expert_responses enable row level security;
alter table public.expert_payout_jobs enable row level security;
create policy "Users read their membership" on public.membership_subscriptions for select using (user_id = auth.uid());
create policy "Admins manage memberships" on public.membership_subscriptions for all using (public.is_admin()) with check (public.is_admin());
create policy "Users read their entitlements" on public.membership_entitlements for select using (user_id = auth.uid());
create policy "Admins manage entitlements" on public.membership_entitlements for all using (public.is_admin()) with check (public.is_admin());
create policy "Owners manage cases" on public.issue_cases for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Assigned experts read cases" on public.issue_cases for select using (exists (select 1 from public.expert_opportunities o where o.case_id = issue_cases.id and o.expert_id = auth.uid()));
create policy "Owners manage pathways" on public.issue_pathway_events for all using (exists (select 1 from public.issue_cases c where c.id = issue_pathway_events.case_id and c.owner_id = auth.uid())) with check (exists (select 1 from public.issue_cases c where c.id = issue_pathway_events.case_id and c.owner_id = auth.uid()));
create policy "Owners read case service requests" on public.case_service_requests for select using (owner_id = auth.uid());
create policy "Owners create expert opportunities" on public.expert_opportunities for insert with check (owner_id = auth.uid() and exists (select 1 from public.issue_cases c where c.id = case_id and c.owner_id = auth.uid()));
create policy "Owners read their expert opportunities" on public.expert_opportunities for select using (owner_id = auth.uid());
create policy "Mechanics read open or claimed opportunities" on public.expert_opportunities for select using (exists (select 1 from public.shops where owner_id = auth.uid()) and (status = 'open' or expert_id = auth.uid()));
create policy "Owners read expert responses" on public.expert_responses for select using (exists (select 1 from public.expert_opportunities o where o.id = opportunity_id and o.owner_id = auth.uid()));
create policy "Experts manage their response" on public.expert_responses for all using (expert_id = auth.uid()) with check (expert_id = auth.uid() and exists (select 1 from public.expert_opportunities o where o.id = opportunity_id and o.expert_id = auth.uid() and o.status = 'claimed'));
create policy "Experts read their payout jobs" on public.expert_payout_jobs for select using (expert_id = auth.uid());
create policy "Admins manage expert workflow" on public.expert_opportunities for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage expert payouts" on public.expert_payout_jobs for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
