-- Community pages need a public author label, but must not expose full profiles.
create or replace view public.community_author_profiles
with (security_invoker = false) as
  select id, nullif(trim(full_name), '') as display_name
  from public.profiles;

revoke all on public.community_author_profiles from public;
grant select on public.community_author_profiles to anon, authenticated;

alter table public.community_posts
  add column if not exists parent_post_id uuid references public.community_posts(id) on delete set null;

create index if not exists community_posts_topic_parent_created_idx
  on public.community_posts (topic_id, parent_post_id, created_at)
  where moderation_state = 'published';

create or replace function public.community_validate_post_parent()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.parent_post_id is not null and not exists (
    select 1 from public.community_posts parent
    where parent.id = new.parent_post_id
      and parent.topic_id = new.topic_id
  ) then
    raise exception 'Replies must belong to the same topic';
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_validate_parent on public.community_posts;
create trigger community_posts_validate_parent
  before insert or update of topic_id, parent_post_id on public.community_posts
  for each row execute procedure public.community_validate_post_parent();

notify pgrst, 'reload schema';
