-- CourtIQ commercial security hardening.
-- Keep SECURITY DEFINER only where the function performs its own authorization,
-- remove anonymous execution, and pin search_path to prevent name shadowing.

alter function public.club_role_permissions(text) set search_path = '';
alter function private.is_club_member(bigint) set search_path = '';
alter function public.my_club_os_context() set search_path = '';
alter function public.basketball_ops_snapshot(bigint, text) set search_path = '';
alter function public.player_360_snapshot(bigint, bigint, text) set search_path = '';
alter function public.set_my_competitions(text[]) set search_path = '';

revoke execute on function public.my_club_os_context() from anon;
revoke execute on function public.basketball_ops_snapshot(bigint, text) from anon;
revoke execute on function public.player_360_snapshot(bigint, bigint, text) from anon;

-- Authenticated users still need these RPCs. Each snapshot verifies club
-- membership internally; set_my_competitions only operates on auth.uid().
grant execute on function public.my_club_os_context() to authenticated;
grant execute on function public.basketball_ops_snapshot(bigint, text) to authenticated;
grant execute on function public.player_360_snapshot(bigint, bigint, text) to authenticated;
grant execute on function public.set_my_competitions(text[]) to authenticated;
