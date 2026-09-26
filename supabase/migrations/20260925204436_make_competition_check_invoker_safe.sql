create or replace function public.can_access_competition(comp text)
returns boolean language sql stable security invoker set search_path = public
as $$
 select (select auth.uid()) = '10fa3b29-4acd-4fcf-9784-1117b510332c'::uuid
 or exists (select 1 from public.user_competition_access u where u.user_id = (select auth.uid()) and lower(u.competition)=lower(comp));
$$;
revoke all on function public.can_access_competition(text) from public, anon;
grant execute on function public.can_access_competition(text) to authenticated;