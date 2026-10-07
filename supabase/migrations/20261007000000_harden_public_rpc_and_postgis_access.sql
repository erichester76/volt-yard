-- public.spatial_ref_sys is owned by the managed PostGIS extension, so it
-- cannot be altered by the project migration role. It contains only spatial
-- reference metadata; do not grant it additional application access or move
-- the extension in a populated production project.

-- SECURITY DEFINER functions are executable by PUBLIC unless explicitly
-- revoked. Only directory search is intentionally available before sign-in.
revoke all on function public.rls_auto_enable() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.admin_shops() from public;
revoke all on function public.approve_shop_change(uuid) from public;
revoke all on function public.reject_shop_change(uuid, text) from public;
revoke all on function public.enqueue_paid_service_requests() from public;
revoke all on function public.accept_installer_job(uuid, text) from public;
revoke all on function public.record_installer_job_payout(uuid, text) from public;
revoke all on function public.claim_expert_opportunity(uuid) from public;
revoke all on function public.create_case_service_request(uuid, uuid) from public;
revoke all on function public.submit_expert_response(uuid, text) from public;
revoke all on function public.update_my_profile(text) from public;
revoke all on function public.community_refresh_topic_score(uuid) from public;
revoke all on function public.community_refresh_post_score(uuid) from public;
revoke all on function public.community_topic_vote_changed() from public;
revoke all on function public.community_post_vote_changed() from public;
revoke all on function public.community_post_activity_changed() from public;
revoke all on function public.community_set_vote(text, uuid, smallint) from public;
revoke all on function public.create_checkout_order(uuid, uuid, text, text, text) from public;
revoke all on function public.nearby_shops(double precision, double precision, integer, text, text, integer, uuid, uuid, integer, integer) from public;
revoke all on function public.shops_by_location(text, text, text, integer, uuid, uuid, integer, integer) from public;
revoke all on function public.is_admin() from public;

grant execute on function public.nearby_shops(double precision, double precision, integer, text, text, integer, uuid, uuid, integer, integer) to anon, authenticated;
grant execute on function public.shops_by_location(text, text, text, integer, uuid, uuid, integer, integer) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.admin_shops() to authenticated;
grant execute on function public.approve_shop_change(uuid) to authenticated;
grant execute on function public.reject_shop_change(uuid, text) to authenticated;
grant execute on function public.accept_installer_job(uuid, text) to authenticated;
grant execute on function public.record_installer_job_payout(uuid, text) to authenticated;
grant execute on function public.claim_expert_opportunity(uuid) to authenticated;
grant execute on function public.create_case_service_request(uuid, uuid) to authenticated;
grant execute on function public.submit_expert_response(uuid, text) to authenticated;
grant execute on function public.update_my_profile(text) to authenticated;
grant execute on function public.community_set_vote(text, uuid, smallint) to authenticated;
grant execute on function public.create_checkout_order(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.enqueue_paid_service_requests() to service_role;

-- Trigger helpers do not need public execution and should never resolve names
-- through a caller-controlled path.
alter function public.community_set_topic_visibility() set search_path = pg_catalog, public;
alter function public.community_set_post_visibility() set search_path = pg_catalog, public;
alter function public.set_updated_at() set search_path = pg_catalog, public;

-- Remove ambiguous PL/pgSQL parameter references in the two administrative
-- workflow functions while preserving their authorization checks.
create or replace function public.record_installer_job_payout(job_id uuid, payout_reference text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized to record a payout'; end if;
  update public.installer_jobs
  set payout_status = 'paid', payout_reference = nullif(trim($2), ''), paid_at = now()
  where id = $1 and status = 'accepted' and payout_status = 'pending';
  return found;
end;
$$;

create or replace function public.create_case_service_request(case_id uuid, source_topic_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (select 1 from public.issue_cases where id = $1 and owner_id = auth.uid()) then raise exception 'Not authorized'; end if;
  insert into public.case_service_requests (case_id, owner_id, source_topic_id, context_snapshot)
  select c.id, c.owner_id, $2, jsonb_build_object('case', to_jsonb(c), 'topic_id', $2)
  from public.issue_cases c where c.id = $1
  on conflict (case_id) do update set source_topic_id = excluded.source_topic_id, context_snapshot = excluded.context_snapshot
  returning id into new_id;
  update public.issue_cases set status = 'service_requested' where id = $1;
  insert into public.issue_pathway_events (case_id, pathway, detail) values ($1, 'service', 'Service request created');
  return new_id;
end;
$$;

notify pgrst, 'reload schema';
