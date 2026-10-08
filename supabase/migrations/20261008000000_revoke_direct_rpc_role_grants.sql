-- Supabase grants EXECUTE directly to API roles for newly created functions.
-- Revoke those direct grants before restoring the intentionally exposed RPCs.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.is_admin() from anon, authenticated;
revoke execute on function public.admin_shops() from anon, authenticated;
revoke execute on function public.approve_shop_change(uuid) from anon, authenticated;
revoke execute on function public.reject_shop_change(uuid, text) from anon, authenticated;
revoke execute on function public.enqueue_paid_service_requests() from anon, authenticated;
revoke execute on function public.accept_installer_job(uuid, text) from anon, authenticated;
revoke execute on function public.record_installer_job_payout(uuid, text) from anon, authenticated;
revoke execute on function public.claim_expert_opportunity(uuid) from anon, authenticated;
revoke execute on function public.create_case_service_request(uuid, uuid) from anon, authenticated;
revoke execute on function public.submit_expert_response(uuid, text) from anon, authenticated;
revoke execute on function public.update_my_profile(text) from anon, authenticated;
revoke execute on function public.community_refresh_topic_score(uuid) from anon, authenticated;
revoke execute on function public.community_refresh_post_score(uuid) from anon, authenticated;
revoke execute on function public.community_topic_vote_changed() from anon, authenticated;
revoke execute on function public.community_post_vote_changed() from anon, authenticated;
revoke execute on function public.community_post_activity_changed() from anon, authenticated;
revoke execute on function public.community_set_vote(text, uuid, smallint) from anon, authenticated;
revoke execute on function public.create_checkout_order(uuid, uuid, text, text, text) from anon, authenticated;
revoke execute on function public.nearby_shops(double precision, double precision, integer, text, text, integer, uuid, uuid, integer, integer) from anon, authenticated;
revoke execute on function public.shops_by_location(text, text, text, integer, uuid, uuid, integer, integer) from anon, authenticated;

-- Public directory discovery is intentional. is_admin() remains callable by
-- RLS policies and only returns the caller's own administrative status.
grant execute on function public.nearby_shops(double precision, double precision, integer, text, text, integer, uuid, uuid, integer, integer) to anon, authenticated;
grant execute on function public.shops_by_location(text, text, text, integer, uuid, uuid, integer, integer) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Signed-in callers use these functions; each function validates its own role
-- or ownership before mutating data.
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

notify pgrst, 'reload schema';
