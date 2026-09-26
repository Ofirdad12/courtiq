revoke all on function public.can_access_competition(text) from public, anon;
grant execute on function public.can_access_competition(text) to authenticated;
revoke all on function public.enforce_max_two_competitions() from public, anon, authenticated;