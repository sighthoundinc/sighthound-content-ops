-- Actor IDs are trusted server inputs, not browser-controlled authorization.
-- Keep the API service-role path; ordinary callers must use the guarded API.
-- Roll forward on failure: never restore PUBLIC/anon/authenticated execution.
revoke all on function public.transition_social_post_status(uuid, public.social_post_status, uuid, text)
  from public, anon, authenticated;
revoke all on function public.reopen_social_post_for_brief_edit(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.transition_social_post_status(uuid, public.social_post_status, uuid, text)
  to service_role;
grant execute on function public.reopen_social_post_for_brief_edit(uuid, uuid, text)
  to service_role;

notify pgrst, 'reload schema';
