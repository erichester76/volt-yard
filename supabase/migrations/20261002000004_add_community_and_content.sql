-- Community discussion is member-authored; editorial resources are published by admins.
create table public.community_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 8 and 180),
  body text not null check (char_length(body) between 20 and 10000),
  category text not null default 'General help' check (char_length(category) between 2 and 60),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.community_topics(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 2 and 10000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  type text not null check (type in ('article', 'video', 'release_note')),
  title text not null check (char_length(title) between 4 and 180),
  summary text not null check (char_length(summary) between 10 and 600),
  body text not null check (char_length(body) between 20 and 20000),
  video_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_topics_published_idx on public.community_topics (created_at desc) where is_published;
create index community_posts_topic_idx on public.community_posts (topic_id, created_at);
create index resources_published_idx on public.resources (type, published_at desc) where is_published;
create trigger community_topics_updated_at before update on public.community_topics for each row execute procedure public.set_updated_at();
create trigger community_posts_updated_at before update on public.community_posts for each row execute procedure public.set_updated_at();
create trigger resources_updated_at before update on public.resources for each row execute procedure public.set_updated_at();

alter table public.community_topics enable row level security;
alter table public.community_posts enable row level security;
alter table public.resources enable row level security;

create policy "Public reads published community topics" on public.community_topics for select using (is_published);
create policy "Members create community topics" on public.community_topics for insert to authenticated with check (author_id = auth.uid());
create policy "Authors update their community topics" on public.community_topics for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Public reads published community posts" on public.community_posts for select using (is_published and exists (select 1 from public.community_topics topic where topic.id = community_posts.topic_id and topic.is_published));
create policy "Members create community posts" on public.community_posts for insert to authenticated with check (author_id = auth.uid());
create policy "Authors update their community posts" on public.community_posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Admins manage community topics" on public.community_topics for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage community posts" on public.community_posts for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published resources" on public.resources for select using (is_published);
create policy "Admins manage resources" on public.resources for all using (public.is_admin()) with check (public.is_admin());

insert into public.community_topics (slug, title, body, category) values
  ('winter-range-drop-what-is-normal', 'Winter range drop: what is normal?', 'My first cold season has me watching range fall quickly. What checks do you make before assuming the pack needs service?', 'Battery & charging'),
  ('brake-service-after-years-of-regen', 'Brake service after years of regen', 'Looking for a practical checklist before I book brake service on an EV that has mostly lived in city traffic.', 'Maintenance');
insert into public.community_posts (topic_id, body)
select id, 'Start with tire pressure, cabin heat use, and a recent charge-to-charge comparison. A local EV shop can run diagnostics if the change is abrupt.' from public.community_topics where slug = 'winter-range-drop-what-is-normal';
insert into public.resources (slug, type, title, summary, body, video_url, is_published, published_at) values
  ('before-you-book-ev-diagnostics', 'article', 'What to bring to an EV diagnostic visit', 'A short intake checklist that helps a shop reproduce the problem faster.', 'Bring a timeline of warnings, photos of any messages, charging history, and notes about weather or driving conditions. Clear details give an independent technician a useful starting point.', null, true, now()),
  ('check-tires-before-the-service-bay', 'video', 'Check tires before the service bay', 'A two-minute preflight for pressure, wear, and the details worth sharing with your mechanic.', 'Use the door-jamb pressure specification, inspect the inside shoulder for uneven wear, and note whether vibration appears at a particular speed. Stop if you see damage or cords.', 'https://www.youtube.com/', true, now()),
  ('yard-notes-october', 'release_note', 'Volt Yard October update', 'Community help, practical learning, and a clearer path to trusted local service.', 'This release adds the Volt Yard community, DIY learning library, and product notes. The goal is simple: get context from fellow owners, handle the safe basics, then connect with an independent specialist when the work belongs in a bay.', null, true, now());

notify pgrst, 'reload schema';
