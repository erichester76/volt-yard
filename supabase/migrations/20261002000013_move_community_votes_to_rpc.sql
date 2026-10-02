-- Direct upserts require both the INSERT and UPDATE RLS predicates to pass and
-- depend on a client-provided user_id. Keep the authorization decision atomic
-- and derive the vote owner from the authenticated session instead.
drop policy if exists "Members create own topic votes" on public.community_topic_votes;
drop policy if exists "Members update own topic votes" on public.community_topic_votes;
drop policy if exists "Users delete own topic votes" on public.community_topic_votes;
drop policy if exists "Members manage own post votes" on public.community_post_votes;

create policy "Users read own post votes"
on public.community_post_votes
for select to authenticated
using (user_id = auth.uid());

create or replace function public.community_set_vote(
  target_kind text,
  target_id uuid,
  vote_value smallint default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  voter_id uuid := auth.uid();
begin
  if voter_id is null then
    raise exception 'Sign in required';
  end if;

  if vote_value is not null and vote_value not in (-1, 1) then
    raise exception 'Vote value must be -1 or 1';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = voter_id
      and membership_tier in ('member', 'premium')
  ) then
    raise exception 'An active Member or Premium membership is required to vote';
  end if;

  if target_kind = 'topic' then
    if not exists (
      select 1
      from public.community_topics topic
      join public.community_categories category on category.id = topic.category_id
      where topic.id = target_id
        and topic.moderation_state in ('published', 'locked')
        and category.active
    ) then
      raise exception 'Topic is unavailable for voting';
    end if;

    if vote_value is null then
      delete from public.community_topic_votes where topic_id = target_id and user_id = voter_id;
    else
      insert into public.community_topic_votes (topic_id, user_id, value)
      values (target_id, voter_id, vote_value)
      on conflict (topic_id, user_id) do update set value = excluded.value;
    end if;
  elsif target_kind = 'post' then
    if not exists (
      select 1
      from public.community_posts post
      join public.community_topics topic on topic.id = post.topic_id
      join public.community_categories category on category.id = topic.category_id
      where post.id = target_id
        and post.moderation_state = 'published'
        and topic.moderation_state in ('published', 'locked')
        and category.active
    ) then
      raise exception 'Reply is unavailable for voting';
    end if;

    if vote_value is null then
      delete from public.community_post_votes where post_id = target_id and user_id = voter_id;
    else
      insert into public.community_post_votes (post_id, user_id, value)
      values (target_id, voter_id, vote_value)
      on conflict (post_id, user_id) do update set value = excluded.value;
    end if;
  else
    raise exception 'Unsupported vote target';
  end if;
end;
$$;

revoke all on function public.community_set_vote(text, uuid, smallint) from public;
grant execute on function public.community_set_vote(text, uuid, smallint) to authenticated;

notify pgrst, 'reload schema';
