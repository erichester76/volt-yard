-- Moderated, member-only forum extensions. Keep is_published for old clients while
-- moderation_state is the source of truth for visibility.
create type public.community_moderation_state as enum ('pending', 'published', 'hidden', 'locked');

create table public.community_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.community_categories (name, slug, sort_order) values
  ('General help', 'general-help', 0),
  ('Battery & charging', 'battery-charging', 10),
  ('Maintenance', 'maintenance', 20),
  ('Upgrades', 'upgrades', 30);

alter table public.community_topics
  add column category_id uuid references public.community_categories(id) on delete restrict,
  add column moderation_state public.community_moderation_state not null default 'published',
  add column moderation_note text,
  add column score integer not null default 0,
  add column last_activity_at timestamptz not null default now(),
  add column pin_override boolean,
  add column is_pinned boolean not null default false;

update public.community_topics topic
set category_id = category.id
from public.community_categories category
where category.name = topic.category;

alter table public.community_topics alter column category_id set not null;
alter table public.community_topics drop column category;

alter table public.community_posts
  add column moderation_state public.community_moderation_state not null default 'published',
  add column moderation_note text,
  add column score integer not null default 0;

create table public.community_topic_votes (
  topic_id uuid not null references public.community_topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);
create table public.community_post_votes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index community_categories_active_idx on public.community_categories (sort_order, name) where active;
create index community_topics_trending_idx on public.community_topics (is_pinned desc, score desc, last_activity_at desc) where moderation_state = 'published';
create index community_posts_topic_score_idx on public.community_posts (topic_id, score desc, created_at) where moderation_state = 'published';

create or replace function public.community_set_topic_visibility()
returns trigger language plpgsql as $$
begin
  new.is_published := new.moderation_state in ('published', 'locked');
  new.is_pinned := case
    when new.pin_override is true then true
    when new.pin_override is false then false
    else new.score >= 10
  end;
  return new;
end; $$;

create or replace function public.community_set_post_visibility()
returns trigger language plpgsql as $$
begin
  new.is_published := new.moderation_state = 'published';
  return new;
end; $$;

create or replace function public.community_refresh_topic_score(topic uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.community_topics
  set score = coalesce((select sum(value) from public.community_topic_votes where topic_id = topic), 0)
  where id = topic;
end; $$;

create or replace function public.community_refresh_post_score(post uuid)
returns void language plpgsql security definer set search_path = public as $$
declare topic uuid;
begin
  update public.community_posts
  set score = coalesce((select sum(value) from public.community_post_votes where post_id = post), 0)
  where id = post
  returning topic_id into topic;
  if topic is not null then
    update public.community_topics set last_activity_at = now() where id = topic;
  end if;
end; $$;

create or replace function public.community_topic_vote_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.community_refresh_topic_score(coalesce(new.topic_id, old.topic_id));
  return null;
end; $$;
create or replace function public.community_post_vote_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.community_refresh_post_score(coalesce(new.post_id, old.post_id));
  return null;
end; $$;
create or replace function public.community_post_activity_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_topics set last_activity_at = now() where id = coalesce(new.topic_id, old.topic_id);
  return null;
end; $$;

create trigger community_topics_visibility before insert or update of moderation_state, score, pin_override on public.community_topics for each row execute procedure public.community_set_topic_visibility();
create trigger community_posts_visibility before insert or update of moderation_state on public.community_posts for each row execute procedure public.community_set_post_visibility();
create trigger community_topic_votes_score after insert or update or delete on public.community_topic_votes for each row execute procedure public.community_topic_vote_changed();
create trigger community_post_votes_score after insert or update or delete on public.community_post_votes for each row execute procedure public.community_post_vote_changed();
create trigger community_posts_activity after insert or update or delete on public.community_posts for each row execute procedure public.community_post_activity_changed();
create trigger community_categories_updated_at before update on public.community_categories for each row execute procedure public.set_updated_at();
create trigger community_topic_votes_updated_at before update on public.community_topic_votes for each row execute procedure public.set_updated_at();
create trigger community_post_votes_updated_at before update on public.community_post_votes for each row execute procedure public.set_updated_at();

-- Existing rows begin as published and only categories administrators have left active are public.
update public.community_topics set moderation_state = case when is_published then 'published'::public.community_moderation_state else 'hidden'::public.community_moderation_state end;
update public.community_posts set moderation_state = case when is_published then 'published'::public.community_moderation_state else 'hidden'::public.community_moderation_state end;

alter table public.community_categories enable row level security;
alter table public.community_topic_votes enable row level security;
alter table public.community_post_votes enable row level security;

-- Migration 20261002000007 may have already replaced the member policies.
-- Remove both variants so the pending-only policies below are the sole member insert path.
drop policy if exists "Public reads published community topics" on public.community_topics;
drop policy if exists "Members create community topics" on public.community_topics;
drop policy if exists "Paid members create community topics" on public.community_topics;
drop policy if exists "Authors update their community topics" on public.community_topics;
drop policy if exists "Public reads published community posts" on public.community_posts;
drop policy if exists "Members create community posts" on public.community_posts;
drop policy if exists "Paid members create community posts" on public.community_posts;
drop policy if exists "Authors update their community posts" on public.community_posts;

create policy "Public reads active community categories" on public.community_categories for select using (active or public.is_admin());
create policy "Admins manage community categories" on public.community_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published moderated topics" on public.community_topics for select using (moderation_state in ('published', 'locked') and exists (select 1 from public.community_categories category where category.id = category_id and category.active));
create policy "Authors read own moderated topics" on public.community_topics for select to authenticated using (author_id = auth.uid());
create policy "Members create pending community topics" on public.community_topics for insert to authenticated with check (author_id = auth.uid() and moderation_state = 'pending' and exists (select 1 from public.profiles where id = auth.uid() and membership_tier in ('member', 'premium')) and exists (select 1 from public.community_categories category where category.id = category_id and category.active));
create policy "Authors edit pending community topics" on public.community_topics for update to authenticated using (author_id = auth.uid() and moderation_state = 'pending') with check (author_id = auth.uid() and moderation_state = 'pending');
create policy "Public reads published moderated posts" on public.community_posts for select using (moderation_state = 'published' and exists (select 1 from public.community_topics topic where topic.id = topic_id and topic.moderation_state in ('published', 'locked')));
create policy "Authors read own moderated posts" on public.community_posts for select to authenticated using (author_id = auth.uid());
create policy "Members create pending community posts" on public.community_posts for insert to authenticated with check (author_id = auth.uid() and moderation_state = 'pending' and exists (select 1 from public.profiles where id = auth.uid() and membership_tier in ('member', 'premium')) and exists (select 1 from public.community_topics topic where topic.id = topic_id and topic.moderation_state = 'published'));
create policy "Authors edit pending community posts" on public.community_posts for update to authenticated using (author_id = auth.uid() and moderation_state = 'pending') with check (author_id = auth.uid() and moderation_state = 'pending');
create policy "Members manage own topic votes" on public.community_topic_votes for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and membership_tier in ('member', 'premium'))) with check (user_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and membership_tier in ('member', 'premium')) and exists (select 1 from public.community_topics where id = topic_id and moderation_state = 'published'));
create policy "Members manage own post votes" on public.community_post_votes for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and membership_tier in ('member', 'premium'))) with check (user_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and membership_tier in ('member', 'premium')) and exists (select 1 from public.community_posts where id = post_id and moderation_state = 'published'));

notify pgrst, 'reload schema';
