-- Topic pages expose locked discussions for reading and voting, but the original
-- insert check accepted only published topics. Keep vote rows private to their
-- owner while permitting members to create or change one vote per visible topic.
drop policy if exists "Members manage own topic votes" on public.community_topic_votes;

create policy "Users read own topic votes"
on public.community_topic_votes
for select to authenticated
using (user_id = auth.uid());

create policy "Members create own topic votes"
on public.community_topic_votes
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and membership_tier in ('member', 'premium')
  )
  and exists (
    select 1
    from public.community_topics topic
    join public.community_categories category on category.id = topic.category_id
    where topic.id = topic_id
      and topic.moderation_state in ('published', 'locked')
      and category.active
  )
);

create policy "Members update own topic votes"
on public.community_topic_votes
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and membership_tier in ('member', 'premium')
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and membership_tier in ('member', 'premium')
  )
  and exists (
    select 1
    from public.community_topics topic
    join public.community_categories category on category.id = topic.category_id
    where topic.id = topic_id
      and topic.moderation_state in ('published', 'locked')
      and category.active
  )
);

-- Users may always remove their own historical vote, including after a membership expires.
create policy "Users delete own topic votes"
on public.community_topic_votes
for delete to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
