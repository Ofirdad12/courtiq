revoke insert, delete on public.user_competition_access from authenticated;
drop policy if exists "users choose own competition access" on public.user_competition_access;
drop policy if exists "users remove own competition access" on public.user_competition_access;
create or replace function public.set_my_competitions(comps text[])
returns text[] language plpgsql security definer set search_path=public
as $$
declare cleaned text[];
begin
  if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
  select array_agg(distinct btrim(x)) into cleaned from unnest(comps) x where btrim(x)<>'';
  cleaned := coalesce(cleaned, array[]::text[]);
  if cardinality(cleaned)>2 then raise exception 'Maximum 2 leagues per account'; end if;
  delete from public.user_competition_access where user_id=(select auth.uid());
  insert into public.user_competition_access(user_id,competition) select (select auth.uid()),x from unnest(cleaned)x;
  return cleaned;
end;
$$;
revoke all on function public.set_my_competitions(text[]) from public, anon;
grant execute on function public.set_my_competitions(text[]) to authenticated;